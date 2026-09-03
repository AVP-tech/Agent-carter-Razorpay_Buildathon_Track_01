import { NextRequest, NextResponse } from "next/server";
import { AgentOrchestrator } from "@/agent/orchestrator";

const orchestrator = new AgentOrchestrator();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId, buyerAgentId, buyerMaxBudgetPaise } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const result = await orchestrator.processInteraction(message.trim(), {
      sessionId: sessionId || undefined,
      buyerAgentId: buyerAgentId || "web_ui_buyer",
      buyerMaxBudgetPaise: buyerMaxBudgetPaise || 5000000, // ₹50,000 default
    });

    return NextResponse.json({
      reply: result.reply,
      sessionId: result.sessionId,
      traceId: result.traceId,
      actionsTaken: result.actionsTaken,
      metadata: {
        checkoutResult: result.metadata?.checkoutResult || result.checkoutResult || null,
        upsellOffer: result.metadata?.upsellOffer || result.upsellOffer || null,
      },
      auditLogCount: result.auditLogs.length,
    });
  } catch (error: any) {
    console.error("[Agent Chat API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Internal agent error" },
      { status: 500 }
    );
  }
}
