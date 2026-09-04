import { NextRequest, NextResponse } from "next/server";
import { RazorpayService } from "@/lib/razorpay";
import { AuditLogger } from "@/lib/auditLogger";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      sessionId,
      traceId,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing required signature verification fields" }, { status: 400 });
    }

    const effectiveSessionId = sessionId || `verify_${Date.now()}`;
    const effectiveTraceId = traceId || `trc_verify_${razorpay_order_id}`;

    // This is the actual trust boundary for "did the money really move":
    // the client-side Razorpay handler firing is NOT proof of payment on
    // its own (a modified client could call it with fabricated data). Only
    // a signature that matches our own key secret's HMAC proves the
    // payment_id/order_id pair genuinely came from Razorpay.
    const isValid = RazorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    let dbOrderId: string | null = null;

    try {
      if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost:5432/razoragent_db")) {
        const order = await prisma.order.findUnique({
          where: { razorpayOrderId: razorpay_order_id },
        });
        if (order) {
          dbOrderId = order.id;
          await prisma.order.update({
            where: { id: order.id },
            data: isValid
              ? {
                  status: "CAPTURED",
                  razorpayPaymentId: razorpay_payment_id,
                  razorpaySignature: razorpay_signature,
                }
              : {
                  status: "FAILED",
                },
          });
        }
      }
    } catch (dbErr) {
      console.warn("[Verify] Order status update skipped (in-memory mode):", (dbErr as any)?.message);
    }

    await AuditLogger.log({
      sessionId: effectiveSessionId,
      traceId: effectiveTraceId,
      orderId: dbOrderId || undefined,
      actionType: isValid ? "PAYMENT_VERIFIED" : "PAYMENT_VERIFICATION_FAILED",
      actor: "SYSTEM_GUARDRAIL",
      reasoning: isValid
        ? `Razorpay payment signature cryptographically verified for order ${razorpay_order_id}. Payment ${razorpay_payment_id} is confirmed authentic and the order has been marked CAPTURED.`
        : `Razorpay payment signature verification FAILED for order ${razorpay_order_id}. This payment cannot be trusted as genuine and was not marked as captured.`,
      toolName: "verifyPaymentSignature",
      toolInput: { razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id },
      toolOutput: { valid: isValid },
      guardrailStatus: isValid ? "PASSED" : "BLOCKED",
    });

    return NextResponse.json({
      valid: isValid,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
