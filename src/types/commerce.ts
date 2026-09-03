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

export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  razorpayOrderId?: string;
  amount: number; // in paise
  currency: string;
  status: string;
  paymentLink?: string;
  guardrailVerdict: "PASSED" | "BLOCKED" | "OVERRIDDEN";
  guardrailReason?: string;
  explainability: {
    basePrice: number;
    discount: number;
    taxes: number;
    finalPayable: number;
    marginHealthy: boolean;
    auditTraceId: string;
  };
}
