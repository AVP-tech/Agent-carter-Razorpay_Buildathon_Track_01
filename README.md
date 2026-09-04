AgentCarter: Autonomous AI Commerce Engine

A production-ready commerce backend for agent-to-agent (A2A) transactions with deterministic guardrails, graceful failure recovery, and full audit transparency. Built for Razorpay Buildathon 2024 — Track 01.

What Is AgentCarter?

AgentCarter is a commerce engine built for AI agents shopping on behalf of other AI agents. Every transaction is bounded, checked, and logged before it touches Razorpay.

Three-Layer Architecture

1. Intelligence (GPT-4o-mini) - Proposes products, discounts, add-ons
2. Enforcement (Guardrail Engine) - Pure code, validates against hard limits:
   - 25,000 INR spending ceiling
   - 15% minimum margin floor
   - 25% maximum discount cap
3. Accountability (Audit Ledger) - Immutable log of every decision with reasoning

Key Features

Agent-to-Agent Commerce (A2A)
- Pure JSON APIs, stateless, rate-limited
- Machine-readable discovery via `.well-known/agent-commerce.json`
- Endpoints: `/api/a2a/catalog`, `/api/a2a/negotiate`, `/api/a2a/checkout`
- Idempotent - retry same request, never double-charged

Human Chat UI
- Same catalog, same guardrails, same rules
- Live negotiation: "Can you do 20% off?" works like A2A
- Graceful failure:
  - Out-of-stock → suggests in-stock alternative
  - Over budget → escalates to human via Razorpay payment link
  - Over-ask discount → counters with real max offer

GST Transparency
- All prices shown are GST-inclusive (final prices)
- Receipt breakdown shows: base price, discount, 18% GST, total
- No surprise charges at checkout

Smart Negotiation
- Agent asks 40% off → countered: "I can do 25% max"
- Guardrails guarantee 15% minimum margin
- Never flat rejections - always offers real best price

Upsells
- One persuasive pitch per session after payment
- 6-category affinity coverage (Coffee Appliances, Beans, Accessories, Syrups, Cold Brew, Maintenance)
- 12% bundle discount (margin-safe)
- Excludes already-purchased products

Tech Stack

- Frontend: Next.js 15.5, React 19, TypeScript, Tailwind CSS
- Backend: Next.js API routes, TypeScript
- Database: Prisma + Neon Postgres
- Payments: Razorpay (test card: 4100 2800 0000 1007)
- AI: OpenAI GPT-4o-mini
- Guardrails: Deterministic TypeScript code

Quick Start

```bash
Install
git clone https://github.com/AVP-tech/Agent-carter-Razorpay_Buildathon_Track_01.git
cd Agent-carter-Razorpay_Buildathon_Track_01
npm install

Environment (.env.local)
DATABASE_URL=postgres://...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
OPENAI_API_KEY=sk-proj_...
A2A_API_KEY=agentcarter_test_key

Setup
npx prisma db push
npm run dev

Open http://localhost:3000
```

Test A2A Flow

```bash
npx tsx scripts/demo-buyer-agent.ts
```

Runs complete agent-to-agent demo:
- Catalog discovery
- Successful negotiation (10% accepted)
- Checkout with upsell
- Hostile negotiation test (60% → countered to 25%)
- Budget breach recovery (payment link)
- Stock-out recovery (alternative suggested)
- Audit verification

Core Endpoints

GET /api/a2a/catalog - List all products as JSON

POST /api/a2a/negotiate - Request discount, get counter-offer
```json
{
  "sku": "ESPRESSO-MAKER-PRO",
  "requestedDiscountPercent": 40,
  "buyerAgentId": "agent_xyz"
}
```

POST /api/a2a/checkout - Place order (idempotent)
```json
{
  "items": [{"sku": "ESPRESSO-MAKER-PRO", "quantity": 1}],
  "discountPercent": 10,
  "buyerAgentId": "agent_xyz"
}
```

UI Routes

- `/` - Landing page
- `/chat` - Interactive chat (human UI, same backend)
- `/catalog` - Browse products with GST breakdown
- `/audit` - View decision log (channel, action, reasoning)

How It Works

Pricing
- Internal: all prices in paise, GST-exclusive
- Customer-facing: all prices GST-inclusive (what you see is what you pay)
- Order confirmation includes breakdown: base + discount + 18% GST = total

Negotiation Flow
1. Agent requests discount (e.g., 40%)
2. Engine calculates max safe discount based on margin floor
3. If request > max → counters with real maximum
4. If request < max → accepts immediately
5. Discount applied at checkout, verified against guardrails

Upsell Flow
1. Payment confirmed
2. Engine finds complementary product from affinity map
3. First upsell: persuasive pitch with 12% bundle discount
4. Repeat asks: plain mention only (no spam)

Graceful Failure
1. Stock-out → suggests in-stock alternative with same category affinity
2. Budget breach → creates Razorpay payment link for human approval
3. Over-ask → counters with real max discount instead of rejecting

Catalog Products

9 coffee products: Espresso Maker Pro, Swiss Burr Grinder, Ethiopian Beans, Colombian Beans, Tamper, Vanilla Syrup, Cold Brew Kit, Bio Descaler (out of stock for testing), Commercial Roaster.

Guardrail Rules

All rules are deterministic code - no LLM discretion.

Development

```bash
Type check
npx tsc --noEmit -p tsconfig.json

Dev server
npm run dev

Build
npm run build
```

Scope

Implemented:
- A2A + chat on same guardrail engine
- All 3 graceful failure paths (stock-out, budget, over-ask)
- GST transparency
- Negotiate discount with counters
- Affinity-aware upsells
- Immutable audit trail

Not implemented (intentional for hackathon):
- Multi-tenant OAuth per agent (using shared test key)
- Redis session store (in-memory only)

---

Repository: https://github.com/AVP-tech/Agent-carter-Razorpay_Buildathon_Track_01

Built for Razorpay Buildathon 2026 — Track 01
