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
    let results: MockProduct[] = [];

    try {
      if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost:5432/razoragent_db")) {
        const dbProducts = await prisma.product.findMany({
          where: {
            isActive: true,
            ...(params.category ? { category: { equals: params.category, mode: "insensitive" } } : {}),
            ...(params.inStockOnly ? { inventoryCount: { gt: 0 } } : {}),
            ...(params.maxPricePaise ? { price: { lte: params.maxPricePaise } } : {}),
            ...(params.query
              ? {
                  OR: [
                    { title: { contains: params.query, mode: "insensitive" } },
                    { description: { contains: params.query, mode: "insensitive" } },
                    { sku: { contains: params.query, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
        });
        if (dbProducts.length > 0) {
          results = dbProducts.map((p, index) => ({
            id: p.id,
            sku: p.sku,
            title: p.title,
            description: p.description,
            category: p.category,
            price: p.price,
            costPrice: p.costPrice,
            inventoryCount: p.inventoryCount,
            tags: p.tags,
            imageUrl: p.imageUrl || undefined,
            isActive: p.isActive,
          }));
        }
      }
    } catch {
      // Fallback
    }

    if (results.length === 0) {
      results = SEED_PRODUCTS.filter((p) => {
        if (!p.isActive) return false;
        if (params.inStockOnly && p.inventoryCount <= 0) return false;
        if (params.maxPricePaise && p.price > params.maxPricePaise) return false;
        if (params.category && p.category.toLowerCase() !== params.category.toLowerCase()) return false;
        if (params.query) {
          const q = params.query.toLowerCase();
          const matchesTitle = p.title.toLowerCase().includes(q);
          const matchesDesc = p.description.toLowerCase().includes(q);
          const matchesSku = p.sku.toLowerCase().includes(q);
          const matchesTags = p.tags.some((t) => t.toLowerCase().includes(q));
          return matchesTitle || matchesDesc || matchesSku || matchesTags;
        }
        return true;
      });
    }

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
    try {
      if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost:5432/razoragent_db")) {
        const found = await prisma.product.findFirst({
          where: {
            OR: [{ id: skuOrId }, { sku: { equals: skuOrId, mode: "insensitive" } }],
            isActive: true,
          },
        });
        if (found) {
          return {
            id: found.id,
            sku: found.sku,
            title: found.title,
            description: found.description,
            category: found.category,
            price: found.price,
            costPrice: found.costPrice,
            inventoryCount: found.inventoryCount,
            tags: found.tags,
            imageUrl: found.imageUrl || undefined,
            isActive: found.isActive,
          };
        }
      }
    } catch {
      // Fallback
    }

    const normalized = skuOrId.toLowerCase();
    const local = SEED_PRODUCTS.find(
      (p) => p.sku.toLowerCase() === normalized || p.id.toLowerCase() === normalized
    );
    return local || null;
  }
}
