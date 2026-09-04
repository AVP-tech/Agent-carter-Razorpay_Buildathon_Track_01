import OpenAI from "openai";
import { CatalogTool } from "./tools/catalogTool";
import { UpsellTool } from "./tools/upsellTool";
import { CheckoutTool } from "./tools/checkoutTool";
import { NegotiateTool } from "./tools/negotiateTool";
import { AuditLogger } from "../lib/auditLogger";
import crypto from "crypto";

// Defense-in-depth: even with strict prompt rules, gpt-4o-mini can still slip
// into markdown formatting sometimes. Strip any stray symbols before a reply
// ever leaves the server, so the chat UI never shows raw "#"/"**"/backticks.
function sanitizeAgentReply(text: string): string {
  if (!text) return text;
  let out = text;
  out = out.replace(/^\s{0,3}#{1,6}\s*/gm, "");
  out = out.replace(/^\s*[-*]\s+/gm, "\u2022 ");
  out = out.replace(/\*\*(.*?)\*\*/g, "$1");
  out = out.replace(/__(.*?)__/g, "$1");
  out = out.replace(/\*(.*?)\*/g, "$1");
  out = out.replace(/`{1,3}([^`]*)`{1,3}/g, "$1");
  out = out.replace(/[#*_`]{2,}/g, "");
  return out.trim();
}

// Paise is our internal unit everywhere in this codebase, but the LLM has no
// way to know that from a bare field like `price: 1499900` -- it just reads
// it as rupees and prints "₹1,499,900" instead of "₹14,999". Rather than
// trust the model to remember to divide by 100 (it won't, reliably), every
// money field is converted to a plain rupee number in code before the tool
// result ever reaches it. Internal cost/margin data is dropped entirely --
// the model never needs it and should never be in a position to leak it.
const toRupees = (paise: number | undefined | null): number | undefined =>
  paise === undefined || paise === null ? undefined : Number((paise / 100).toFixed(2));

// Catalog prices are stored GST-exclusive internally (needed for clean
// margin math against costPrice in GuardrailEngine), but every price shown
// to the CUSTOMER -- while browsing, negotiating, or getting an upsell
// pitch -- must already include the mandatory 18% GST that gets added at
// actual checkout. Without this, a customer would be quoted one number
// while chatting and then see a bigger one the moment an order is created,
// which reads as the price "increasing" at payment time. Converting here,
// in code, means the model never has to remember to add tax itself.
const GST_RATE = 0.18;
const toGstInclusivePaise = (basePaise: number): number => Math.round(basePaise * (1 + GST_RATE));
const toBasePaiseFromGstInclusive = (inclPaise: number): number => Math.round(inclPaise / (1 + GST_RATE));

function toAgentFacingProduct(p: any) {
  return {
    sku: p.sku,
    title: p.title,
    description: p.description,
    category: p.category,
    priceInr: toRupees(toGstInclusivePaise(p.price)),
    inStock: p.inventoryCount > 0,
    inventoryCount: p.inventoryCount,
    tags: p.tags,
  };
}

function toAgentFacingCheckoutResult(r: any) {
  return {
    success: r.success,
    status: r.status,
    guardrailReason: r.guardrailReason,
    orderId: r.razorpayOrderId || r.orderId,
    amountInr: toRupees(r.amount),
    paymentLink: r.paymentLink,
    idempotentReplay: r.idempotentReplay,
    recovery: r.recovery
      ? {
          recovered: r.recovery.recovered,
          strategy: r.recovery.strategy,
          message: r.recovery.message,
          suggestedAlternative: r.recovery.suggestedAlternative
            ? {
                sku: r.recovery.suggestedAlternative.sku,
                title: r.recovery.suggestedAlternative.title,
                priceInr: toRupees(toGstInclusivePaise(r.recovery.suggestedAlternative.price)),
                inventoryCount: r.recovery.suggestedAlternative.inventoryCount,
              }
            : undefined,
        }
      : undefined,
    explainability: r.explainability
      ? {
          basePriceInr: toRupees(r.explainability.basePrice),
          discountInr: toRupees(r.explainability.discount),
          taxesInr: toRupees(r.explainability.taxes),
          finalPayableInr: toRupees(r.explainability.finalPayable),
          marginHealthy: r.explainability.marginHealthy,
          autoAdjustedDiscount: r.explainability.autoAdjustedDiscount,
        }
      : undefined,
  };
}

