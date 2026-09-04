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

    const { calculation } = GuardrailEngine.evaluateCart(
      mockCart,
      requestedDiscountPaise
    );

    let decision: "accepted" | "countered" | "rejected";
    let finalPrice = product.price;
    let reasoning = "";

    const MAX_DISCOUNT = GuardrailEngine.MAX_DISCOUNT_PERCENT; // usually 25%

    // The best discount this product could ever get, whichever limit bites
    // first: the platform-wide hard cap, or this product's own margin floor.
    // Margin = (Price - Cost) / Price >= MinMargin
    // => NewPrice >= Cost / (1 - MinMargin)
    const minAcceptableMargin = GuardrailEngine.DEFAULT_MIN_MARGIN_FLOOR_PERCENT / 100;
    const minAcceptablePriceForMargin = Math.ceil(product.costPrice / (1 - minAcceptableMargin));
    const marginSafeDiscountPaise = Math.max(0, product.price - minAcceptablePriceForMargin);
    const hardCapDiscountPaise = Math.floor(product.price * (MAX_DISCOUNT / 100));
    const maxOfferableDiscountPaise = Math.min(marginSafeDiscountPaise, hardCapDiscountPaise);
    const maxOfferableDiscountPercent =
      product.price > 0 ? (maxOfferableDiscountPaise / product.price) * 100 : 0;

    if (requestedDiscountPaise > maxOfferableDiscountPaise) {
      // Asked for more than we can give -- always counter with our best
      // possible offer instead of a flat refusal, whether the platform hard
      // cap or this product's margin floor is the limiting factor.
      if (maxOfferableDiscountPaise > 0) {
        decision = "countered";
        finalPrice = product.price - maxOfferableDiscountPaise;
        reasoning = `Requested discount of ${params.requestedDiscountPercent}% is more than we can offer on this product. The maximum we can do is ${maxOfferableDiscountPercent.toFixed(1)}%.`;
      } else {
        decision = "rejected";
        reasoning = `We can't offer any discount on this product right now.`;
      }
    } else {
      decision = "accepted";
      finalPrice = product.price - requestedDiscountPaise;
      reasoning = `Requested discount of ${params.requestedDiscountPercent}% accepted. Margin and platform limits both satisfied.`;
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
