# AgentCarter 🕴️💳

**Autonomous AI Commerce Layer — Making Merchants Sellable to AI Buyers.**

> **Razorpay Hackathon · Track 01: AI Growth & Agentic Commerce**

AgentCarter is a production-grade autonomous commerce engine that enables **external AI buyer agents** to discover products, negotiate prices, and complete Razorpay checkout — all via stateless machine-to-machine APIs with zero human UI dependency. Every transaction is bounded by financial guardrails and logged to an immutable audit trail.

---

## Interaction Surfaces

- **Primary (Track requirement):** `/api/a2a/*` — pure machine-to-machine, no UI dependency. This is what fulfills the A2A commerce requirement. External buyer bots discover the catalog, negotiate discounts, and complete checkout entirely via JSON APIs.
- **Secondary (bonus):** `/chat` — human-facing conversational interface using the **SAME underlying tools** (negotiate, checkout, upsell, guardrails), included to demonstrate the engine's reusability across surfaces.

---

## Core Capabilities

| Capability | Implementation |
|:-----------|:---------------|
| **A2A Catalog Discovery** | `POST /api/a2a/catalog` — stateless product search with filters |
| **Bounded Negotiation** | `POST /api/a2a/negotiate` — discount evaluation against guardrails, counter-offers |
| **Autonomous Checkout** | `POST /api/a2a/checkout` — cart resolution, GST, margin check, Razorpay order + upsell |
| **Financial Guardrails** | ₹25,000 autonomous ceiling · 15% margin floor · 25% max discount cap |
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

📋 [AUDIT] Total events in ledger: 29+ (all immutably logged)
```

---

## Project Structure

```
razorpay-agentic-checkout/
├── prisma/
│   └── schema.prisma              # Product, Order, OrderItem, AuditLog models
├── scripts/
│   └── demo-buyer-agent.ts        # Standalone A2A buyer bot demo (judges script)
├── src/
│   ├── agent/
│   │   ├── orchestrator.ts        # GPT-4o orchestrator with function calling
│   │   └── tools/
│   │       ├── catalogTool.ts     # Catalog discovery + 6 curated coffee products
│   │       ├── checkoutTool.ts    # Cart → GST → margin check → Razorpay order
│   │       ├── failureRecoveryTool.ts  # Out-of-stock graceful fallback
│   │       ├── negotiateTool.ts   # Accept / counter / reject with guardrail math
│   │       └── upsellTool.ts     # Affinity-based cross-sell with margin safety
│   ├── app/
│   │   ├── .well-known/agent-commerce.json/route.ts  # A2A discovery manifest
│   │   ├── api/
│   │   │   ├── a2a/               # ← PRIMARY: Machine-to-Machine endpoints
│   │   │   │   ├── catalog/       #   POST — product search
│   │   │   │   ├── checkout/      #   POST — bounded checkout + upsell
│   │   │   │   └── negotiate/     #   POST — discount negotiation
│   │   │   ├── agent/             # UI-supporting endpoints
│   │   │   │   ├── audit/         #   GET — fetch audit logs
│   │   │   │   ├── catalog/       #   GET — catalog for UI page
│   │   │   │   └── chat/          #   POST — orchestrator streaming
│   │   │   ├── health/            # GET — DB warmup ping
│   │   │   └── razorpay/
│   │   │       ├── order/         #   POST — Razorpay order (UI checkout flow)
│   │   │       ├── verify/        #   POST — HMAC signature verification
│   │   │       └── webhook/       #   POST — Razorpay webhook (production-ready)
│   │   ├── audit/page.tsx         # Immutable Audit Ledger UI
│   │   ├── catalog/page.tsx       # Product Catalog Browser
│   │   ├── chat/page.tsx          # Conversational Commerce UI (bonus)
│   │   ├── dashboard/page.tsx     # Merchant Ops Dashboard
│   │   └── page.tsx               # Landing Page
│   ├── components/layout/         # Navbar, PageWrapper
│   ├── lib/
│   │   ├── auditLogger.ts        # DB-first logger with withRetry + in-memory fallback
│   │   ├── guardrails.ts         # GuardrailEngine (ceiling, margin, discount caps)
│   │   ├── prisma.ts             # Neon client with withRetry() + warmupDb()
│   │   └── razorpay.ts           # Shared RazorpayService.createOrder()
│   └── types/                     # TypeScript interfaces (commerce, guardrail, agent)
```

---

## Financial Guardrails

| Rule | Value | Effect |
|:-----|:------|:-------|
| Autonomous Spending Ceiling | ₹25,000 | Orders above this require human escalation |
| Minimum Gross Margin Floor | 15% | AI cannot negotiate below merchant profitability |
| Maximum Single Discount | 25% | Hard cap — requests above are rejected outright |
| GST | 18% | Auto-applied on subtotal after discounts |

### Negotiation Logic (`negotiateTool.ts`)

```
Requested ≤ 25% AND margin ≥ 15%  →  ACCEPTED (exact discount applied)
Requested breaches 15% margin     →  COUNTERED (max safe discount offered)
Requested > 25%                   →  REJECTED (hard limit violation)
```

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

// Response
{
  "success": true,
  "order": { "razorpayOrderId": "order_...", "amount": 1592894 },
  "upsellOffer": { "recommendations": [...] }
}
```

### `GET /.well-known/agent-commerce.json`
Machine-readable discovery manifest documenting all A2A endpoints, guardrail parameters, and supported protocols.

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

- **Webhook verification** (`/api/razorpay/webhook`): HMAC SHA256 signature verification is implemented for production use. Not triggered in local demo due to localhost tunneling requirements — would require ngrok/Cloudflare tunnel for Razorpay to reach localhost.
- **Neon cold-start handling**: `withRetry()` wrapper in `prisma.ts` automatically retries on transient connection errors (3 attempts, exponential backoff). Hit `/api/health` before demo to warm up.
- **Audit channel tagging**: All audit entries are tagged with `channel: "a2a_api"` or `"chat_ui"` in the `toolInput` JSON, allowing the audit page to distinguish machine-driven vs human-driven actions.

---

## Demo Sequence (Recommended Order)

1. **`/api/health`** — warm up Neon DB
2. **`npx tsx scripts/demo-buyer-agent.ts`** — run full A2A lifecycle (catalog → negotiate → checkout → hostile rejection → audit verification)
3. **`/audit`** — show immutable ledger with reasoning text and channel tags
4. **`/chat`** — (bonus) show same engine working as human-friendly interface
5. **Razorpay test card**: `4111 1111 1111 1111`, Expiry: `12/30`, CVV: `123`, OTP: `123456`