function toAgentFacingUpsell(r: any) {
  return {
    hasUpsell: r.hasUpsell,
    bundleDiscountPercent: r.bundleDiscountPercent,
    explanation: r.explanation,
    recommendations: (r.recommendations || []).map((rec: any) => ({
      sku: rec.sku,
      title: rec.title,
      originalPriceInr: toRupees(toGstInclusivePaise(rec.originalPrice)),
      discountedBundlePriceInr: toRupees(toGstInclusivePaise(rec.discountedBundlePrice)),
      savingsInr: toRupees(toGstInclusivePaise(rec.savings)),
      reasoning: rec.reasoning,
    })),
  };
}

// Negotiation math (what discount percent a countered price actually implies)
// is computed here in code, not left to the model -- exactly the same
// philosophy as every other money field in this file. The model's job is
// only to relay the decision and reasoning, then reuse appliedDiscountPercent
// verbatim if it later calls create_order.
function toAgentFacingNegotiation(r: any, originalPricePaise: number) {
  // The discount percent is a ratio, so it is identical whether computed
  // before or after GST -- only the displayed rupee amounts need the
  // GST-inclusive conversion, to match what checkout will actually charge.
  const appliedDiscountPercent =
    originalPricePaise > 0
      ? Number((((originalPricePaise - r.finalPrice) / originalPricePaise) * 100).toFixed(1))
      : 0;
  return {
    decision: r.decision,
    originalPriceInr: toRupees(toGstInclusivePaise(originalPricePaise)),
    finalPriceInr: toRupees(toGstInclusivePaise(r.finalPrice)),
    appliedDiscountPercent,
    reasoning: r.reasoning,
  };
}

const openaiApiKey = process.env.OPENAI_API_KEY || "";
const hasValidOpenAI = openaiApiKey.startsWith("sk-") && !openaiApiKey.includes("YourOpenAiKey");

const sessionStore = new Map<
  string,
  {
    history: OpenAI.Chat.ChatCompletionMessageParam[];
    traceId: string;
    checkoutResult?: any;
    upsellOffer?: any;
    lastActiveAt: number;
    purchasedSkus: Set<string>;
    upsellPitchCount: number;
  }
>();

// This process keeps every chat session's history in memory for as long as
// the server runs, with nothing ever removing an old one -- a slow but real
// memory leak on a long-lived deployment. Sweep out anything idle for more
// than SESSION_TTL_MS on each request instead of a background timer, so
// there's nothing to leak or double-schedule across dev-server hot reloads.
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours of inactivity

function pruneStaleSessions() {
  const now = Date.now();
  for (const [id, session] of sessionStore.entries()) {
    if (now - session.lastActiveAt > SESSION_TTL_MS) {
      sessionStore.delete(id);
    }
  }
}

export interface AgentSessionContext {
  sessionId: string;
  traceId: string;
  buyerAgentId?: string;
  buyerMaxBudgetPaise?: number;
}

