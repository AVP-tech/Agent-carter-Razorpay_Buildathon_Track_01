import { NextRequest, NextResponse } from "next/server";
import { AuditLogger } from "@/lib/auditLogger";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const traceId = searchParams.get("traceId");
  const sessionId = searchParams.get("sessionId");

  if (traceId || sessionId) {
    const trace = await AuditLogger.getTrace((traceId || sessionId)!);
    return NextResponse.json({ count: trace.length, logs: trace });
  }

  const allLogs = await AuditLogger.getLedger();
  return NextResponse.json({ count: allLogs.length, logs: allLogs });
}
