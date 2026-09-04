import { CatalogTool } from "./catalogTool";
import { FailureRecoveryTool } from "./failureRecoveryTool";
import { ResolvedCartItem, CheckoutResult } from "../../types/commerce";
import { GuardrailEngine } from "../../lib/guardrails";
import { RazorpayService } from "../../lib/razorpay";
import { AuditLogger } from "../../lib/auditLogger";
import prisma from "../../lib/prisma";
import crypto from "crypto";

export class CheckoutTool {
  /**
   * Execute Bounded, Explainable & Gracefully-Recoverable Agentic Checkout.
   *
   * Every rejection path here is paired with a FailureRecoveryTool strategy
   * so a blocked checkout still returns something the caller (an AI buyer
   * or the chat UI) can act on, instead of a bare error.
   */
  static async executeCheckout(params: {
    items: { skuOrId: string; quantity: number }[];
    requestedDiscountPaise?: number;
    buyerAgentId?: string;
    buyerMaxBudgetPaise?: number;
    customerEmail?: string;
    customerPhone?: string;
    sessionId: string;
    traceId: string;
    channel?: string;
    /** Caller-supplied dedup key (e.g. from an `Idempotency-Key` header on
     * the A2A checkout endpoint). If a checkout with this exact key already
     * produced an order, that same result is returned instead of creating a
     * second charge -- protects a retried request (timeout, network blip)
     * from double-billing the buyer. */
    idempotencyKey?: string;
  }): Promise<CheckoutResult> {
    const startTime = Date.now();
    const resolvedCart: ResolvedCartItem[] = [];
    const originalRequestedDiscountPaise = params.requestedDiscountPaise || 0;

    // Idempotency check -- must happen before any guardrail evaluation or
    // Razorpay order creation, otherwise a retry could still slip through
    // and create a second real order.
    if (params.idempotencyKey && process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost:5432/razoragent_db")) {
      try {
        const existing = await prisma.order.findFirst({
          where: { notes: { path: ["idempotencyKey"], equals: params.idempotencyKey } },
          include: { items: true },
        });
        if (existing) {
          await AuditLogger.log({
            sessionId: params.sessionId,
            traceId: params.traceId,
            channel: params.channel,
            orderId: existing.id,
            actionType: "IDEMPOTENT_REPLAY",
            actor: "SYSTEM_GUARDRAIL",
            reasoning: `Checkout request reused idempotency key '${params.idempotencyKey}', which already produced order ${existing.razorpayOrderId}. Returned the existing order instead of creating a duplicate charge.`,
            toolName: "executeCheckout",
            toolInput: { idempotencyKey: params.idempotencyKey },
            toolOutput: { razorpayOrderId: existing.razorpayOrderId, amount: existing.amount },
            guardrailStatus: "PASSED",
            executionTimeMs: Date.now() - startTime,
          });

          return {
            success: true,
            orderId: existing.id,
            razorpayOrderId: existing.razorpayOrderId,
            amount: existing.amount,
            currency: existing.currency,
            status: "ORDER_CREATED",
            guardrailVerdict: "PASSED",
            idempotentReplay: true,
            explainability: {
              basePrice: existing.amount - existing.discountApplied,
              discount: existing.discountApplied,
              taxes: 0,
              finalPayable: existing.amount,
              marginHealthy: true,
              auditTraceId: params.traceId,
            },
          };
        }
      } catch (idemErr) {
        console.warn("[CheckoutTool] Idempotency lookup skipped (in-memory mode):", (idemErr as any)?.message);
      }
    }

    // Step 1: Inventory & Catalog Resolution
    for (const item of params.items) {
      const product = await CatalogTool.getProduct(item.skuOrId);
      if (!product) {
        throw new Error(`Product with SKU/ID '${item.skuOrId}' not found in merchant catalog.`);
      }

      if (product.inventoryCount < item.quantity) {
        // Stock Failure -> gracefully recover with an in-stock alternative
        // instead of just throwing.
        const errorMsg = `Insufficient stock for product '${product.title}' (SKU: ${product.sku}). Requested: ${item.quantity}, Available: ${product.inventoryCount}.`;

        await AuditLogger.log({
          sessionId: params.sessionId,
          traceId: params.traceId,
          channel: params.channel,
          actionType: "GUARDRAIL_CHECK",
          actor: "SYSTEM_GUARDRAIL",
          reasoning: "Stock depletion check failed during checkout lock phase.",
          toolName: "executeCheckout",
          toolInput: params,
          toolOutput: { error: errorMsg, availableStock: product.inventoryCount },
          guardrailStatus: "BLOCKED",
          guardrailDetails: { failureCode: "STOCK_DEPLETED" },
          executionTimeMs: Date.now() - startTime,
        });

        const recovery = await FailureRecoveryTool.handleFailure({
          failureType: "STOCK_OUT",
          failedSkuOrId: product.sku,
          sessionId: params.sessionId,
          traceId: params.traceId,
        });

        return {
          success: false,
          amount: 0,
          currency: "INR",
          status: "STOCK_OUT",
          guardrailVerdict: "BLOCKED",
          guardrailReason: errorMsg,
          recovery: {
            recovered: recovery.recovered,
            strategy: recovery.strategy,
            message: recovery.message,
            suggestedAlternative: recovery.suggestedAlternative
              ? {
                  id: recovery.suggestedAlternative.id,
                  sku: recovery.suggestedAlternative.sku,
                  title: recovery.suggestedAlternative.title,
                  price: recovery.suggestedAlternative.price,
                  inventoryCount: recovery.suggestedAlternative.inventoryCount,
                }
              : undefined,
          },
          explainability: {
            basePrice: 0,
            discount: 0,
            taxes: 0,
            finalPayable: 0,
            marginHealthy: false,
            auditTraceId: params.traceId,
          },
        };
      }

      resolvedCart.push({
        productId: product.id,
        sku: product.sku,
        title: product.title,
        category: product.category,
        quantity: item.quantity,
        unitPrice: product.price,
        costPrice: product.costPrice,
        totalPrice: product.price * item.quantity,
        totalCost: product.costPrice * item.quantity,
      });

      // Self-heal DB/catalog drift so the order we're about to build never
      // hits a FOREIGN KEY violation later.
      await CatalogTool.ensureInDb(product);
    }

    // Step 2: Bounded Money Guardrail & Profit Margin Check
    let { calculation, guardrail } = GuardrailEngine.evaluateCart(
      resolvedCart,
      originalRequestedDiscountPaise,
      params.buyerAgentId,
      params.buyerMaxBudgetPaise
    );

    let autoAdjustedDiscount = false;

    if (!guardrail.passed) {
      // Attempt 1: Margin floor breach -> auto-heal by retrying with the
      // maximum discount that still respects the merchant's margin floor,
      // rather than failing the whole checkout outright.
      if (guardrail.code === "MARGIN_BREACH" && typeof guardrail.cappedDiscountPaise === "number") {
        const healed = GuardrailEngine.evaluateCart(
          resolvedCart,
          guardrail.cappedDiscountPaise,
          params.buyerAgentId,
          params.buyerMaxBudgetPaise
        );

        if (healed.guardrail.passed) {
          const recovery = await FailureRecoveryTool.handleFailure({
            failureType: "MARGIN_BREACH",
            sessionId: params.sessionId,
            traceId: params.traceId,
          });

          calculation = healed.calculation;
          guardrail = healed.guardrail;
          autoAdjustedDiscount = true;

          await AuditLogger.log({
            sessionId: params.sessionId,
            traceId: params.traceId,
            channel: params.channel,
            actionType: "GUARDRAIL_CHECK",
            actor: "SYSTEM_GUARDRAIL",
            reasoning: `Requested discount of ₹${(originalRequestedDiscountPaise / 100).toFixed(2)} breached the merchant's minimum margin floor. ${recovery.message} Auto-capped the discount to ₹${(calculation.discountAmount / 100).toFixed(2)} and continued checkout instead of failing outright.`,
            toolName: "executeCheckout",
            toolInput: { requestedDiscountPaise: originalRequestedDiscountPaise },
            toolOutput: { appliedDiscountPaise: calculation.discountAmount, marginPercent: calculation.grossMarginPercent },
            guardrailStatus: "WARNING",
            guardrailDetails: { code: "MARGIN_BREACH", recovered: true, strategy: recovery.strategy },
            executionTimeMs: Date.now() - startTime,
          });
        }
      }

      // Attempt 2: Autonomous spending ceiling breached -> escalate to a
      // human with a real Razorpay 1-click payment link instead of just
      // rejecting the order outright. (A buyer-agent's own pre-authorized
      // mandate budget is treated differently below -- there's no human to
      // hand a link to on that side.)
      if (!guardrail.passed && guardrail.code === "BUDGET_EXCEEDED" && guardrail.requiresHumanEscalation) {
        await AuditLogger.log({
          sessionId: params.sessionId,
          traceId: params.traceId,
          channel: params.channel,
          actionType: "GUARDRAIL_CHECK",
          actor: "SYSTEM_GUARDRAIL",
          reasoning: `Checkout blocked by guardrail: ${guardrail.reason}`,
          toolName: "executeCheckout",
          toolInput: params,
          toolOutput: { guardrail, calculation },
          guardrailStatus: "BLOCKED",
          guardrailDetails: {
            code: guardrail.code,
            maxAllowedSpendPaise: guardrail.maxAllowedSpendPaise,
            currentMarginPercent: guardrail.currentMarginPercent,
            minMarginRequiredPercent: guardrail.minimumMarginRequiredPercent,
          },
          executionTimeMs: Date.now() - startTime,
        });

        const recovery = await FailureRecoveryTool.handleFailure({
          failureType: "BUDGET_EXCEEDED",
          failedAmountPaise: calculation.finalAmount,
          customerEmail: params.customerEmail,
          customerPhone: params.customerPhone,
          sessionId: params.sessionId,
          traceId: params.traceId,
        });

        return {
          success: false,
          amount: calculation.finalAmount,
          currency: "INR",
          status: "ESCALATED_TO_HUMAN",
          paymentLink: recovery.paymentLink?.url,
          guardrailVerdict: "BLOCKED",
          guardrailReason: guardrail.reason,
          recovery: {
            recovered: recovery.recovered,
            strategy: recovery.strategy,
            message: recovery.message,
          },
          explainability: {
            basePrice: calculation.subtotal,
            discount: calculation.discountAmount,
            taxes: calculation.taxAmount,
            finalPayable: calculation.finalAmount,
            marginHealthy: calculation.isMarginGuarded,
            auditTraceId: params.traceId,
          },
        };
      }

      // Anything else that couldn't be auto-recovered (e.g. the buyer
      // agent's own pre-authorized mandate budget, not the platform
      // ceiling) is still reported plainly with a reason and guardrail
      // status so the caller can react (downsize cart, request a bigger
      // mandate, etc).
      if (!guardrail.passed) {
        await AuditLogger.log({
          sessionId: params.sessionId,
          traceId: params.traceId,
          channel: params.channel,
          actionType: "GUARDRAIL_CHECK",
          actor: "SYSTEM_GUARDRAIL",
          reasoning: `Checkout blocked by guardrail: ${guardrail.reason}`,
          toolName: "executeCheckout",
          toolInput: params,
          toolOutput: { guardrail, calculation },
          guardrailStatus: "BLOCKED",
          guardrailDetails: {
            code: guardrail.code,
            maxAllowedSpendPaise: guardrail.maxAllowedSpendPaise,
            currentMarginPercent: guardrail.currentMarginPercent,
            minMarginRequiredPercent: guardrail.minimumMarginRequiredPercent,
          },
          executionTimeMs: Date.now() - startTime,
        });

        return {
          success: false,
          amount: calculation.finalAmount,
          currency: "INR",
          status: "GUARDRAIL_BLOCKED",
          guardrailVerdict: "BLOCKED",
          guardrailReason: guardrail.reason,
          explainability: {
            basePrice: calculation.subtotal,
            discount: calculation.discountAmount,
            taxes: calculation.taxAmount,
            finalPayable: calculation.finalAmount,
            marginHealthy: false,
            auditTraceId: params.traceId,
          },
        };
      }
    }

    // Step 3: Create Official Razorpay Test Order
    const receiptId = `rcpt_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const rzpOrder = await RazorpayService.createOrder({
      amount: calculation.finalAmount,
      currency: "INR",
      receipt: receiptId,
      notes: {
        buyerAgentId: params.buyerAgentId || "autonomous_buyer_bot",
        sessionId: params.sessionId,
        traceId: params.traceId,
        marginPercent: `${calculation.grossMarginPercent}%`,
        discountPaise: `${calculation.discountAmount}`,
        autoAdjustedDiscount: `${autoAdjustedDiscount}`,
      },
    });

    // Step 4: Persist Order in Database
    let dbOrderId = `ord_${crypto.randomUUID()}`;
    try {
      if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost:5432/razoragent_db")) {
        const createdOrder = await prisma.order.create({
          data: {
            id: dbOrderId,
            razorpayOrderId: rzpOrder.id,
            amount: calculation.finalAmount,
            currency: "INR",
            status: "CREATED",
            customerEmail: params.customerEmail || null,
            customerPhone: params.customerPhone || null,
            buyerAgentId: params.buyerAgentId || null,
            discountApplied: calculation.discountAmount,
            discountReason: autoAdjustedDiscount
              ? "Auto-capped to preserve merchant margin floor"
              : calculation.discountReason || "Agent negotiated bundle",
            notes: {
              subtotal: calculation.subtotal,
              tax: calculation.taxAmount,
              marginPercent: calculation.grossMarginPercent,
              ...(params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : {}),
            },
            items: {
              create: resolvedCart.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                totalPrice: i.totalPrice,
              })),
            },
          },
        });
        dbOrderId = createdOrder.id;
      }
    } catch (dbErr) {
      console.warn("[CheckoutTool] DB Order persist skipped (in-memory mode):", (dbErr as any)?.message);
    }

    // Step 4b: Actually deplete stock. Without this, inventoryCount is a
    // fixture that never moves no matter how many orders go through --
    // the "5 in stock" badge would keep saying 5 forever.
    for (const item of resolvedCart) {
      await CatalogTool.decrementInventory(item.sku, item.quantity);
    }

    // Step 5: Log Immutable Audit Event
    await AuditLogger.log({
      sessionId: params.sessionId,
      traceId: params.traceId,
      channel: params.channel,
      orderId: dbOrderId,
      actionType: "ORDER_CREATED",
      actor: "SELLER_AGENT",
      reasoning: autoAdjustedDiscount
        ? `Authorized Razorpay order ${rzpOrder.id} for ₹${(calculation.finalAmount / 100).toFixed(2)} after auto-capping the requested discount to protect merchant margin. Guardrails approved.`
        : `Authorized Razorpay order ${rzpOrder.id} for ₹${(calculation.finalAmount / 100).toFixed(2)}. Guardrails approved.`,
      toolName: "executeCheckout",
      toolInput: {
        itemCount: resolvedCart.length,
        requestedDiscount: originalRequestedDiscountPaise,
        buyerAgent: params.buyerAgentId,
      },
      toolOutput: {
        razorpayOrderId: rzpOrder.id,
        payableAmount: calculation.finalAmount,
        currency: "INR",
        marginPercent: calculation.grossMarginPercent,
        items: resolvedCart.map((i) => ({ sku: i.sku, qty: i.quantity, price: i.unitPrice })),
      },
      guardrailStatus: "PASSED",
      guardrailDetails: {
        subtotalPaise: calculation.subtotal,
        discountPaise: calculation.discountAmount,
        taxPaise: calculation.taxAmount,
        finalPayablePaise: calculation.finalAmount,
        grossMarginPercent: calculation.grossMarginPercent,
      },
      executionTimeMs: Date.now() - startTime,
    });

    return {
      success: true,
      orderId: dbOrderId,
      razorpayOrderId: rzpOrder.id,
      amount: calculation.finalAmount,
      currency: "INR",
      status: "ORDER_CREATED",
      guardrailVerdict: "PASSED",
      items: resolvedCart.map((i) => ({ sku: i.sku, title: i.title, quantity: i.quantity })),
      explainability: {
        basePrice: calculation.subtotal,
        discount: calculation.discountAmount,
        taxes: calculation.taxAmount,
        finalPayable: calculation.finalAmount,
        marginHealthy: true,
        auditTraceId: params.traceId,
        autoAdjustedDiscount,
        originalRequestedDiscountPaise: autoAdjustedDiscount ? originalRequestedDiscountPaise : undefined,
      },
    };
  }
}