const PERSONA_SYSTEM_PROMPT = `You are Agent Carter, a cutting-edge Autonomous Commerce Engine for a specialty coffee brand.

PERSONA RULES:
1. Tone: Professional, sharp, and concise. Think enterprise-grade AI assistant — clear, helpful, no fluff.
2. Language: Always respond in clean, professional English. Note: You also understand Hinglish, so if a user writes in Hinglish, understand their intent perfectly but still respond in English.
3. Formatting — STRICT: You are writing chat bubbles in a messaging UI, not a markdown document. NEVER use markdown syntax of any kind: no "#" or "##" headings, no "**bold**" or "*italic*" asterisks, no "_underscore_" emphasis, no backticks, no dashes or asterisks as bullet points. If you want to present a few options, write them as a short plain sentence or separate them with commas or simple line breaks — never a formatted list. Never output raw JSON. Write like a sharp, helpful person typing a text message, not like a document.

YOUR CAPABILITIES:
1. Use 'search_catalog' to find products when the user asks about products, categories, or prices.
2. Use 'create_order' ONLY once the user has confirmed exactly one specific product they want to buy. After creating the order, tell them to click the "Pay Now" button that appears below. If the customer explicitly accepted a bundle/upsell discount, or a negotiated discount from 'negotiate_discount', pass that exact percent as discountPercent so it is actually applied.
3. 'get_upsell_offer' is available if the user asks what pairs well with something BEFORE buying it. You do not need to call it after checkout or after payment -- a separate automatic step handles the post-purchase upsell pitch for you, so never call it right after create_order.
4. Use 'negotiate_discount' when the customer wants to negotiate on a SPECIFIC product BEFORE buying it, but only once they have named an actual number (e.g. "can you do 20% off?", "can I get it for 12000?"). If they just vaguely ask for a discount with no number ("can I get a discount?", "any offers on this?", "can you do better?"), do NOT call the tool yet -- ask them what discount or price they had in mind first. Once they give a number, call the tool and report the outcome plainly using its decision and reasoning: if accepted, confirm the exact price; if countered, tell them their ask was too high and state the maximum percent you can actually do instead (e.g. "I can't do 40%, but I can do 25% max"); if rejected, explain plainly that no discount is possible on this item right now. Never invent a discount or do this math yourself -- always call the tool and use its numbers. If the customer then confirms they want to buy at that negotiated price, call create_order with discountPercent set to exactly the tool's appliedDiscountPercent.

DISAMBIGUATION -- IMPORTANT: If your last 'search_catalog' call returned more than one product and the user then says something vague like "I want to buy this", "get me that one", or "order it" without naming which specific product they mean, do NOT guess and do NOT call create_order. Instead, ask a short clarifying question that names the candidate products by title so they can specify exactly one.

GRACEFUL FAILURE HANDLING: 'create_order' can come back blocked instead of succeeding. Read the tool result carefully and explain plainly what happened, in plain English:
- If it was blocked for being out of stock, it will include a suggested in-stock alternative — tell the user about it and offer to check out with that instead.
- If it was blocked for exceeding the autonomous spending limit, it will include a secure payment link for human approval — share that link with the user.
- If the discount was automatically capped to protect the merchant's margin, say so plainly and confirm the order still went through at the adjusted price.
Never just say "something went wrong" — always explain the reason and the next step from the tool result.

HANDLING A REPORTED PAYMENT FAILURE: The user may tell you their Razorpay payment attempt itself just failed (separate from a blocked checkout above — this is a failure at the actual payment step, after an order was already created). When that happens:
1. Stay calm and reassuring — this is common and not the user's fault.
2. If they mention netbanking or a wallet hanging or failing, gently ask whether they are testing inside a normal browser tab (Chrome, Safari, Edge). An embedded preview panel inside a code editor or another app blocks the redirect flow those payment methods need, which causes exactly this kind of failure, while card payments still tend to work. Suggest opening the checkout in a full browser tab if they have not already.
3. Offer to create a fresh order for the same item so they can retry with 'create_order'.
4. Do not blame the user or repeat "please use another method" verbatim — give the concrete next step instead.

PRICING: Every price you receive from a tool is already a plain Indian Rupee amount (a field ending in "Inr", e.g. priceInr: 14999 means ₹14,999) and already includes all applicable taxes -- it is exactly what the customer will pay, nothing is added later. Never multiply or divide it by 100 or any other number, and never add tax on top of a number yourself -- it's already included. The price you quote while browsing, negotiating, or pitching an upsell is the same final number that will appear on the order and the Pay Now button, so never imply or warn that the price could still change once an order is created.

GST TRANSPARENCY: Whenever 'create_order' succeeds, its result includes an explainability breakdown (basePriceInr, discountInr, taxesInr, finalPayableInr). Always state this breakdown plainly when you confirm the order was created -- for example "Your order is confirmed for ₹884, that's ₹749 plus ₹135 in GST -- click Pay Now below." This makes the 18% GST genuinely visible to the customer at the moment it matters, rather than silently folded into one number. You don't need to repeat this breakdown every time you mention a price elsewhere (browsing, negotiating, upsell pitches) -- just at order confirmation.

IMPORTANT: Keep responses concise — a few short sentences at most unless the user asks for detail. Absolutely no markdown formatting characters should ever appear in your output. Write naturally, like a helpful commerce assistant chatting with a customer.`;

export class AgentOrchestrator {
  private openai: OpenAI | null = null;

