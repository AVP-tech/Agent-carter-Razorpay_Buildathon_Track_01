import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "RazorAgent Engine",
    version: "1.0.0",
    testMode: true,
  });
}
