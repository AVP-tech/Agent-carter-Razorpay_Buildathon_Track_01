import { NextRequest, NextResponse } from "next/server";
import { NegotiateTool } from "@/agent/tools/negotiateTool";
import { guardA2ARequest, getCallerIdentity } from "@/lib/a2aSecurity";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.productId || typeof body.requestedDiscountPercent !== 'number') {
      return NextResponse.json({ success: false, error: "Missing required fields: productId, requestedDiscountPercent" }, { status: 400 });
    }

    const identity = getCallerIdentity(req, body.buyerAgentId);
    const guardResponse = guardA2ARequest(req, identity);
    if (guardResponse) return guardResponse;

    const sessionId = body.sessionId || `a2a_sess_${crypto.randomBytes(4).toString("hex")}`;
    const traceId = body.traceId || `a2a_trc_${crypto.randomBytes(4).toString("hex")}`;

    const result = await NegotiateTool.negotiatePrice({
      productId: body.productId,
      requestedDiscountPercent: body.requestedDiscountPercent,
      buyerContext: body.buyerContext,
      sessionId,
      traceId,
      channel: "a2a_api",
    });

    return NextResponse.json({
      success: true,
      ...result,
      sessionId,
      traceId
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
