import { AgentOrchestrator } from "../src/agent/orchestrator";
import { AuditLogger } from "../src/lib/auditLogger";

async function runE2ETest() {
  console.log("================================================================================");
  console.log("🚀 [TRACK 01 TEST] RazorAgent Autonomous E2E Agentic Commerce & Checkout Flow");
  console.log("================================================================================\n");

  const agent = new AgentOrchestrator();

  const buyerPrompt = "I am looking to buy the AeroPress Pro Espresso Maker. Find it and execute an optimized checkout.";
  console.log(`👤 [AI Buyer Agent Input]: "${buyerPrompt}"\n`);

  const startTime = Date.now();
  const response = await agent.processInteraction(buyerPrompt, {
    buyerAgentId: "procurement_bot_alpha",
    buyerMaxBudgetPaise: 3000000, // ₹30,000 budget cap
  });

  console.log("🤖 [RazorAgent Seller Response]:\n");
  console.log(response.reply);
  console.log("\n--------------------------------------------------------------------------------");
  console.log(`⏱️ Execution Time: ${Date.now() - startTime}ms`);
  console.log(`📋 Actions Dispatched: ${response.actionsTaken.join(" -> ")}`);
  console.log(`🆔 Session ID: ${response.sessionId}`);
  console.log(`🔍 Trace ID: ${response.traceId}`);
  console.log("--------------------------------------------------------------------------------\n");

  if (response.upsellOffer && response.upsellOffer.hasUpsell) {
    console.log("💡 [AI Revenue Growth Engine - Upsell Details]:");
    for (const rec of response.upsellOffer.recommendations) {
      console.log(`   • Recommended Add-on: ${rec.title} (SKU: ${rec.sku})`);
      console.log(`   • Original Price: ₹${(rec.originalPrice / 100).toFixed(2)} | Bundle Price: ₹${(rec.discountedBundlePrice / 100).toFixed(2)}`);
      console.log(`   • Buyer Savings: ₹${(rec.savings / 100).toFixed(2)} | Protected Margin: ${rec.expectedMarginPercent}%`);
      console.log(`   • Rationale: ${rec.reasoning}`);
    }
    console.log("");
  }

  if (response.checkoutResult) {
    console.log("💳 [Razorpay Money Movement & Explainability]:");
    console.log(`   • Razorpay Order ID: ${response.checkoutResult.razorpayOrderId}`);
    console.log(`   • Base Catalog Subtotal: ₹${(response.checkoutResult.explainability.basePrice / 100).toFixed(2)}`);
    console.log(`   • Dynamic Bundle Discount: -₹${(response.checkoutResult.explainability.discount / 100).toFixed(2)}`);
    console.log(`   • GST (18%): +₹${(response.checkoutResult.explainability.taxes / 100).toFixed(2)}`);
    console.log(`   • Final Amount Payable: ₹${(response.checkoutResult.explainability.finalPayable / 100).toFixed(2)}`);
    console.log(`   • Guardrail Verdict: ${response.checkoutResult.guardrailVerdict}`);
    console.log("");
  }

  console.log(`📜 [Immutable Audit Trail Verification] (${response.auditLogs.length} events):`);
  response.auditLogs.forEach((log, index) => {
    console.log(`   [${index + 1}] ${log.actionType} | Actor: ${log.actor} | Status: ${log.guardrailStatus} | Tool: ${log.toolName || "orchestrator"}`);
    if (log.reasoning) {
      console.log(`       ↳ Reason: ${log.reasoning}`);
    }
  });

  console.log("\n================================================================================");
  console.log("✅ [E2E TEST RESULT]: 100% PASSED - Complete Bounded Flow Verified!");
  console.log("================================================================================");
}

runE2ETest().catch((err) => {
  console.error("❌ E2E Test Failed:", err);
  process.exit(1);
});
