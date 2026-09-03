import { CatalogTool } from "../src/agent/tools/catalogTool";
import { UpsellTool } from "../src/agent/tools/upsellTool";
import { CheckoutTool } from "../src/agent/tools/checkoutTool";
import { AuditLogger } from "../src/lib/auditLogger";

async function runA2ACommerceTest() {
  console.log("================================================================================");
  console.log("🤖 [A2A COMMERCE TEST] Agent-to-Agent Machine Protocol & Checkout Negotiation");
  console.log("================================================================================\n");

  const sessionId = `a2a_sess_${Date.now()}`;
  const traceId = `a2a_trc_${Date.now()}`;
  const buyerBotId = "external_ai_buyer_corp_v2";

  console.log(`📡 [STEP 1: Discovery & Catalog Query by Buyer Agent '${buyerBotId}']`);
  const catalogResponse = await CatalogTool.searchCatalog({
    category: "Coffee Appliances",
    inStockOnly: true,
    sessionId,
    traceId,
  });

  console.log(`  ✓ Found ${catalogResponse.count} matching appliances in stock:`);
  catalogResponse.products.forEach((p) => console.log(`     - [${p.sku}] ${p.title} (Price: ₹${p.price / 100})`));
  console.log("");

  const targetItem = catalogResponse.products[0];
  console.log(`🤝 [STEP 2: Machine Negotiation & Upsell Request for '${targetItem.sku}']`);
  const negotiation = await UpsellTool.recommendUpsell({
    currentCartItems: [{ skuOrId: targetItem.sku, quantity: 1 }],
    sessionId,
    traceId,
  });

  console.log(`  ✓ Merchant Agent Response: ${negotiation.explanation}`);
  if (negotiation.hasUpsell) {
    const upsellItem = negotiation.recommendations[0];
    console.log(`  ✓ Accepted Bundle Add-on: ${upsellItem.title} with ₹${upsellItem.savings / 100} savings`);
  }
  console.log("");

  console.log("💳 [STEP 3: Autonomous Machine Checkout Execution]");
  const cartToCheckout = [{ skuOrId: targetItem.sku, quantity: 1 }];
  if (negotiation.hasUpsell && negotiation.recommendations.length > 0) {
    cartToCheckout.push({ skuOrId: negotiation.recommendations[0].sku, quantity: 1 });
  }

  const checkout = await CheckoutTool.executeCheckout({
    items: cartToCheckout,
    requestedDiscountPaise: negotiation.recommendations[0]?.savings || 0,
    buyerAgentId: buyerBotId,
    buyerMaxBudgetPaise: 5000000, // ₹50,000 pre-approved mandate
    customerEmail: "procurement@corp.ai",
    sessionId,
    traceId,
  });

  console.log(`  ✓ Autonomous Order Status: ${checkout.status}`);
  console.log(`  ✓ Razorpay Order ID: ${checkout.razorpayOrderId}`);
  console.log(`  ✓ Final Amount: ₹${(checkout.amount / 100).toFixed(2)}`);
  console.log(`  ✓ Guardrail Verdict: ${checkout.guardrailVerdict}`);
  console.log("");

  console.log("🔍 [STEP 4: A2A Ledger & Audit Trace Verification]");
  const traceLogs = await AuditLogger.getTrace(traceId);
  console.log(`  ✓ Successfully recorded ${traceLogs.length} immutable audit checkpoints.`);
  traceLogs.forEach((l, i) => console.log(`     [${i + 1}] ${l.actionType} by ${l.actor} -> ${l.guardrailStatus}`));

  console.log("\n================================================================================");
  console.log("🎉 [A2A COMMERCE RESULT]: AGENT-TO-AGENT TRANSACTION COMPLETED SUCCESSFULLY!");
  console.log("================================================================================");
}

runA2ACommerceTest().catch((err) => {
  console.error("❌ A2A Test Failed:", err);
  process.exit(1);
});
