import { NextRequest, NextResponse } from "next/server";
import { UpsellTool } from "@/agent/tools/upsellTool";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = body.items || [];
    const sessionId = body.sessionId || `sess_${crypto.randomBytes(4).toString("hex")}`;
    const traceId = body.traceId || `trc_${crypto.randomBytes(4).toString("hex")}`;

    const upsell = await UpsellTool.recommendUpsell({
      currentCartItems: items,
      sessionId,
      traceId,
    });

    return NextResponse.json({
      sessionId,
      traceId,
      ...upsell,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
