# AgentCarter 🕴️💳

**Autonomous AI Commerce Layer — Making Merchants Sellable to AI Buyers.**

> **Razorpay Hackathon · Track 01: AI Growth & Agentic Commerce**

AgentCarter is a production-grade autonomous commerce engine that enables **external AI buyer agents** to discover products, negotiate prices, and complete Razorpay checkout — all via stateless machine-to-machine APIs with zero human UI dependency. Every transaction is bounded by financial guardrails, logged to an immutable audit trail, and every guardrail-blocked outcome is paired with a graceful recovery instead of a bare error.

---

## Interaction Surfaces

- **Primary (Track requirement):** `/api/a2a/*` — pure machine-to-machine, no UI dependency. This is what fulfills the A2A commerce requirement. External buyer bots discover the catalog, negotiate discounts, and complete checkout entirely via JSON APIs.
- **Secondary (bonus):** `/chat` — human-facing conversational interface using the **SAME underlying tools** (negotiate, checkout, upsell, guardrails, failure recovery), included to demonstrate the engine's reusability across surfaces.

---

## Core Capabilities

| Capability | Implementation |
|:-----------|:---------------|
| **A2A Catalog Discovery** | `POST /api/a2a/catalog` — stateless product search with filters |
| **Bounded Negotiation** | `POST /api/a2a/negotiate` — discount evaluation against guardrails, counter-offers |
| **Autonomous Checkout** | `POST /api/a2a/checkout` — cart resolution, GST, margin check, Razorpay order + upsell |
| **Financial Guardrails** | ₹25,000 autonomous ceiling · 15% margin floor · 25% max discount cap |
| **Graceful Failure Recovery** | Wired directly into `/api/a2a/checkout` — stock-out → in-stock alternative, ceiling breach → real Razorpay payment link, margin breach → auto-capped discount (order still completes) |
| **Immutable Audit Trail** | Every action logged with reasoning, guardrail verdict, and channel tag (`a2a_api` / `chat_ui`) |
| **Machine-Readable Discovery** | `/.well-known/agent-commerce.json` — A2A protocol manifest |
| **Neon DB Resilience** | Auto-retry with exponential backoff for serverless cold-starts |
| **Post-Checkout Upsell** | Margin-safe complementary product recommendations (12% bundle discount) |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up your .env.local (see Environment Variables section below)

# 3. Sync database schema
npx prisma db push

# 4. Start development server
npm run dev

# 5. Warm up Neon DB (recommended before demo)
curl http://localhost:3000/api/health

# 6. Run the A2A buyer agent demo script
npx tsx scripts/demo-buyer-agent.ts
```

---

## Demo Script Output (What Judges Will See)

```
🤖 [BUYER AI] Starting Autonomous A2A Negotiation Demo

[SYSTEM] Warming up Neon database...
[SYSTEM] DB Status: healthy (1429ms)

[BUYER AI] Fetching catalog from Merchant Agent...
[MERCHANT AGENT] Catalog returned. Found 5 items.
[BUYER AI] Targeting product: AeroPress Pro Precision Espresso Maker (₹14,999)

[BUYER AI] Requesting a reasonable 10% discount...
✅ [MERCHANT AGENT] ACCEPTED: Margin and ceiling constraints passed.
   Final Negotiated Price: ₹13,499

[BUYER AI] Proceeding to autonomous checkout...
✅ [MERCHANT AGENT] Checkout successful! Guardrails passed.
   Razorpay Order ID: order_TXYb45g1UVQFY0
   💡 Upsell: Precision Burr Grinder at 12% bundle discount

🤖 [BUYER AI] Scenario 2: Hostile Negotiation
[BUYER AI] Requesting an illegal 60% discount...
🚫 [MERCHANT AGENT] REJECTED: Exceeds platform hard limit of 25%.

🛟 [BUYER AI] Scenario 3: Graceful Failure Recovery
[BUYER AI] Attempting to check out an out-of-stock item...
🚫 [MERCHANT AGENT] Checkout blocked: Insufficient stock for 'Eco-Friendly Organic Espresso Descaling Kit'.
✅ [MERCHANT AGENT] Gracefully recovered — strategy: ALTERNATIVE_ITEM_FOUND
   → Suggested alternative: Artisanal Madagascar Vanilla Syrup (₹499.00, 50 in stock)

[BUYER AI] Attempting to check out an item above the ₹25,000 ceiling...
🚫 [MERCHANT AGENT] Checkout blocked: exceeds autonomous purchase limit.
✅ [MERCHANT AGENT] Gracefully recovered — strategy: PAYMENT_LINK_ESCALATION
   Escalation link generated for human approval: https://rzp.io/i/...

