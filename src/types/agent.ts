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
  /** The actual wire protocol this manifest and its endpoints implement. */
  supportedProtocols: string[];
  /**
   * Emerging agentic-commerce standards this API is designed to be
   * conceptually compatible with (NPCI UAP, ACP, AP2, x402). This is a
   * declaration of intent/alignment, not a claim of certified conformance
   * to any of those specs.
   */
  protocolAlignment: {
    inspiredBy: string[];
    note: string;
  };
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
  /** Guidance for callers on how to make requests to the checkout endpoint safely. */
  checkoutRequirements: {
    idempotencyKeyHeader: string;
    idempotencyKeyRequired: boolean;
    idempotencyNote: string;
  };
  /** Whether a bearer token is currently required on the money-moving A2A endpoints. */
  security: {
    authRequired: boolean;
    authHeader: string;
    rateLimited: boolean;
    rateLimitNote: string;
  };
}
