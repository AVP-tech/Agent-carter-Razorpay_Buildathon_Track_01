import { NextRequest, NextResponse } from "next/server";
import { AgentOrchestrator } from "@/agent/orchestrator";

const orchestrator = new AgentOrchestrator();

// Called right after a Razorpay payment is verified as successful (see
// src/app/api/razorpay/verify/route.ts and the mock-payment path in the
// chat UI). This is deliberately a separate endpoint from /api/agent/chat --
// there is no user-typed message here, just a confirmed purchase, so the
// upsell pitch is generated deterministically from the purchased SKU rather
// than routed through free-text tool-calling.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, sku, traceId } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }
    if (!sku || typeof sku !== "string") {
      return NextResponse.json({ error: "sku is required" }, { status: 400 });
    }

    const result = await orchestrator.generatePostPurchasePitch({ sessionId, sku, traceId });

    return NextResponse.json({
      reply: result.reply,
      sessionId: result.sessionId,
      traceId: result.traceId,
      metadata: {
        upsellOffer: result.metadata?.upsellOffer || null,
      },
    });
  } catch (error: any) {
    console.error("[Agent Post-Purchase API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Internal agent error" },
      { status: 500 }
    );
  }
}
