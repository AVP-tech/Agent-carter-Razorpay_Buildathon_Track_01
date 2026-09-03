import { NextResponse } from "next/server";
import { AgentCommerceManifest } from "@/types/agent";

export async function GET() {
  const manifest: AgentCommerceManifest = {
    protocolVersion: "1.0.0-uap-acp-compatible",
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
    supportedProtocols: ["UAP-v1", "ACP-v1", "x402-v1", "REST-JSON"],
    endpoints: {
      catalog: "/api/agent/catalog",
      negotiate: "/api/agent/negotiate",
      checkout: "/api/agent/checkout",
      audit: "/api/agent/audit",
      health: "/api/health",
    },
    guardrails: {
      maxAutonomousSpendInr: 25000,
      minMarginFloorPercent: 15.0,
      humanApprovalThresholdInr: 25000,
    },
  };

  return NextResponse.json(manifest, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}
