import { NextRequest, NextResponse } from "next/server";
import { RazorpayService } from "@/lib/razorpay";
import { AuditLogger } from "@/lib/auditLogger";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    const isValid = RazorpayService.verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const eventData = JSON.parse(rawBody);
    const eventType = eventData.event;
    const payment = eventData.payload?.payment?.entity;
    const orderId = payment?.order_id || "unknown";

    await AuditLogger.log({
      sessionId: `webhook_${Date.now()}`,
      traceId: `trc_wh_${orderId}`,
      actionType: `WEBHOOK_${eventType?.toUpperCase()}`,
      actor: "SYSTEM_GUARDRAIL",
      reasoning: `Received verified Razorpay webhook event: ${eventType}`,
      toolInput: { event: eventType, orderId, paymentId: payment?.id },
      toolOutput: { status: "PROCESSED", amount: payment?.amount },
      guardrailStatus: "PASSED",
      orderId,
    });

    return NextResponse.json({ status: "ok", event: eventType });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
