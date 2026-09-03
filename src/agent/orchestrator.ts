import OpenAI from "openai";
import { CatalogTool } from "./tools/catalogTool";
import { UpsellTool } from "./tools/upsellTool";
import { CheckoutTool } from "./tools/checkoutTool";
import { FailureRecoveryTool } from "./tools/failureRecoveryTool";
import { AuditLogger } from "../lib/auditLogger";
import crypto from "crypto";

const openaiApiKey = process.env.OPENAI_API_KEY || "";
const hasValidOpenAI = openaiApiKey.startsWith("sk-") && !openaiApiKey.includes("YourOpenAiKey");

const sessionStore = new Map<
  string,
  {
    history: OpenAI.Chat.ChatCompletionMessageParam[];
    traceId: string;
    checkoutResult?: any;
    upsellOffer?: any;
  }
>();

export interface AgentSessionContext {
  sessionId: string;
  traceId: string;
  buyerAgentId?: string;
  buyerMaxBudgetPaise?: number;
}

export class AgentOrchestrator {
  private openai: OpenAI | null = null;

  constructor() {
    if (hasValidOpenAI) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
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

    if (!sessionStore.has(sessionId)) {
      sessionStore.set(sessionId, {
        history: [
          {
            role: "system",
            content: `You are Agent Carter, a cutting-edge Autonomous Commerce Engine for a specialty coffee brand.

PERSONA RULES:
1. Tone: Professional, sharp, and concise. Think enterprise-grade AI assistant — clear, helpful, no fluff.
2. Language: Always respond in clean, professional English. Note: You also understand Hinglish, so if a user writes in Hinglish, understand their intent perfectly but still respond in English.
3. Formatting: Never output raw JSON to the user. Always present information in a clean, human-readable format with proper formatting.

YOUR CAPABILITIES:
1. Use 'search_catalog' to find products when the user asks about products, categories, or prices.
2. Use 'create_order' when the user explicitly confirms they want to buy a product. After creating the order, tell them to click the "Pay Now" button that appears below.
3. Use 'get_upsell_offer' AFTER a successful payment is confirmed by the system to recommend complementary products.

IMPORTANT: Keep responses concise. Do not use excessive markdown headers or hashtags. Write naturally as a helpful commerce assistant.`,
          },
        ],
        traceId,
      });
    }

    const session = sessionStore.get(sessionId)!;
    session.traceId = traceId;
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
              description: "Search for products in the catalog by query, e.g., 'espresso', 'beans', 'grinder'.",
              parameters: {
                type: "object",
                properties: {
                  query: { type: "string" },
                  maxPricePaise: { type: "number", description: "Maximum price in paise (INR * 100)" },
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
                maxPricePaise: args.maxPricePaise,
                sessionId,
                traceId,
              });
              session.history.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(result.products),
              });
            } else if (toolCall.function.name === "create_order") {
              actionsTaken.push("EXECUTE_BOUNDED_CHECKOUT");
              const result = await CheckoutTool.executeCheckout({
                items: [{ skuOrId: args.sku, quantity: 1 }],
                requestedDiscountPaise: 0,
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
                content: JSON.stringify(result),
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
                content: JSON.stringify(result),
              });
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
             guardrailReason: checkoutResult.guardrailReason
           };
        }
        if (upsellOffer && upsellOffer.hasUpsell) {
           metadata.upsellOffer = upsellOffer;
        }

        return {
          reply: finalResponse.choices[0].message.content || "",
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
        reply: message.content || "",
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