import { NextResponse } from "next/server";
import { AgentCommerceManifest } from "@/types/agent";

export async function GET() {
  const manifest: AgentCommerceManifest = {
    protocolVersion: "1.0.0",
    merchantName: "Specialty Artisan Coffee & Hardware Store",
    merchantId: "merch_rzp_demo_01",
    currency: "INR",
    capabilities: {
      catalogDiscovery: true,
      dynamicNegotiation: true,
      autonomousCheckout: true,
      auditTransparency: true,
      failureRecovery: true,
    },
    supportedProtocols: ["REST-JSON-v1"],
    protocolAlignment: {
      inspiredBy: ["NPCI-UAP", "ACP", "AP2", "x402"],
      note: "This is a custom REST/JSON A2A protocol built in the spirit of emerging agentic-commerce standards (NPCI's Unified Agentic Protocol, OpenAI/Stripe's ACP, Google's AP2, Coinbase's x402). It is not a certified implementation of any of them.",
    },
    endpoints: {
      catalog: "/api/a2a/catalog",
      negotiate: "/api/a2a/negotiate",
      checkout: "/api/a2a/checkout",
      audit: "/api/agent/audit",
      health: "/api/health",
    },
    guardrails: {
      maxAutonomousSpendInr: 25000,
      minMarginFloorPercent: 15.0,
      humanApprovalThresholdInr: 25000,
    },
    checkoutRequirements: {
      idempotencyKeyHeader: "Idempotency-Key",
      idempotencyKeyRequired: false,
      idempotencyNote: "Strongly recommended: send a unique Idempotency-Key header (or an `idempotencyKey` body field) with every checkout call. If a request is retried with the same key -- e.g. after a timeout -- the original order is returned instead of creating a second charge.",
    },
    security: {
      authRequired: Boolean(process.env.A2A_API_KEY),
      authHeader: "Authorization: Bearer <token>",
      rateLimited: true,
      rateLimitNote: "Checkout and negotiate are rate-limited per buyerAgentId (falls back to client IP). Exceeding the limit returns HTTP 429.",
    },
  };

  return NextResponse.json(manifest, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}
