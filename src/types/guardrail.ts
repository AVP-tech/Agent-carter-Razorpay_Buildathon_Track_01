export interface GuardrailCheckRequest {
  buyerAgentId?: string;
  cartTotalAmount: number; // in paise
  discountAmount: number; // in paise
  totalCostPrice: number; // in paise
  itemsCount: number;
  maxAutonomousLimitPaise?: number; // e.g. 2500000 (INR 25,000)
  minMarginFloorPercent?: number; // e.g. 15.0 (15%)
}

export interface GuardrailCheckResponse {
  passed: boolean;
  code: "APPROVED" | "BUDGET_EXCEEDED" | "MARGIN_BREACH" | "STOCK_DEPLETED" | "MANDATE_EXPIRED";
  reason: string;
  maxAllowedSpendPaise: number;
  currentMarginPercent: number;
  minimumMarginRequiredPercent: number;
  requiresHumanEscalation: boolean;
  recoveryActionSuggested?: "DOWNSIZE_CART" | "REQUEST_HUMAN_APPROVAL" | "GENERATE_PAYMENT_LINK" | "APPLY_CAPPED_DISCOUNT";
  cappedDiscountPaise?: number;
}

export interface AuditRecord {
  sessionId: string;
  traceId: string;
  actionType: string;
  actor: "BUYER_AGENT" | "SELLER_AGENT" | "SYSTEM_GUARDRAIL";
  reasoning?: string;
  toolName?: string;
  toolInput?: Record<string, any>;
  toolOutput?: Record<string, any>;
  guardrailStatus: "PASSED" | "WARNING" | "BLOCKED";
  guardrailDetails?: Record<string, any>;
  orderId?: string;
  executionTimeMs?: number;
  channel?: string;
}
