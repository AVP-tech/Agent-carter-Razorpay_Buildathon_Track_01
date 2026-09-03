# AgentCarter 🕴️💳

**The Next Layer of Intelligence for Autonomous Commerce.**

AgentCarter is a high-tech, cinematic AI infrastructure dashboard that empowers merchants to turn AI intent into instant, bounded, margin-guarded revenue. Integrated deeply with OpenAI and Razorpay, it provides a seamless chat-to-checkout experience with strict financial guardrails and immutable audit trails.

## 🚀 Features

- **Dark Cinematic UI:** Premium Silicon-Valley enterprise aesthetics with a toggleable flawless dark mode.
- **Hybrid AI Persona:** Powered by OpenAI. Interacts in crisp, professional English for global buyers, but instantly mirrors and understands Hinglish natively when needed.
- **Agentic Checkout:** Conversational catalog search, cart building, and intelligent Razorpay checkout generation without leaving the chat.
- **Margin-Protected Upsells:** Automatically negotiates and recommends dynamic upsell bundles post-purchase, respecting merchant profitability limits.
- **Immutable Audit Ledger:** Every agent action (Catalog searches, guardrail approvals/blocks, order creation) is logged transparently for merchant oversight.
- **Database Ready:** Integrated with Prisma & Neon PostgreSQL for persistent catalogs and order records.

## 📁 Project Structure

```
.
├── prisma/                 # Database schema (Neon PostgreSQL)
├── public/                 # Static assets (images, videos)
├── src/
│   ├── agent/              # Core Agent Orchestrator & Tools
│   │   ├── tools/          # CheckoutTool, CatalogTool, UpsellTool
│   │   └── orchestrator.ts # OpenAI conversational brain
│   ├── app/                # Next.js App Router Pages
│   │   ├── api/            # Serverless API routes for agent and razorpay
│   │   ├── audit/          # Immutable Audit Ledger UI
│   │   ├── catalog/        # Product Catalog Dashboard
│   │   ├── chat/           # Main Agent Chat Interface
│   │   └── dashboard/      # Platform Overview metrics
│   ├── components/         # Reusable React components (Navbar, etc.)
│   └── lib/                # Utilities (Razorpay service, AuditLogger)
└── tailwind.config.ts      # Theming and styling rules
```

## 🔐 Environment Variables (`.env.local` vs `.env.example`)

To maintain enterprise-grade security, this project uses two environment files:

1. **`.env.example`**: This is a template file. It is safely pushed to GitHub to show other developers what keys the project needs. **Never put real keys here.**
2. **`.env.local`**: This is your private local configuration. It contains your *actual* Razorpay API keys, OpenAI keys, and Neon Database URL. **This file is ignored by Git and never pushed.**

**Setup your `.env.local`:**
```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_YourKey
RAZORPAY_KEY_SECRET=YourSecretKey
OPENAI_API_KEY=sk-proj-YourKey
DATABASE_URL="postgresql://neondb_owner:..."
```

## 🛠️ Getting Started

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Set up your `.env.local` as described above.
3. (Optional) Sync your Neon PostgreSQL database:
   ```bash
   npx prisma db push
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000` to see the cinematic landing page, and navigate to the Dashboard to launch Agent Carter!
