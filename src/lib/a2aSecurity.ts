import { NextRequest, NextResponse } from "next/server";

/**
 * Minimal but real security posture for the publicly-reachable A2A money
 * endpoints (checkout, negotiate). A hackathon demo can't ship full OAuth,
 * but "wide open with no auth and no limits" is a genuine gap on anything
 * that can create a Razorpay order -- this closes it just enough:
 *
 * 1. Optional bearer-token gate. If A2A_API_KEY is set in the environment,
 *    every request must carry a matching `Authorization: Bearer <key>`
 *    header. If it's unset (the default for this demo), the endpoint stays
 *    open -- but the mechanism is real and ready to flip on.
 * 2. A simple in-memory sliding-window rate limit per buyer-agent identity
 *    (falling back to client IP), so one misbehaving or looping agent can't
 *    hammer the checkout/negotiate path indefinitely.
 */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const rateBuckets = new Map<string, { count: number; windowStart: number }>();

export function getCallerIdentity(req: NextRequest, buyerAgentId?: string): string {
  if (buyerAgentId) return `agent:${buyerAgentId}`;
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim();
  return ip ? `ip:${ip}` : "anonymous";
}

export function isRateLimited(identity: string, limit: number = RATE_LIMIT_MAX_REQUESTS): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(identity);

  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(identity, { count: 1, windowStart: now });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

/**
 * Returns a NextResponse to short-circuit the request with if auth/rate
 * limiting rejects it, or null if the request may proceed.
 */
export function guardA2ARequest(req: NextRequest, identity: string, limit?: number): NextResponse | null {
  const requiredKey = process.env.A2A_API_KEY;
  if (requiredKey) {
    const authHeader = req.headers.get("authorization") || "";
    const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (provided !== requiredKey) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: missing or invalid Authorization bearer token." },
        { status: 401 }
      );
    }
  }

  if (isRateLimited(identity, limit)) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded. Slow down and retry after a short delay." },
      { status: 429 }
    );
  }

  return null;
}
