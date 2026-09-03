import { NextRequest, NextResponse } from "next/server";
import { RazorpayService } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing required signature verification fields" }, { status: 400 });
    }

    const isValid = RazorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    return NextResponse.json({
      valid: isValid,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