📋 [AUDIT] Total events in ledger: 30+ (all immutably logged)
```

---

## Project Structure

```
razorpay-agentic-checkout/
├── prisma/
│   └── schema.prisma              # Product, Order, OrderItem, AuditLog models
├── scripts/
│   ├── demo-buyer-agent.ts        # Standalone A2A buyer bot demo (judges script)
│   ├── seed.ts                    # Seeds Neon DB with catalog + discount policy
│   ├── test-agent-e2e.ts          # Conversational orchestrator E2E test
│   ├── test-a2a-checkout.ts       # A2A discovery → upsell → checkout test
│   └── test-failures.ts           # Guardrail + failure-recovery unit suite
├── src/
│   ├── agent/
│   │   ├── orchestrator.ts        # GPT-4o orchestrator with function calling
│   │   └── tools/
│   │       ├── catalogTool.ts     # Catalog discovery + 6 curated coffee products
│   │       ├── checkoutTool.ts    # Cart → GST → margin check → Razorpay order → graceful recovery
│   │       ├── failureRecoveryTool.ts  # Stock-out alternatives, budget escalation, margin auto-cap
│   │       ├── negotiateTool.ts   # Accept / counter / reject with guardrail math
│   │       └── upsellTool.ts     # Affinity-based cross-sell with margin safety
│   ├── app/
│   │   ├── .well-known/agent-commerce.json/route.ts  # A2A discovery manifest
│   │   ├── api/
│   │   │   ├── a2a/               # ← PRIMARY: Machine-to-Machine endpoints
│   │   │   │   ├── catalog/       #   POST — product search
│   │   │   │   ├── checkout/      #   POST — bounded checkout + upsell + recovery
│   │   │   │   └── negotiate/     #   POST — discount negotiation
│   │   │   ├── agent/             # UI-supporting endpoints
│   │   │   │   ├── audit/         #   GET — fetch audit logs
│   │   │   │   ├── catalog/       #   GET — catalog for UI page
│   │   │   │   └── chat/          #   POST — orchestrator streaming
│   │   │   ├── health/            # GET — DB warmup ping
│   │   │   └── razorpay/
│   │   │       ├── order/         #   POST — Razorpay order (UI checkout flow)
│   │   │       ├── verify/        #   POST — HMAC signature verification (fail-closed)
│   │   │       └── webhook/       #   POST — Razorpay webhook (fail-closed)
│   │   ├── audit/page.tsx         # Immutable Audit Ledger UI
│   │   ├── catalog/page.tsx       # Product Catalog Browser
│   │   ├── chat/page.tsx          # Conversational Commerce UI (bonus) + recovery surfacing
│   │   ├── dashboard/page.tsx     # Merchant Ops Dashboard
│   │   └── page.tsx               # Landing Page
│   ├── components/layout/         # Navbar, PageWrapper
│   ├── lib/
│   │   ├── auditLogger.ts        # DB-first logger with withRetry + in-memory fallback
│   │   ├── guardrails.ts         # GuardrailEngine (ceiling, margin, discount caps)
│   │   ├── prisma.ts             # Neon client with withRetry() + warmupDb()
│   │   └── razorpay.ts           # Shared RazorpayService.createOrder() + fail-closed signature checks
│   └── types/                     # TypeScript interfaces (commerce, guardrail, agent)
```

---

## Financial Guardrails

| Rule | Value | Effect |
|:-----|:------|:-------|
| Autonomous Spending Ceiling | ₹25,000 | Orders above this are escalated to a human via a real Razorpay payment link |
| Minimum Gross Profit Margin Floor | 15% | AI cannot negotiate below merchant profitability — an over-aggressive discount is auto-capped instead of failing the order |
| Maximum Single Discount | 25% | Hard cap — requests above are rejected outright |
| GST | 18% | Auto-applied on subtotal after discounts |

### Negotiation Logic (`negotiateTool.ts`)

```
Requested ≤ 25% AND margin ≥ 15%  →  ACCEPTED (exact discount applied)
Requested breaches 15% margin     →  COUNTERED (max safe discount offered)
Requested > 25%                   →  REJECTED (hard limit violation)
```

### Graceful Failure Recovery (`failureRecoveryTool.ts`, wired into `checkoutTool.ts`)

Every guardrail block on `POST /api/a2a/checkout` returns a structured `recovery` object instead of a bare error, so a calling agent (or the `/chat` UI) can act on it:

```
STOCK_OUT       →  ALTERNATIVE_ITEM_FOUND: returns a real in-stock substitute (SKU, price, stock)
BUDGET_EXCEEDED →  PAYMENT_LINK_ESCALATION: generates a real Razorpay 1-click payment link for
                    human approval (only when the *platform* ceiling is breached — a buyer
                    agent's own pre-authorized mandate budget is reported plainly instead,
                    since there's no human on that side to approve a link)
MARGIN_BREACH   →  CAPPED_DISCOUNT_APPLIED: auto-retries with the maximum discount that still
                    respects the margin floor, and completes the order at that price instead
                    of failing outright
```

`npx tsx scripts/test-failures.ts` exercises all three directly; `npx tsx scripts/demo-buyer-agent.ts` exercises the first two live over the actual HTTP API.

---

## A2A API Reference

### `POST /api/a2a/catalog`
```json
// Request
{ "inStockOnly": true, "category": "Coffee Beans" }

// Response
{ "success": true, "data": { "count": 2, "products": [...] } }
```

### `POST /api/a2a/negotiate`
```json
// Request
{ "productId": "prod_espresso_01", "requestedDiscountPercent": 10 }

// Response
{ "success": true, "decision": "accepted", "finalPrice": 1349910, "reasoning": "..." }
```

### `POST /api/a2a/checkout`
```json
// Request
{ "cart": [{ "productId": "prod_espresso_01", "quantity": 1 }] }

// Response (success)
{
  "success": true,
  "order": { "razorpayOrderId": "order_...", "amount": 1592894 },
  "upsellOffer": { "recommendations": [...] }
}

// Response (blocked, gracefully recovered)
{
  "success": false,
  "error": "Insufficient stock for product 'Eco-Friendly Organic Espresso Descaling Kit'...",
  "status": "STOCK_OUT",
  "recovery": {
    "recovered": true,
    "strategy": "ALTERNATIVE_ITEM_FOUND",
    "message": "...",
    "suggestedAlternative": { "sku": "SYRUP-VANILLA-250ML", "title": "...", "price": 49900, "inventoryCount": 50 }
  }
}
```

### `GET /.well-known/agent-commerce.json`
Machine-readable discovery manifest documenting all A2A endpoints and guardrail parameters. It advertises a plain `REST-JSON-v1` protocol and lists NPCI UAP, ACP, AP2 and x402 under `protocolAlignment.inspiredBy` as the standards this design is conceptually aligned with — it does not claim certified conformance to any of them.

---

## Environment Variables

Create `.env.local` with your actual credentials:

```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_YourKey
RAZORPAY_KEY_SECRET=YourSecretKey
OPENAI_API_KEY=sk-proj-YourKey
DATABASE_URL="postgresql://neondb_owner:...@...neon.tech/neondb?sslmode=require"
```

> `.env.example` contains placeholder values for reference. Never put real keys there.

---

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| Framework | Next.js 15.5 (App Router), React 19, TypeScript |
| AI Engine | OpenAI GPT-4o with Native Function Calling |
| Payments | Razorpay Node SDK + checkout.js |
| Database | Neon Serverless PostgreSQL + Prisma ORM |
| Styling | Tailwind CSS, Framer Motion, Dark/Light toggle |

---

## Production Notes

- **Signature verification fails closed**: `RazorpayService.verifyPaymentSignature` / `verifyWebhookSignature` (`src/lib/razorpay.ts`) now reject by default when no secret is configured, instead of silently accepting. Real verification requires `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` to be set.
- **Webhook verification** (`/api/razorpay/webhook`): HMAC SHA256 signature verification is implemented for production use. Not triggered in local demo due to localhost tunneling requirements — would require ngrok/Cloudflare tunnel for Razorpay to reach localhost.
- **Neon cold-start handling**: `withRetry()` wrapper in `prisma.ts` automatically retries on transient connection errors (3 attempts, exponential backoff). Hit `/api/health` before demo to warm up.
- **Audit channel tagging**: All audit entries are tagged with `channel: "a2a_api"` or `"chat_ui"` in the `toolInput` JSON, allowing the audit page to distinguish machine-driven vs human-driven actions.
- **Chat session store is in-memory** (`orchestrator.ts`): fine for a single local `npm run dev` demo process. If ever deployed to a serverless platform (e.g. Vercel) where each invocation can hit a different instance, this would need to move to a shared store (Redis, DB row) to survive across requests — not needed for the local hackathon demo.

---

## Demo Sequence (Recommended Order)

1. **`/api/health`** — warm up Neon DB
2. **`npx tsx scripts/demo-buyer-agent.ts`** — run full A2A lifecycle: catalog → negotiate → checkout → hostile rejection → **graceful failure recovery (stock-out alternative + budget-ceiling payment link)** → audit verification
3. **`/audit`** — show immutable ledger, including the "Gracefully Recovered" stat and `FAILURE_RECOVERY` entries with reasoning and channel tags
4. **`/chat`** — (bonus) ask "What happens if I order the descaler?" to see the same recovery surfaced conversationally, with an inline "Try this instead" button
5. **Razorpay test card** (domestic India Visa, per Razorpay's own test-mode docs -- `4111 1111 1111 1111` is a generic international test number and is NOT one of Razorpay's documented Indian cards, so avoid it if your account doesn't have international payments enabled): `4100 2800 0000 1007`, Expiry: any future date (e.g. `12/30`), CVV: any 3 digits (e.g. `123`), OTP: `123456`
