import prisma from "../../lib/prisma";
import { AuditLogger } from "../../lib/auditLogger";

export interface MockProduct {
  id: string;
  sku: string;
  title: string;
  description: string;
  category: string;
  price: number; // in paise
  costPrice: number; // in paise
  inventoryCount: number;
  tags: string[];
  imageUrl?: string;
  isActive: boolean;
}

export const SEED_PRODUCTS: MockProduct[] = [
  {
    id: "prod_espresso_01",
    sku: "ESPRESSO-MACH-X1",
    title: "AeroPress Pro Precision Espresso Maker",
    description: "Commercial grade dual-boiler automated coffee brewer with PID temperature control.",
    category: "Coffee Appliances",
    price: 1499900, // INR 14,999.00
    costPrice: 900000, // INR 9,000.00 (40% margin)
    inventoryCount: 15,
    tags: ["espresso", "coffee", "brewer", "premium"],
    imageUrl: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=700&auto=format&fit=crop&q=80",
    isActive: true,
  },
  {
    id: "prod_beans_02",
    sku: "BEANS-ETHIOPIA-500G",
    title: "Ethiopian Yirgacheffe Single Origin Beans (500g)",
    description: "Freshly medium-roasted specialty grade arabica coffee beans with citrus notes.",
    category: "Coffee Beans",
    price: 89900, // INR 899.00
    costPrice: 45000, // INR 450.00 (50% margin)
    inventoryCount: 100,
    tags: ["beans", "arabica", "specialty", "ethiopia"],
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=700&auto=format&fit=crop&q=80",
    isActive: true,
  },
  {
    id: "prod_beans_colombia_09",
    sku: "BEANS-COLOMBIA-250G",
    title: "Colombian Supremo Beans (250g)",
    description: "Smooth medium roast with caramel and toasted almond notes -- a lighter everyday-format bag alongside the Ethiopian single origin.",
    category: "Coffee Beans",
    price: 74900, // INR 749.00 (~INR 883.82 incl. 18% GST -- the catalog's one Coffee Beans SKU under a GST-inclusive INR 1,000 budget)
    costPrice: 35000, // INR 350.00 (53% margin)
    inventoryCount: 120,
    tags: ["beans", "arabica", "colombia", "everyday", "budget"],
    isActive: true,
  },
  {
    id: "prod_grinder_03",
    sku: "GRINDER-CONICAL-PRO",
    title: "Precision Conical Burr Coffee Grinder",
    description: "40mm stainless steel burrs with 30 micro-adjust steps for ultra-uniform grind.",
    category: "Coffee Accessories",
    price: 449900, // INR 4,499.00
    costPrice: 260000, // INR 2,600.00 (42% margin)
    inventoryCount: 22,
    tags: ["grinder", "burr", "accessories"],
    imageUrl: "https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=700&auto=format&fit=crop&q=80",
    isActive: true,
  },
  {
    id: "prod_syrup_04",
    sku: "SYRUP-VANILLA-250ML",
    title: "Artisanal Madagascar Vanilla Syrup (250ml)",
    description: "Organic cane sugar infused with pure Bourbon vanilla bean extract.",
    category: "Syrups & Flavors",
    price: 49900, // INR 499.00
    costPrice: 20000, // INR 200.00 (60% margin)
    inventoryCount: 50,
    tags: ["syrup", "vanilla", "flavor", "sweetener"],
    imageUrl: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=700&auto=format&fit=crop&q=80",
    isActive: true,
  },
  {
    id: "prod_descaler_05",
    sku: "CLEAN-DESCALER-BIO",
    title: "Eco-Friendly Organic Espresso Descaling Kit",
    description: "Plant-based citric acid descaling fluid to keep boiler systems scale-free.",
    category: "Maintenance",
    price: 59900, // INR 599.00
    costPrice: 22000, // INR 220.00 (63% margin)
    inventoryCount: 0, // OUT OF STOCK (For graceful failure testing)
    tags: ["cleaning", "maintenance", "descaler"],
    imageUrl: "https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=700&auto=format&fit=crop&q=80",
    isActive: true,
  },
  {
    id: "prod_frother_07",
    sku: "FROTHER-MILK-ELEC",
    title: "Electric Handheld Milk Frother Wand",
    description: "Rechargeable stainless-steel whisk for silky microfoam on lattes and cappuccinos in under 30 seconds.",
    category: "Coffee Accessories",
    price: 89900, // INR 899.00
    costPrice: 42000, // INR 420.00 (53% margin)
    inventoryCount: 60,
    tags: ["frother", "milk", "latte", "accessories"],
    imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=700&auto=format&fit=crop&q=80",
    isActive: true,
  },
  {
    id: "prod_coldbrew_08",
    sku: "COLDBREW-CONC-750ML",
    title: "Nitro Cold Brew Concentrate (750ml)",
    description: "Slow-steeped 20-hour cold brew concentrate, double strength -- just add water, milk or ice.",
    category: "Cold Brew",
    price: 64900, // INR 649.00
    costPrice: 28000, // INR 280.00 (57% margin)
    inventoryCount: 40,
    tags: ["cold brew", "nitro", "ready-to-drink"],
    imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=700&auto=format&fit=crop&q=80",
    isActive: true,
  },
  {
    id: "prod_industrial_06",
    sku: "COMMERCIAL-ROASTER-50KG",
    title: "Industrial 50KG High-Capacity Coffee Roasting Drum",
    description: "Commercial factory-grade gas burner roaster for mega roasting plants.",
    category: "Industrial Equipment",
    price: 85000000, // INR 850,000.00 (Exceeds autonomous spending limit)
    costPrice: 50000000, // INR 500,000.00
    inventoryCount: 2,
    tags: ["industrial", "commercial", "roaster"],
    imageUrl: "https://images.unsplash.com/photo-1507582020432-2a3bc418123f?w=700&auto=format&fit=crop&q=80",
    isActive: true,
  },
];

