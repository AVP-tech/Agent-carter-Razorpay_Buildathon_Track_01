export interface CartItemInput {
  productId: string;
  quantity: number;
}

export interface ResolvedCartItem {
  productId: string;
  sku: string;
  title: string;
  quantity: number;
  unitPrice: number; // in paise
  costPrice: number; // in paise
  totalPrice: number; // in paise
  totalCost: number; // in paise
  category: string;
}

export interface CartCalculation {
  items: ResolvedCartItem[];
  subtotal: number; // in paise
  totalCost: number; // in paise
  discountAmount: number; // in paise
  discountPercent: number;
  discountReason?: string;
  taxAmount: number; // in paise (e.g. 18% GST if applicable)
  finalAmount: number; // in paise (payable)
  grossMarginPercent: number;
  isMarginGuarded: boolean;
}

export interface UpsellRecommendation {
  recommendedProductId: string;
  sku: string;
  title: string;
  originalPrice: number;
  discountedBundlePrice: number;
  savings: number;
  reasoning: string;
  expectedMarginPercent: number;
}

/**
 * Structured outcome of a FailureRecoveryTool.handleFailure() call, surfaced
 * on a CheckoutResult so callers (A2A buyers, the chat UI) can act on it
 * programmatically instead of just seeing an error string.
 */
export interface CheckoutRecoveryInfo {
  recovered: boolean;
  strategy: "ALTERNATIVE_ITEM_FOUND" | "PAYMENT_LINK_ESCALATION" | "CAPPED_DISCOUNT_APPLIED" | "CART_DOWNSIZED";
  message: string;
  suggestedAlternative?: {
    id: string;
    sku: string;
    title: string;
    price: number;
    inventoryCount: number;
  };
}

export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  razorpayOrderId?: string;
  amount: number; // in paise
  currency: string;
  status: string;
  paymentLink?: string;
  /** What was actually purchased -- needed by the post-purchase upsell flow
   * to know which SKU to recommend against, and useful generally. */
  items?: { sku: string; title: string; quantity: number }[];
  guardrailVerdict: "PASSED" | "BLOCKED" | "OVERRIDDEN";
  guardrailReason?: string;
  /** Present whenever a failure was gracefully handled instead of just rejected. */
  recovery?: CheckoutRecoveryInfo;
  /** True when this result was served from a prior order matching the same
   * idempotency key, instead of creating a new charge -- protects a retried
   * A2A request (e.g. after a timeout) from double-charging the buyer. */
  idempotentReplay?: boolean;
  explainability: {
    basePrice: number;
    discount: number;
    taxes: number;
    finalPayable: number;
    marginHealthy: boolean;
    auditTraceId: string;
    /** True when the requested discount was automatically capped to preserve the merchant's margin floor and the order still went through. */
    autoAdjustedDiscount?: boolean;
    originalRequestedDiscountPaise?: number;
  };
}
