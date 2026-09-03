import { NextRequest, NextResponse } from "next/server";
import { CatalogTool } from "@/agent/tools/catalogTool";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get("q") || undefined;
  const category = searchParams.get("category") || undefined;
  const inStockOnly = searchParams.get("inStock") === "true";
  const maxPricePaise = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;

  const result = await CatalogTool.searchCatalog({
    query,
    category,
    inStockOnly,
    maxPricePaise,
  });

  return NextResponse.json(result);
}