export class CatalogTool {
  /**
   * Search catalog by keyword, SKU, or category
   */
  static async searchCatalog(params: {
    query?: string;
    category?: string;
    maxPricePaise?: number;
    inStockOnly?: boolean;
    sessionId?: string;
    traceId?: string;
    channel?: string;
  }): Promise<{
    count: number;
    products: MockProduct[];
  }> {
    const startTime = Date.now();

    // The agent-readable catalog is a deterministic, code-owned data
    // contract (SEED_PRODUCTS) -- NOT whatever happens to be sitting in the
    // database. The DB is used purely as a persistence layer for orders and
    // the audit trail (see ensureInDb below), so it can carry unrelated
    // legacy/seed rows without ever leaking into what shoppers or the agent
    // see as "the catalog".
    const results = SEED_PRODUCTS.filter((p) => {
      if (!p.isActive) return false;
      if (params.inStockOnly && p.inventoryCount <= 0) return false;
      if (params.maxPricePaise && p.price > params.maxPricePaise) return false;
      if (params.category && p.category.toLowerCase() !== params.category.toLowerCase()) return false;
      if (params.query) {
        const qWords = params.query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        if (qWords.length === 0) return true; // fallback if query is too short

        return qWords.some(q => {
          const matchesTitle = p.title.toLowerCase().includes(q);
          const matchesDesc = p.description.toLowerCase().includes(q);
          const matchesSku = p.sku.toLowerCase().includes(q);
          const matchesTags = p.tags.some((t) => t.toLowerCase().includes(q));
          return matchesTitle || matchesDesc || matchesSku || matchesTags;
        });
      }
      return true;
    });

    if (params.sessionId && params.traceId) {
      await AuditLogger.log({
        sessionId: params.sessionId,
        traceId: params.traceId,
        channel: params.channel,
        actionType: "CATALOG_SEARCH",
        actor: "BUYER_AGENT",
        reasoning: `Queried catalog with criteria: query='${params.query || "*"}'`,
        toolInput: params,
        toolOutput: { matchCount: results.length, topMatches: results.slice(0, 3).map((r) => r.sku) },
        guardrailStatus: "PASSED",
        executionTimeMs: Date.now() - startTime,
      });
    }

    return {
      count: results.length,
      products: results,
    };
  }

  /**
   * Get single product by SKU or ID
   */
  static async getProduct(skuOrId: string): Promise<MockProduct | null> {
    // Same rationale as searchCatalog: SEED_PRODUCTS is the single source of
    // truth for product identity/pricing/stock, regardless of what rows
    // exist in the database.
    const normalized = skuOrId.toLowerCase();
    const local = SEED_PRODUCTS.find(
      (p) => p.sku.toLowerCase() === normalized || p.id.toLowerCase() === normalized
    );
    return local || null;
  }

  /**
   * Best-effort self-heal: make sure this product actually has a matching
   * row in the database before an Order/OrderItem/AuditLog write tries to
   * foreign-key against it. Without this, a DB that was never seeded (or
   * has drifted from the in-memory catalog) causes every checkout's order
   * persistence to fail with a FOREIGN KEY constraint violation while the
   * checkout itself silently "succeeds" via the in-memory fallback --
   * quietly breaking the audit trail's DB durability.
   */
  /**
   * Actually deplete stock on a successful order instead of leaving
   * inventoryCount as a permanently static fixture. Mutates the in-memory
   * SEED_PRODUCTS entry (the source of truth every read goes through) and
   * best-effort mirrors the new count into the DB row for persistence --
   * catalog reads never depend on the DB value, so a failed mirror here
   * can't desync what shoppers or the agent see.
   */
  static async decrementInventory(sku: string, quantity: number): Promise<void> {
    const product = SEED_PRODUCTS.find((p) => p.sku.toLowerCase() === sku.toLowerCase());
    if (!product) return;

    product.inventoryCount = Math.max(0, product.inventoryCount - quantity);

    try {
      if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost:5432/razoragent_db")) {
        await prisma.product.updateMany({
          where: { sku: product.sku },
          data: { inventoryCount: product.inventoryCount },
        });
      }
    } catch (err) {
      console.warn("[CatalogTool] Inventory DB mirror skipped:", (err as any)?.message);
    }
  }

  static async ensureInDb(product: MockProduct): Promise<void> {
    try {
      if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("localhost:5432/razoragent_db")) {
        return;
      }
      await prisma.product.upsert({
        where: { sku: product.sku },
        update: {},
        create: {
          id: product.id,
          sku: product.sku,
          title: product.title,
          description: product.description,
          category: product.category,
          price: product.price,
          costPrice: product.costPrice,
          inventoryCount: product.inventoryCount,
          tags: product.tags,
          imageUrl: product.imageUrl,
          isActive: product.isActive,
        },
      });
    } catch (err) {
      console.warn("[CatalogTool] ensureInDb skipped:", (err as any)?.message);
    }
  }
}
