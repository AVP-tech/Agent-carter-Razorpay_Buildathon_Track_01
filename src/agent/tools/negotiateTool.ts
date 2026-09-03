import { CatalogTool } from "./catalogTool";
import { GuardrailEngine } from "../../lib/guardrails";
import { AuditLogger } from "../../lib/auditLogger";

export class NegotiateTool {
  static async negotiatePrice(params: {
    productId: string;
    requestedDiscountPercent: number;
    buyerContext?: string;
    sessionId: string;
    traceId: string;
    channel?: string;
  }): Promise<{
    decision: "accepted" | "countered" | "rejected";
    finalPrice: number;
    reasoning: string;
  }> {
    const startTime = Date.now();
    
    const product = await CatalogTool.getProduct(params.productId);
    if (!product) {
      throw new Error(`Product '${params.productId}' not found.`);
    }

    if (product.inventoryCount <= 0) {
      throw new Error(`Product '${params.productId}' is out of stock.`);
    }

    // Attempt the requested discount
    const requestedDiscountPaise = Math.round(product.price * (params.requestedDiscountPercent / 100));
    
    // Evaluate via GuardrailEngine
    const mockCart = [{
      productId: product.id,
      sku: product.sku,
      title: product.title,
      category: product.category,
      quantity: 1,
      unitPrice: product.price,
      costPrice: product.costPrice,
      totalPrice: product.price,
      totalCost: product.costPrice
    }];

    const { guardrail, calculation } = GuardrailEngine.evaluateCart(
      mockCart,
      requestedDiscountPaise
    );

    let decision: "accepted" | "countered" | "rejected";
    let finalPrice = product.price;
    let reasoning = "";
    
    // Check Hard Discount Cap first
    const MAX_DISCOUNT = GuardrailEngine.MAX_DISCOUNT_PERCENT; // usually 25%

    if (params.requestedDiscountPercent > MAX_DISCOUNT) {
      decision = "rejected";
      reasoning = `Requested discount of ${params.requestedDiscountPercent}% exceeds platform hard limit of ${MAX_DISCOUNT}%.`;
    } else if (!guardrail.passed) {
      // It violated margin floor or ceiling
      if (guardrail.code === "MARGIN_BREACH") {
        // Try to counter with max possible discount that keeps margin >= 15%
        const minAcceptableMargin = GuardrailEngine.DEFAULT_MIN_MARGIN_FLOOR_PERCENT / 100;
        // Margin = (Price - Cost) / Price
        // (NewPrice - Cost) / NewPrice >= MinMargin
        // NewPrice - Cost >= MinMargin * NewPrice
        // NewPrice * (1 - MinMargin) >= Cost
        // NewPrice >= Cost / (1 - MinMargin)
        const minAcceptablePrice = Math.ceil(product.costPrice / (1 - minAcceptableMargin));
        
        const counterDiscountPaise = product.price - minAcceptablePrice;
        const counterDiscountPercent = (counterDiscountPaise / product.price) * 100;

        if (counterDiscountPercent > 0) {
          decision = "countered";
          finalPrice = minAcceptablePrice;
          reasoning = `Requested discount violates minimum margin floor of ${GuardrailEngine.DEFAULT_MIN_MARGIN_FLOOR_PERCENT}%. Counter-offering with maximum allowable discount of ${counterDiscountPercent.toFixed(1)}%.`;
        } else {
          decision = "rejected";
          reasoning = `Cannot offer any discount on this product while maintaining the margin floor.`;
        }
      } else {
         decision = "rejected";
         reasoning = guardrail.reason;
      }
    } else {
      decision = "accepted";
      finalPrice = calculation.subtotal - requestedDiscountPaise; // subtotal here is just product.price
      reasoning = `Requested discount of ${params.requestedDiscountPercent}% accepted. Margin and ceiling constraints passed.`;
    }

    // Log to Audit Trail
    await AuditLogger.log({
      sessionId: params.sessionId,
      traceId: params.traceId,
      channel: params.channel,
      actionType: "NEGOTIATION",
      actor: "SELLER_AGENT",
      reasoning,
      toolName: "negotiatePrice",
      toolInput: params,
      toolOutput: { decision, finalPrice, originalPrice: product.price },
      guardrailStatus: decision === "rejected" ? "BLOCKED" : "PASSED",
      guardrailDetails: {
        requestedDiscountPercent: params.requestedDiscountPercent,
        calculatedMarginPercent: calculation.grossMarginPercent,
      },
      executionTimeMs: Date.now() - startTime,
    });

    return { decision, finalPrice, reasoning };
  }
}
