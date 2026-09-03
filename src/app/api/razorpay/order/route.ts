import { NextRequest, NextResponse } from "next/server";
import { RazorpayService } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, currency, receipt, notes } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Amount in paise is required and must be > 0" }, { status: 400 });
    }

    const order = await RazorpayService.createOrder({
      amount,
      currency: currency || "INR",
      receipt,
      notes,
    });

    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unable to create Razorpay order" }, { status: 502 });
  }
}
