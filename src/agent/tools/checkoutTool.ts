import { CatalogTool } from "./catalogTool";
import { ResolvedCartItem, CheckoutResult } from "../../types/commerce";
import { GuardrailEngine } from "../../lib/guardrails";
import { RazorpayService } from "../../lib/razorpay";
import { AuditLogger } from "../../lib/auditLogger";
import prisma from "../../lib/prisma";
import crypto from "crypto";

export class CheckoutTool {
  /**
   * Execute Bounded & Explainable Agentic Checkout
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
  }): Promise<CheckoutResult> {
    const startTime = Date.now();
    const resolvedCart: ResolvedCartItem[] = [];

    // Step 1: Inventory & Catalog Resolution
    for (const item of params.items) {
      const product = await CatalogTool.getProduct(item.skuOrId);
      if (!product) {
        throw new Error(`Product with SKU/ID '${item.skuOrId}' not found in merchant catalog.`);
      }

      if (product.inventoryCount < item.quantity) {
        // Stock Failure
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

        throw new Error(errorMsg);
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
    }

    // Step 2: Bounded Money Guardrail & Profit Margin Check
    const { calculation, guardrail } = GuardrailEngine.evaluateCart(
      resolvedCart,
      params.requestedDiscountPaise || 0,
      params.buyerAgentId,
      params.buyerMaxBudgetPaise
    );

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
            discountReason: calculation.discountReason || "Agent negotiated bundle",
            notes: {
              subtotal: calculation.subtotal,
              tax: calculation.taxAmount,
              marginPercent: calculation.grossMarginPercent,
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

    // Step 5: Log Immutable Audit Event
    await AuditLogger.log({
      sessionId: params.sessionId,
      traceId: params.traceId,
      channel: params.channel,
      orderId: dbOrderId,
      actionType: "ORDER_CREATED",
      actor: "SELLER_AGENT",
      reasoning: `Authorized Razorpay order ${rzpOrder.id} for ₹${(calculation.finalAmount / 100).toFixed(2)}. Guardrails approved.`,
      toolName: "executeCheckout",
      toolInput: {
        itemCount: resolvedCart.length,
        requestedDiscount: params.requestedDiscountPaise,
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
      explainability: {
        basePrice: calculation.subtotal,
        discount: calculation.discountAmount,
        taxes: calculation.taxAmount,
        finalPayable: calculation.finalAmount,
        marginHealthy: true,
        auditTraceId: params.traceId,
      },
    };
  }
}
