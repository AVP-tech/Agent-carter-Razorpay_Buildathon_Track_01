export interface AgentCommerceManifest {
  protocolVersion: string;
  merchantName: string;
  merchantId: string;
  currency: string;
  capabilities: {
    catalogDiscovery: boolean;
    dynamicNegotiation: boolean;
    autonomousCheckout: boolean;
    auditTransparency: boolean;
    failureRecovery: boolean;
  };
  supportedProtocols: string[];
  endpoints: {
    catalog: string;
    negotiate: string;
    checkout: string;
    audit: string;
    health: string;
  };
  guardrails: {
    maxAutonomousSpendInr: number;
    minMarginFloorPercent: number;
    humanApprovalThresholdInr: number;
  };
}

export interface AgentNegotiationRequest {
  buyerAgentId?: string;
  desiredItems: { skuOrQuery: string; quantity: number }[];
  targetBudgetPaise?: number;
  includeUpsell?: boolean;
}

export interface AgentCheckoutRequest {
  buyerAgentId: string;
  items: { productId: string; quantity: number }[];
  appliedDiscountPaise?: number;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod?: "AUTONOMOUS_TEST" | "PAYMENT_LINK";
}
