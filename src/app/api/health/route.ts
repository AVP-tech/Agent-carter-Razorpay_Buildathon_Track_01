import { NextResponse } from "next/server";
import { warmupDb } from "@/lib/prisma";

export async function GET() {
  const result = await warmupDb();
  return NextResponse.json({
    status: result.ok ? "healthy" : "degraded",
    database: result,
    timestamp: new Date().toISOString(),
  }, { status: result.ok ? 200 : 503 });
}
