import Razorpay from "razorpay";
import crypto from "crypto";

const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

const isTestKeyValid = keyId.startsWith("rzp_") && keySecret.length > 5 && !keyId.includes("YourKeyId");

let razorpayClient: Razorpay | null = null;

if (isTestKeyValid) {
  try {
    razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  } catch (error) {
    console.warn("[Razorpay] Failed to initialize live Razorpay client, fallback enabled:", error);
  }
}

export interface RazorpayOrderPayload {
  amount: number; // in paise
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayPaymentLinkPayload {
  amount: number; // in paise
  currency?: string;
  description: string;
  customer: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  reminder_enable?: boolean;
}

export class RazorpayService {
  /**
   * Create an official Razorpay Order in paise
   */
  static async createOrder(payload: RazorpayOrderPayload): Promise<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    receipt?: string;
    notes?: any;
    isMock?: boolean;
  }> {
    if (razorpayClient && isTestKeyValid) {
      try {
        const order = await razorpayClient.orders.create({
          amount: payload.amount,
          currency: payload.currency || "INR",
          receipt: payload.receipt || `rcpt_${Date.now()}`,
          notes: payload.notes || {},
        });
        return {
          id: order.id,
          amount: Number(order.amount),
          currency: order.currency,
          status: order.status,
          receipt: order.receipt as string,
          notes: order.notes,
          isMock: false,
        };
      } catch (err: any) {
        console.warn("[Razorpay API Warning] createOrder failed, falling back to mock:", err?.error?.description || err?.message);
        return {
          id: `order_sim_fallback_${crypto.randomBytes(6).toString("hex")}`,
          amount: payload.amount,
          currency: payload.currency || "INR",
          status: "created",
          receipt: payload.receipt || `rcpt_sim_${Date.now()}`,
          notes: payload.notes || {},
          isMock: true,
        };
      }
    }

    // Deterministic High-Fidelity Mock for Sandbox/Testing
    const mockId = `order_sim_${crypto.randomBytes(6).toString("hex")}`;
    return {
      id: mockId,
      amount: payload.amount,
      currency: payload.currency || "INR",
      status: "created",
      receipt: payload.receipt || `rcpt_sim_${Date.now()}`,
      notes: payload.notes || {},
      isMock: true,
    };
  }

  /**
   * Generate an Instant Recovery Payment Link
   * Used for graceful failure handling (e.g. out of autonomous budget / secondary auth needed)
   */
  static async createPaymentLink(payload: RazorpayPaymentLinkPayload): Promise<{
    id: string;
    short_url: string;
    amount: number;
    status: string;
    isMock?: boolean;
  }> {
    if (razorpayClient && isTestKeyValid) {
      try {
        const link = await (razorpayClient as any).paymentLink.create({
          amount: payload.amount,
          currency: payload.currency || "INR",
          accept_partial: false,
          description: payload.description,
          customer: payload.customer,
          notify: {
            sms: true,
            email: true,
          },
          reminder_enable: payload.reminder_enable ?? true,
          notes: payload.notes || {},
        });
        return {
          id: link.id,
          short_url: link.short_url,
          amount: Number(link.amount),
          status: link.status,
          isMock: false,
        };
      } catch (err: any) {
        console.error("[Razorpay API Error] createPaymentLink failed:", err?.error?.description || err?.message);
        throw new Error(`Razorpay Payment Link Failed: ${err?.error?.description || err?.message}`);
      }
    }

    const mockId = `plink_sim_${crypto.randomBytes(6).toString("hex")}`;
    return {
      id: mockId,
      short_url: `https://rzp.io/i/sim_${crypto.randomBytes(4).toString("hex")}`,
      amount: payload.amount,
      status: "created",
      isMock: true,
    };
  }

  /**
   * Verifies Razorpay standard Checkout Signature.
   * Fails CLOSED: if no secret is configured we cannot verify anything, so
   * we must never treat an unverifiable signature as valid.
   */
  static verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    signature: string
  ): boolean {
    if (!keySecret) {
      console.warn("[Razorpay] Cannot verify payment signature: RAZORPAY_KEY_SECRET is not configured. Rejecting by default.");
      return false;
    }
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body.toString())
      .digest("hex");
    return expectedSignature === signature;
  }

  /**
   * Verifies Razorpay Webhook Signature.
   * Fails CLOSED for the same reason as above.
   */
  static verifyWebhookSignature(
    rawBody: string,
    signature: string,
    webhookSecret: string
  ): boolean {
    if (!webhookSecret) {
      console.warn("[Razorpay] Cannot verify webhook signature: no webhook secret configured. Rejecting by default.");
      return false;
    }
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");
    return expectedSignature === signature;
  }
}
