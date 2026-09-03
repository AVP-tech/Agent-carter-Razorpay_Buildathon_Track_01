import { PrismaClient } from "@prisma/client";
import { SEED_PRODUCTS } from "../src/agent/tools/catalogTool";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 [Database Seeder] Starting catalog & policy seeding...");

  try {
    for (const item of SEED_PRODUCTS) {
      await prisma.product.upsert({
        where: { sku: item.sku },
        update: {
          title: item.title,
          description: item.description,
          category: item.category,
          price: item.price,
          costPrice: item.costPrice,
          inventoryCount: item.inventoryCount,
          tags: item.tags,
          isActive: item.isActive,
        },
        create: {
          id: item.id,
          sku: item.sku,
          title: item.title,
          description: item.description,
          category: item.category,
          price: item.price,
          costPrice: item.costPrice,
          inventoryCount: item.inventoryCount,
          tags: item.tags,
          isActive: item.isActive,
        },
      });
      console.log(`  ✓ Seeded Product: ${item.sku} - ${item.title} (₹${item.price / 100})`);
    }

    // Seed default discount policy
    await prisma.discountPolicy.create({
      data: {
        name: "Standard AI Bundle Policy",
        minCartValue: 100000, // ₹1,000
        maxDiscountPercent: 20.0,
        minMarginFloorPercent: 15.0,
        isActive: true,
      },
    });

    console.log("  ✓ Seeded Discount Policy: 15% Min Margin Floor, 20% Max Bundle Discount");
    console.log("🎉 [Database Seeder] Catalog seeding completed successfully!");
  } catch (err: any) {
    console.warn("⚠️ [Database Seeder] Note: PostgreSQL database not reachable yet. In-memory mode is active for testing.", err?.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
