import { NextRequest, NextResponse } from "next/server";
import { CheckoutTool } from "@/agent/tools/checkoutTool";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = body.sessionId || `sess_${crypto.randomBytes(4).toString("hex")}`;
    const traceId = body.traceId || `trc_${crypto.randomBytes(4).toString("hex")}`;

    const result = await CheckoutTool.executeCheckout({
      items: body.items,
      requestedDiscountPaise: body.requestedDiscountPaise,
      buyerAgentId: body.buyerAgentId,
      buyerMaxBudgetPaise: body.buyerMaxBudgetPaise,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      sessionId,
      traceId,
    });

    return NextResponse.json({
      sessionId,
      traceId,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
