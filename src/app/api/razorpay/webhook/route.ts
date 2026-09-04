import { NextRequest, NextResponse } from "next/server";
import { RazorpayService } from "@/lib/razorpay";
import { AuditLogger } from "@/lib/auditLogger";
import prisma from "@/lib/prisma";

// Maps a Razorpay webhook event to the Order.status value it implies.
// Only events we can act on unambiguously are included -- anything else is
// still logged for the audit trail but doesn't touch order state.
const EVENT_TO_STATUS: Record<string, string> = {
  "payment.captured": "CAPTURED",
  "payment.authorized": "AUTHORIZED",
  "payment.failed": "FAILED",
  "refund.processed": "REFUNDED",
};

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    if (!webhookSecret) {
      // Fail closed, same policy as payment signature verification: with no
      // secret configured, an "unverifiable" webhook is never trusted, not
      // silently accepted.
      console.warn("[Webhook] RAZORPAY_WEBHOOK_SECRET is not configured. Rejecting incoming webhook.");
      return NextResponse.json({ error: "Webhook secret not configured on this server" }, { status: 400 });
    }

    const isValid = RazorpayService.verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const eventData = JSON.parse(rawBody);
    const eventType: string = eventData.event;
    const payment = eventData.payload?.payment?.entity;
    const razorpayOrderId: string = payment?.order_id || "unknown";

    let dbOrderId: string | null = null;
    const mappedStatus = EVENT_TO_STATUS[eventType];

    if (mappedStatus) {
      try {
        if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost:5432/razoragent_db")) {
          const order = await prisma.order.findUnique({ where: { razorpayOrderId } });
          if (order) {
            dbOrderId = order.id;
            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: mappedStatus,
                ...(payment?.id ? { razorpayPaymentId: payment.id } : {}),
              },
            });
          }
        }
      } catch (dbErr) {
        console.warn("[Webhook] Order status update skipped (in-memory mode):", (dbErr as any)?.message);
      }
    }

    await AuditLogger.log({
      sessionId: `webhook_${Date.now()}`,
      traceId: `trc_wh_${razorpayOrderId}`,
      orderId: dbOrderId || undefined,
      actionType: `WEBHOOK_${eventType?.toUpperCase()}`,
      actor: "SYSTEM_GUARDRAIL",
      reasoning: mappedStatus
        ? `Received verified Razorpay webhook '${eventType}' for order ${razorpayOrderId}. Order status updated to ${mappedStatus}.`
        : `Received verified Razorpay webhook event: ${eventType}. No order status mapping defined for this event type -- logged for the record only.`,
      toolInput: { event: eventType, razorpayOrderId, paymentId: payment?.id },
      toolOutput: { status: "PROCESSED", mappedOrderStatus: mappedStatus || null, amount: payment?.amount },
      guardrailStatus: "PASSED",
    });

    return NextResponse.json({ status: "ok", event: eventType });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