  constructor() {
    if (hasValidOpenAI) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
    }
  }

  private ensureSession(sessionId: string, traceId: string) {
    if (!sessionStore.has(sessionId)) {
      sessionStore.set(sessionId, {
        lastActiveAt: Date.now(),
        history: [{ role: "system", content: PERSONA_SYSTEM_PROMPT }],
        traceId,
        purchasedSkus: new Set<string>(),
        upsellPitchCount: 0,
      });
    }
    return sessionStore.get(sessionId)!;
  }

  /**
   * Deterministically pitches a complementary product right after a payment
   * is confirmed (called from the /api/razorpay/verify success path, not
   * from free-text chat). What to recommend and at what discount is decided
   * entirely by UpsellTool -- guardrail-governed, same as everywhere else in
   * this app -- the LLM's only job is to phrase the pitch persuasively. This
   * replaces relying on the model to notice a generic "payment successful"
   * message and choose to call get_upsell_offer on its own, which wasn't
   * reliable.
   */
  async generatePostPurchasePitch(params: {
    sessionId: string;
    sku: string;
    traceId?: string;
  }): Promise<{ reply: string; metadata: any; sessionId: string; traceId: string }> {
    const sessionId = params.sessionId;
    const traceId = params.traceId || `trc_${crypto.randomBytes(6).toString("hex")}`;

    pruneStaleSessions();
    const session = this.ensureSession(sessionId, traceId);
    session.lastActiveAt = Date.now();
    session.traceId = traceId;
    session.purchasedSkus.add(params.sku);

    const autoUpsell = await UpsellTool.recommendUpsell({
      currentCartItems: [{ skuOrId: params.sku, quantity: 1 }],
      sessionId,
      traceId,
      channel: "chat_ui",
    });

    // recommendUpsell only excludes the single SKU just purchased, not the
    // customer's whole running purchase history for this session -- so
    // without this filter, buying the recommended add-on could turn right
    // around and recommend something already bought earlier in the chat.
    const freshRecommendations = autoUpsell.recommendations.filter(
      (rec) => !session.purchasedSkus.has(rec.sku)
    );

    const metadata: any = {};

    if (freshRecommendations.length === 0) {
      const reply = "Thanks for your order! It's confirmed. Let me know if you'd like anything else.";
      session.history.push({ role: "assistant", content: reply });
      return { reply, metadata, sessionId, traceId };
    }

    const top = freshRecommendations[0];

    // Only push one full persuasive, discounted upsell pitch per session --
    // repeating the hard sell after every single purchase felt naggy and
    // pushy in testing. After the first pitch, later purchases get a quiet,
    // no-discount, informational mention instead of another bundled push.
    if (session.upsellPitchCount >= 1) {
      const reply = `Thanks for your order! It's confirmed. If you're looking to expand further, the ${top.title} is also available at ₹${(top.originalPrice / 100).toFixed(0)}.`;
      session.history.push({ role: "assistant", content: reply });
      return { reply, metadata, sessionId, traceId };
    }

    session.upsellPitchCount += 1;
    const shapedUpsell = { ...autoUpsell, recommendations: freshRecommendations, hasUpsell: true };
    metadata.upsellOffer = shapedUpsell;
    session.upsellOffer = shapedUpsell;

    session.history.push({
      role: "system",
      content: `autoUpsell: payment for SKU ${params.sku} was just confirmed. A complementary product was found: "${top.title}" (SKU ${top.sku}), bundled at ${autoUpsell.bundleDiscountPercent}% off -- ₹${(top.discountedBundlePrice / 100).toFixed(0)} instead of ₹${(top.originalPrice / 100).toFixed(0)}, saving ₹${(top.savings / 100).toFixed(0)}. Thank the customer for their purchase, then pitch this specific add-on warmly and temptingly in 1-2 sentences -- persuasive, not pushy, no markdown. If they say yes later, call create_order with sku "${top.sku}" and discountPercent ${autoUpsell.bundleDiscountPercent}.`,
    });

    const fallbackPitch = `Thanks for your order! By the way, the ${top.title} pairs really well with it -- it's ${autoUpsell.bundleDiscountPercent}% off right now at ₹${(top.discountedBundlePrice / 100).toFixed(0)} (you'd save ₹${(top.savings / 100).toFixed(0)}). Want me to add it?`;

    if (!this.openai) {
      session.history.push({ role: "assistant", content: fallbackPitch });
      return { reply: fallbackPitch, metadata, sessionId, traceId };
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: session.history,
      });
      const reply = sanitizeAgentReply(completion.choices[0].message.content || fallbackPitch);
      session.history.push(completion.choices[0].message);
      return { reply, metadata, sessionId, traceId };
    } catch (err) {
      console.error("[Orchestrator] Post-purchase pitch generation failed:", err);
      session.history.push({ role: "assistant", content: fallbackPitch });
      return { reply: fallbackPitch, metadata, sessionId, traceId };
    }
  }

  async processInteraction(
    userMessage: string,
    context?: Partial<AgentSessionContext>
  ): Promise<{
    reply: string;
    sessionId: string;
    traceId: string;
    actionsTaken: string[];
    checkoutResult?: any;
    upsellOffer?: any;
    metadata?: any;
    auditLogs: any[];
  }> {
    const sessionId = context?.sessionId || `sess_${crypto.randomBytes(6).toString("hex")}`;
    const traceId = context?.traceId || `trc_${crypto.randomBytes(6).toString("hex")}`;
    const actionsTaken: string[] = [];
    let checkoutResult: any = null;
    let upsellOffer: any = null;

    pruneStaleSessions();
    this.ensureSession(sessionId, traceId);

    const session = sessionStore.get(sessionId)!;
    session.traceId = traceId;
    session.lastActiveAt = Date.now();
    session.history.push({ role: "user", content: userMessage });

    // Fallback if OpenAI is not configured
    if (!this.openai) {
       return {
         reply: "⚠️ OpenAI API key is missing or invalid in .env.local. Please add it and restart the server to enable AI mode.",
         sessionId,
         traceId,
         actionsTaken,
         auditLogs: await AuditLogger.getTrace(traceId),
       }
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // fast and cheap
        messages: session.history,
        tools: [
          {
            type: "function",
            function: {
              name: "search_catalog",
              description: "Search for products. Always use simple, single-word keywords (e.g., 'espresso', 'beans', 'grinder', 'syrup') instead of long phrases.",
              parameters: {
                type: "object",
                properties: {
                  query: { type: "string" },
                  maxPriceInr: { type: "number", description: "Maximum price in plain Indian Rupees, e.g. 1000 for \"under ₹1,000\". Do not convert this yourself -- just pass the rupee number the user mentioned." },
                },
              },
            },
          },
          {
            type: "function",
            function: {
              name: "create_order",
              description: "Create an order/checkout session for a specific product SKU. Call this when the user confirms they want to buy.",
              parameters: {
                type: "object",
                properties: {
                  sku: { type: "string", description: "The product SKU to buy" },
                  discountPercent: {
                    type: "number",
                    description: "Only set this if the customer just explicitly accepted a specific bundle/upsell discount you offered them (e.g. a 12% pairing discount). Omit entirely for a normal full-price order.",
                  },
                },
                required: ["sku"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "get_upsell_offer",
              description: "Get upsell recommendations based on a previously purchased SKU. Call this after a successful purchase.",
              parameters: {
                type: "object",
                properties: {
                  baseSku: { type: "string", description: "The SKU of the product they just bought" },
                },
                required: ["baseSku"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "negotiate_discount",
              description: "Use when the customer explicitly asks for a discount, a better price, or wants to negotiate on a SPECIFIC product BEFORE buying it. Do not use this for a bundle/upsell discount you already proposed separately.",
              parameters: {
                type: "object",
                properties: {
                  sku: { type: "string", description: "The product SKU the customer wants a discount on" },
                  requestedDiscountPercent: {
                    type: "number",
                    description: "The exact discount percent the customer stated, e.g. 20 for a request of \"20% off\". Only call this tool once the customer has named a specific number -- never invent one yourself.",
                  },
                },
                required: ["sku", "requestedDiscountPercent"],
              },
            },
          }
        ],
        tool_choice: "auto",
      });

      const message = response.choices[0].message;
      session.history.push(message);

      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments);

          try {
            if (toolCall.function.name === "search_catalog") {
              actionsTaken.push("CATALOG_SEARCH");
              const result = await CatalogTool.searchCatalog({
                query: args.query,
                maxPricePaise: typeof args.maxPriceInr === "number" ? toBasePaiseFromGstInclusive(Math.round(args.maxPriceInr * 100)) : undefined,
                sessionId,
                traceId,
              });
              session.history.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(result.products.map(toAgentFacingProduct)),
              });
            } else if (toolCall.function.name === "create_order") {
              actionsTaken.push("EXECUTE_BOUNDED_CHECKOUT");

              // If the customer just accepted a specific upsell/bundle
              // discount, honor it -- convert the requested percent into
              // paise against the product's real price so GuardrailEngine
              // can validate it exactly like any other discount request.
              let requestedDiscountPaise = 0;
              if (typeof args.discountPercent === "number" && args.discountPercent > 0) {
                const product = await CatalogTool.getProduct(args.sku);
                if (product) {
                  requestedDiscountPaise = Math.round(product.price * (args.discountPercent / 100));
                }
              }

              const result = await CheckoutTool.executeCheckout({
                items: [{ skuOrId: args.sku, quantity: 1 }],
                requestedDiscountPaise,
                buyerAgentId: context?.buyerAgentId || "web_ui_buyer",
                buyerMaxBudgetPaise: context?.buyerMaxBudgetPaise,
                sessionId,
                traceId,
              });
              checkoutResult = result;
              session.checkoutResult = result;
              session.history.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(toAgentFacingCheckoutResult(result)),
              });
            } else if (toolCall.function.name === "get_upsell_offer") {
              actionsTaken.push("UPSELL_RECOMMENDATION");
              const result = await UpsellTool.recommendUpsell({
                currentCartItems: [{ skuOrId: args.baseSku, quantity: 1 }],
                sessionId,
                traceId,
              });
              upsellOffer = result;
              session.upsellOffer = result;
              session.history.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(toAgentFacingUpsell(result)),
              });
            } else if (toolCall.function.name === "negotiate_discount") {
              actionsTaken.push("NEGOTIATION");
              const product = await CatalogTool.getProduct(args.sku);
              if (!product) {
                session.history.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ error: `Product '${args.sku}' not found.` }),
                });
              } else {
                const negotiation = await NegotiateTool.negotiatePrice({
                  productId: args.sku,
                  requestedDiscountPercent: args.requestedDiscountPercent,
                  sessionId,
                  traceId,
                  channel: "chat_ui",
                });
                session.history.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(toAgentFacingNegotiation(negotiation, product.price)),
                });
              }
            } else {
              // Unknown tool
              session.history.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: "Unknown tool call" }),
              });
            }
          } catch (toolErr: any) {
            console.error(`Error executing tool ${toolCall.function.name}:`, toolErr);
            session.history.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({ success: false, error: toolErr.message }),
            });
          }
        }

        // Get the final response from OpenAI after tools
        const finalResponse = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: session.history,
        });
        
        session.history.push(finalResponse.choices[0].message);
        
        const metadata: any = {};
        if (checkoutResult) {
           metadata.checkoutResult = {
             success: checkoutResult.success,
             orderId: checkoutResult.razorpayOrderId || checkoutResult.orderId,
             amount: checkoutResult.amount / 100,
             status: checkoutResult.status,
             guardrailReason: checkoutResult.guardrailReason,
             paymentLink: checkoutResult.paymentLink,
             recovery: checkoutResult.recovery,
             autoAdjustedDiscount: checkoutResult.explainability?.autoAdjustedDiscount || false,
             sku: checkoutResult.items && checkoutResult.items[0] ? checkoutResult.items[0].sku : undefined,
             items: checkoutResult.items,
           };
        }
        if (upsellOffer && upsellOffer.hasUpsell) {
           metadata.upsellOffer = upsellOffer;
        }

        return {
          reply: sanitizeAgentReply(finalResponse.choices[0].message.content || ""),
          sessionId,
          traceId,
          actionsTaken,
          checkoutResult,
          upsellOffer,
          metadata,
          auditLogs: await AuditLogger.getTrace(traceId),
        };
      }

      return {
        reply: sanitizeAgentReply(message.content || ""),
        sessionId,
        traceId,
        actionsTaken,
        metadata: {},
        auditLogs: await AuditLogger.getTrace(traceId),
      };

    } catch (error: any) {
      console.error("OpenAI Error:", error);
      return {
        reply: `Oops, something went wrong: ${error.message}`,
        sessionId,
        traceId,
        actionsTaken,
        auditLogs: await AuditLogger.getTrace(traceId),
      };
    }
  }
}
