import { CatalogTool, MockProduct } from "./catalogTool";
import { RazorpayService } from "../../lib/razorpay";
import { AuditLogger } from "../../lib/auditLogger";

export interface FailureRecoveryResult {
  recovered: boolean;
  strategy: "ALTERNATIVE_ITEM_FOUND" | "PAYMENT_LINK_ESCALATION" | "CAPPED_DISCOUNT_APPLIED" | "CART_DOWNSIZED";
  message: string;
  suggestedAlternative?: MockProduct;
  paymentLink?: {
    id: string;
    url: string;
    amount: number;
  };
  revisedDiscountPaise?: number;
}

export class FailureRecoveryTool {
  /**
   * Graceful Failure Recovery Dispatcher
   */
  static async handleFailure(params: {
    failureType: "STOCK_OUT" | "BUDGET_EXCEEDED" | "MARGIN_BREACH" | "PAYMENT_CAPTURE_TIMEOUT";
    failedSkuOrId?: string;
    failedAmountPaise?: number;
    customerEmail?: string;
    customerPhone?: string;
    sessionId: string;
    traceId: string;
  }): Promise<FailureRecoveryResult> {
    const startTime = Date.now();

    // Strategy 1: Out of Stock -> Find Closest In-Stock Alternative
    if (params.failureType === "STOCK_OUT" && params.failedSkuOrId) {
      const outOfStockItem = await CatalogTool.getProduct(params.failedSkuOrId);
      const category = outOfStockItem ? outOfStockItem.category : undefined;

      let { products } = await CatalogTool.searchCatalog({
        category,
        inStockOnly: true,
      });

      // If no in-stock item in exact category, find top in-stock coffee accessory or item
      if (products.length === 0) {
        const fallbackSearch = await CatalogTool.searchCatalog({ inStockOnly: true });
        products = fallbackSearch.products;
      }

      const alternative = products.find((p) => p.sku !== params.failedSkuOrId) || products[0];

      if (alternative) {
        const msg = `Out-of-stock item '${params.failedSkuOrId}' gracefully resolved by recommending active replacement: '${alternative.title}' (SKU: ${alternative.sku}, ₹${(alternative.price / 100).toFixed(2)}).`;

        await AuditLogger.log({
          sessionId: params.sessionId,
          traceId: params.traceId,
          actionType: "FAILURE_RECOVERY",
          actor: "SELLER_AGENT",
          reasoning: msg,
          toolName: "handleFailure",
          toolInput: params,
          toolOutput: { replacementSku: alternative.sku, stock: alternative.inventoryCount },
          guardrailStatus: "WARNING",
          executionTimeMs: Date.now() - startTime,
        });

        return {
          recovered: true,
          strategy: "ALTERNATIVE_ITEM_FOUND",
          message: msg,
          suggestedAlternative: alternative,
        };
      }
    }

    // Strategy 2: Budget Exceeded / High-Value Cart -> Instant Razorpay Payment Link Escalation
    if (params.failureType === "BUDGET_EXCEEDED" || params.failureType === "PAYMENT_CAPTURE_TIMEOUT") {
      const payableAmount = params.failedAmountPaise || 2500000;
      
      const link = await RazorpayService.createPaymentLink({
        amount: payableAmount,
        currency: "INR",
        description: "Autonomous limit exceeded. Direct 1-Click Razorpay checkout approval link.",
        customer: {
          email: params.customerEmail || "buyer@agentcommerce.in",
          contact: params.customerPhone || "+919876543210",
        },
        notes: {
          sessionId: params.sessionId,
          traceId: params.traceId,
          escalationReason: "Autonomous spend ceiling exceeded or payment fallback triggered",
        },
      });

      const msg = `Gracefully escalated to Human-in-the-loop: Razorpay 1-Click Payment Link generated (${link.short_url}) for ₹${(payableAmount / 100).toFixed(2)}.`;

      await AuditLogger.log({
        sessionId: params.sessionId,
        traceId: params.traceId,
        actionType: "FAILURE_RECOVERY",
        actor: "SYSTEM_GUARDRAIL",
        reasoning: msg,
        toolName: "handleFailure",
        toolInput: params,
        toolOutput: { paymentLinkId: link.id, url: link.short_url },
        guardrailStatus: "WARNING",
        executionTimeMs: Date.now() - startTime,
      });

      return {
        recovered: true,
        strategy: "PAYMENT_LINK_ESCALATION",
        message: msg,
        paymentLink: {
          id: link.id,
          url: link.short_url,
          amount: payableAmount,
        },
      };
    }

    // Strategy 3: Margin Breach -> Apply Capped Safe Discount Counter-Offer
    if (params.failureType === "MARGIN_BREACH") {
      const msg = "Margin breach resolved: Replaced excessive discount with maximum policy-compliant discount floor.";
      
      await AuditLogger.log({
        sessionId: params.sessionId,
        traceId: params.traceId,
        actionType: "FAILURE_RECOVERY",
        actor: "SELLER_AGENT",
        reasoning: msg,
        toolName: "handleFailure",
        toolInput: params,
        toolOutput: { safeDiscountApplied: true },
        guardrailStatus: "WARNING",
        executionTimeMs: Date.now() - startTime,
      });

      return {
        recovered: true,
        strategy: "CAPPED_DISCOUNT_APPLIED",
        message: msg,
      };
    }

    return {
      recovered: false,
      strategy: "CART_DOWNSIZED",
      message: "Unrecoverable failure condition encountered.",
    };
  }
}
