import { NextRequest, NextResponse } from "next/server";
import { CatalogTool } from "@/agent/tools/catalogTool";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      // Body might be empty
    }
    
    // Explicitly trace as A2A
    const sessionId = body.sessionId || `a2a_sess_${crypto.randomBytes(4).toString("hex")}`;
    const traceId = body.traceId || `a2a_trc_${crypto.randomBytes(4).toString("hex")}`;

    const result = await CatalogTool.searchCatalog({
      query: body.query,
      category: body.category,
      inStockOnly: body.inStockOnly,
      maxPricePaise: body.maxPricePaise,
      sessionId,
      traceId,
      channel: "a2a_api",
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
