import { NextRequest, NextResponse } from "next/server";
import { CheckoutTool } from "@/agent/tools/checkoutTool";
import { UpsellTool } from "@/agent/tools/upsellTool";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.cart || !Array.isArray(body.cart) || body.cart.length === 0) {
      return NextResponse.json({ success: false, error: "Missing or invalid field: cart array" }, { status: 400 });
    }

    const sessionId = body.sessionId || `a2a_sess_${crypto.randomBytes(4).toString("hex")}`;
    const traceId = body.traceId || `a2a_trc_${crypto.randomBytes(4).toString("hex")}`;

    // Transform cart format if necessary
    const items = body.cart.map((i: any) => ({
      skuOrId: i.productId || i.skuOrId,
      quantity: i.quantity || 1
    }));

    // Checkout execution
    const checkoutResult = await CheckoutTool.executeCheckout({
      items,
      requestedDiscountPaise: body.requestedDiscountPaise,
      buyerAgentId: body.buyerAgentId || "external_a2a_buyer",
      sessionId,
      traceId,
      channel: "a2a_api",
    });

    if (!checkoutResult.success) {
      // Failed checkout (e.g., blocked by guardrail or stock)
      return NextResponse.json({
        success: false,
        error: checkoutResult.guardrailReason || checkoutResult.status,
        details: checkoutResult,
        sessionId,
        traceId
      }, { status: 400 });
    }

    // Attempt an upsell on successful checkout
    let upsellData = null;
    try {
      upsellData = await UpsellTool.recommendUpsell({
        currentCartItems: items,
        sessionId,
        traceId,
        channel: "a2a_api",
      });
    } catch (upsellErr) {
      console.warn("A2A upsell attempt failed:", upsellErr);
    }

    return NextResponse.json({
      success: true,
      order: checkoutResult,
      upsellOffer: upsellData?.hasUpsell ? {
        recommendations: upsellData.recommendations,
        bundleDiscountPercent: upsellData.bundleDiscountPercent,
        explanation: upsellData.explanation
      } : null,
      paymentLink: `http://localhost:3000/chat?orderId=${checkoutResult.orderId}`, // fallback test UI
      sessionId,
      traceId
    });
  } catch (error: any) {
    // Check if error is out of stock related, then suggest recover_failure logic
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      recommendation: error.message.includes("Insufficient stock") ? "Call /api/a2a/catalog with inStockOnly=true to find alternatives." : undefined
    }, { status: 400 }); // Bad Request is more appropriate for logical errors
  }
}
