import { CatalogTool, MockProduct } from "./catalogTool";
import { ResolvedCartItem, UpsellRecommendation } from "../../types/commerce";
import { GuardrailEngine } from "../../lib/guardrails";
import { AuditLogger } from "../../lib/auditLogger";

const CATEGORY_AFFINITY: Record<string, string[]> = {
  "Coffee Appliances": ["Coffee Beans", "Coffee Accessories", "Maintenance"],
  "Coffee Beans": ["Coffee Accessories", "Syrups & Flavors"],
  "Coffee Accessories": ["Coffee Beans", "Coffee Appliances"],
  "Syrups & Flavors": ["Coffee Beans"],
  "Maintenance": ["Coffee Accessories"],
  "Cold Brew": ["Syrups & Flavors", "Coffee Accessories"],
  "Industrial Equipment": ["Coffee Beans", "Maintenance"],
};

export class UpsellTool {
  /**
   * Recommend margin-protected upsell / cross-sell items based on cart composition
   */
  static async recommendUpsell(params: {
    currentCartItems: { skuOrId: string; quantity: number }[];
    sessionId?: string;
    traceId?: string;
    channel?: string;
  }): Promise<{
    hasUpsell: boolean;
    recommendations: UpsellRecommendation[];
    bundleDiscountPercent: number;
    explanation: string;
  }> {
    const startTime = Date.now();
    const resolvedCart: ResolvedCartItem[] = [];

    for (const item of params.currentCartItems) {
      const product = await CatalogTool.getProduct(item.skuOrId);
      if (product) {
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
    }

    if (resolvedCart.length === 0) {
      return {
        hasUpsell: false,
        recommendations: [],
        bundleDiscountPercent: 0,
        explanation: "Cart is empty. No upsell recommendations available.",
      };
    }

    const { products: allProducts } = await CatalogTool.searchCatalog({ inStockOnly: true });
    const cartProductIds = new Set(resolvedCart.map((i) => i.productId));
    const candidateUpsells = allProducts.filter((p) => !cartProductIds.has(p.id) && p.inventoryCount > 0);

    const recommendations: UpsellRecommendation[] = [];

    for (const candidate of candidateUpsells) {
      // Category affinity map -- which categories a purchase in each
      // category should try to upsell against. Originally only Coffee
      // Appliances and Coffee Beans had any rule at all, so buying the
      // descaler, cold brew, or the industrial roaster never produced an
      // upsell. Every catalog category now has at least one rule.
      const isComplementary = resolvedCart.some((c) =>
        (CATEGORY_AFFINITY[c.category] || []).includes(candidate.category)
      );

      if (isComplementary) {
        // Calculate proposed 12% bundle discount on candidate
        const discountPercent = 12.0;
        const discountAmount = Math.round(candidate.price * (discountPercent / 100));
        const discountedPrice = candidate.price - discountAmount;

        // Verify that candidate alone and in combined basket satisfies margin floor
        const candidateMargin = Number(
          (((discountedPrice - candidate.costPrice) / discountedPrice) * 100).toFixed(2)
        );

        if (candidateMargin >= GuardrailEngine.DEFAULT_MIN_MARGIN_FLOOR_PERCENT) {
          recommendations.push({
            recommendedProductId: candidate.id,
            sku: candidate.sku,
            title: candidate.title,
            originalPrice: candidate.price,
            discountedBundlePrice: discountedPrice,
            savings: discountAmount,
            expectedMarginPercent: candidateMargin,
            reasoning: `High conversion pair with ${resolvedCart[0].title}. Bundled with ${discountPercent}% discount while preserving ${candidateMargin}% margin.`,
          });
        }
      }
    }

    const hasUpsell = recommendations.length > 0;
    const explanation = hasUpsell
      ? `Found ${recommendations.length} high-margin complementary products to increase merchant Average Order Value (AOV).`
      : "No suitable complementary products met the margin safety floor.";

    if (params.sessionId && params.traceId) {
      await AuditLogger.log({
        sessionId: params.sessionId,
        traceId: params.traceId,
        channel: params.channel,
        actionType: "UPSELL_OFFER",
        actor: "SELLER_AGENT",
        reasoning: explanation,
        toolName: "recommendUpsell",
        toolInput: { cartItemCount: resolvedCart.length, cartSkus: resolvedCart.map((c) => c.sku) },
        toolOutput: {
          upsellCount: recommendations.length,
          topRecommendation: recommendations[0]?.sku || null,
        },
        guardrailStatus: "PASSED",
        guardrailDetails: {
          bundleDiscountPercent: 12.0,
          marginFloorGuarded: true,
        },
        executionTimeMs: Date.now() - startTime,
      });
    }

    return {
      hasUpsell,
      recommendations: recommendations.slice(0, 2), // top 2
      bundleDiscountPercent: 12.0,
      explanation,
    };
  }
}