const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function runDemo() {
  console.log("\n=======================================================");
  console.log("🤖 [BUYER AI] Starting Autonomous A2A Negotiation Demo");
  console.log("=======================================================\n");

  // --- STEP 0: Warm up DB ---
  console.log("[SYSTEM] Warming up Neon database...");
  try {
    const warmup = await fetch(`${BASE_URL}/api/health`);
    const warmupData = await warmup.json();
    console.log(`[SYSTEM] DB Status: ${warmupData.status} (${warmupData.database.latencyMs}ms)\n`);
  } catch (e) {
    console.error("❌ Failed to connect. Is the Next.js server running? Set BASE_URL env var if not on port 3000.");
    process.exit(1);
  }

  // --- STEP 1: Fetch Catalog ---
  console.log("[BUYER AI] Fetching catalog from Merchant Agent...");
  const catalogRes = await fetch(`${BASE_URL}/api/a2a/catalog`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inStockOnly: true })
  });

  const catalogData = await catalogRes.json() as any;
  const targetProduct = catalogData.data?.products?.[0];

  if (!targetProduct) {
    console.log("❌ No products found in catalog.");
    return;
  }

  console.log(`[MERCHANT AGENT] Catalog returned. Found ${catalogData.data.count} items.`);
  console.log(`[BUYER AI] Targeting product: ${targetProduct.title} (₹${targetProduct.price / 100})`);

  // --- STEP 2: Successful Negotiation ---
  console.log("\n[BUYER AI] Requesting a reasonable 10% discount...");
  const negSuccessRes = await fetch(`${BASE_URL}/api/a2a/negotiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      productId: targetProduct.id, 
      requestedDiscountPercent: 10,
      buyerContext: "Bulk buyer AI representing enterprise client"
    })
  });
  const negSuccessData = await negSuccessRes.json() as any;
  
  if (negSuccessData.decision === "accepted") {
    console.log(`✅ [MERCHANT AGENT] ACCEPTED: ${negSuccessData.reasoning}`);
    console.log(`   Final Negotiated Price: ₹${negSuccessData.finalPrice / 100}`);
  } else {
    console.log(`⚠️ [MERCHANT AGENT] ${negSuccessData.decision?.toUpperCase()}: ${negSuccessData.reasoning}`);
  }

  // --- STEP 3: Checkout with the accepted terms ---
  console.log(`\n[BUYER AI] Proceeding to autonomous checkout for 1 unit...`);
  const discountPaise = negSuccessData.decision === "accepted" 
    ? targetProduct.price - negSuccessData.finalPrice 
    : 0;

  const checkoutRes = await fetch(`${BASE_URL}/api/a2a/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      cart: [{ productId: targetProduct.id, quantity: 1 }],
      requestedDiscountPaise: discountPaise,
      buyerAgentId: "demo-buyer-ai-agent-v1"
    })
  });
  const checkoutData = await checkoutRes.json() as any;
  
  if (checkoutData.success) {
    console.log(`✅ [MERCHANT AGENT] Checkout successful! Guardrails passed.`);
    console.log(`   Razorpay Order ID: ${checkoutData.order.razorpayOrderId}`);
    console.log(`   Total Payable: ₹${checkoutData.order.amount / 100}`);
    if (checkoutData.upsellOffer) {
      console.log(`   💡 Upsell Offer: ${checkoutData.upsellOffer.explanation}`);
      checkoutData.upsellOffer.recommendations?.forEach((r: any) => {
        console.log(`      → ${r.title}: ₹${r.originalPrice/100} → ₹${r.discountedBundlePrice/100} (save ₹${r.savings/100})`);
      });
    }
  } else {
    console.log(`❌ [MERCHANT AGENT] Checkout failed: ${checkoutData.error}`);
  }

  // --- STEP 4: Illegal Negotiation ---
  console.log("\n=======================================================");
  console.log("🤖 [BUYER AI] Scenario 2: Hostile/Greedy Negotiation Test");
  console.log("=======================================================\n");
  
  console.log("[BUYER AI] Requesting an illegal 60% discount...");
  const negFailRes = await fetch(`${BASE_URL}/api/a2a/negotiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      productId: targetProduct.id, 
      requestedDiscountPercent: 60,
    })
  });
  const negFailData = await negFailRes.json() as any;
  
  console.log(`🚫 [MERCHANT AGENT] ${negFailData.decision?.toUpperCase() || 'ERROR'}: ${negFailData.reasoning || negFailData.error}`);

  // --- STEP 5: Graceful Failure Recovery (live, over the same HTTP API) ---
  console.log("\n=======================================================");
  console.log("🛟 [BUYER AI] Scenario 3: Graceful Failure Recovery");
  console.log("=======================================================\n");

  console.log("[BUYER AI] Attempting to check out an out-of-stock item ('CLEAN-DESCALER-BIO')...");
  const stockOutRes = await fetch(`${BASE_URL}/api/a2a/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cart: [{ productId: "CLEAN-DESCALER-BIO", quantity: 1 }],
      buyerAgentId: "demo-buyer-ai-agent-v1",
    })
  });
  const stockOutData = await stockOutRes.json() as any;

  console.log(`🚫 [MERCHANT AGENT] Checkout blocked: ${stockOutData.error}`);
  if (stockOutData.recovery?.suggestedAlternative) {
    const alt = stockOutData.recovery.suggestedAlternative;
    console.log(`✅ [MERCHANT AGENT] Gracefully recovered — strategy: ${stockOutData.recovery.strategy}`);
    console.log(`   ${stockOutData.recovery.message}`);
    console.log(`   → Suggested alternative: ${alt.title} (SKU: ${alt.sku}, ₹${(alt.price / 100).toFixed(2)}, ${alt.inventoryCount} in stock)`);
  }

  console.log("\n[BUYER AI] Attempting to check out an item priced above the ₹25,000 autonomous ceiling...");
  const overBudgetRes = await fetch(`${BASE_URL}/api/a2a/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cart: [{ productId: "COMMERCIAL-ROASTER-50KG", quantity: 1 }],
      buyerAgentId: "demo-buyer-ai-agent-v1",
      customerEmail: "finance-approver@enterprise.com",
    })
  });
  const overBudgetData = await overBudgetRes.json() as any;

  console.log(`🚫 [MERCHANT AGENT] Checkout blocked: ${overBudgetData.error}`);
  if (overBudgetData.recovery?.recovered) {
    console.log(`✅ [MERCHANT AGENT] Gracefully recovered — strategy: ${overBudgetData.recovery.strategy}`);
    console.log(`   Escalation link generated for human approval: ${overBudgetData.paymentLink}`);
  }

  // --- STEP 6: Verify Audit Trail ---
  console.log("\n=======================================================");
  console.log("📋 [SYSTEM] Verifying Audit Trail");
  console.log("=======================================================\n");

  const auditRes = await fetch(`${BASE_URL}/api/agent/audit`);
  const auditData = await auditRes.json() as any;
  console.log(`[AUDIT] Total events in ledger: ${auditData.count}`);
  if (auditData.logs && auditData.logs.length > 0) {
    const recent = auditData.logs.slice(-6);
    recent.forEach((log: any) => {
      const channel = log.toolInput?.channel || "unknown";
      console.log(`  → [${log.actionType}] ${log.reasoning?.slice(0, 80) || "N/A"} (channel: ${channel})`);
    });
  }
  console.log("\n✅ Demo complete. Open http://localhost:3000/audit in browser to see the full trail.\n");
}

runDemo();
