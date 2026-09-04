import { NextRequest, NextResponse } from "next/server";
import { CheckoutTool } from "@/agent/tools/checkoutTool";
import { UpsellTool } from "@/agent/tools/upsellTool";
import { guardA2ARequest, getCallerIdentity } from "@/lib/a2aSecurity";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.cart || !Array.isArray(body.cart) || body.cart.length === 0) {
      return NextResponse.json({ success: false, error: "Missing or invalid field: cart array" }, { status: 400 });
    }

    const identity = getCallerIdentity(req, body.buyerAgentId);
    // Checkout moves real money, so it gets a tighter window than search/negotiate.
    const guardResponse = guardA2ARequest(req, identity, 10);
    if (guardResponse) return guardResponse;

    const sessionId = body.sessionId || `a2a_sess_${crypto.randomBytes(4).toString("hex")}`;
    const traceId = body.traceId || `a2a_trc_${crypto.randomBytes(4).toString("hex")}`;

    // Idempotency key: standard header first (matches Stripe/Razorpay-style
    // convention for machine clients), body field as a fallback. A buyer
    // agent that times out and retries the same logical request should
    // reuse the same key so it never gets double-charged.
    const idempotencyKey = req.headers.get("idempotency-key") || body.idempotencyKey || undefined;

    // Transform cart format if necessary
    const items = body.cart.map((i: any) => ({
      skuOrId: i.productId || i.skuOrId,
      quantity: i.quantity || 1
    }));

    // Checkout execution -- guardrail-blocked outcomes (stock-out, budget
    // ceiling, margin floor) are returned as structured results with a
    // `recovery` object, not thrown, so a buyer agent can act on them.
    const checkoutResult = await CheckoutTool.executeCheckout({
      items,
      requestedDiscountPaise: body.requestedDiscountPaise,
      buyerAgentId: body.buyerAgentId || "external_a2a_buyer",
      buyerMaxBudgetPaise: body.buyerMaxBudgetPaise,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      sessionId,
      traceId,
      channel: "a2a_api",
      idempotencyKey,
    });

    if (!checkoutResult.success) {
      return NextResponse.json({
        success: false,
        error: checkoutResult.guardrailReason || checkoutResult.status,
        status: checkoutResult.status,
        recovery: checkoutResult.recovery || null,
        paymentLink: checkoutResult.paymentLink || null,
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
      sessionId,
      traceId
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 400 }); // Bad Request is more appropriate for logical errors
  }
}
