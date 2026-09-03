import prisma from "./prisma";
import { AuditRecord } from "../types/guardrail";
import crypto from "crypto";

export class AuditLogger {
  private static inMemoryLedger: (AuditRecord & { id: string; createdAt: Date })[] = [];

  /**
   * Log an immutable agent action / guardrail verdict / money movement
   */
  static async log(record: AuditRecord): Promise<string> {
    const id = `audit_${crypto.randomUUID()}`;
    const entry = {
      id,
      ...record,
      createdAt: new Date(),
    };

    // Keep in memory buffer
    this.inMemoryLedger.push(entry);

    // Persist to PostgreSQL if database connection is available
    try {
      if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost:5432/razoragent_db")) {
        await prisma.auditLog.create({
          data: {
            id,
            sessionId: record.sessionId,
            traceId: record.traceId,
            orderId: record.orderId || null,
            actionType: record.actionType,
            actor: record.actor,
            reasoning: record.reasoning || null,
            toolName: record.toolName || null,
            toolInput: record.toolInput ? JSON.parse(JSON.stringify(record.toolInput)) : null,
            toolOutput: record.toolOutput ? JSON.parse(JSON.stringify(record.toolOutput)) : null,
            guardrailStatus: record.guardrailStatus,
            guardrailDetails: record.guardrailDetails ? JSON.parse(JSON.stringify(record.guardrailDetails)) : null,
            executionTimeMs: record.executionTimeMs || null,
          },
        });
      }
    } catch (err) {
      // Non-blocking log persistence warning
      console.warn("[AuditLogger] DB write skipped (fallback to in-memory ledger):", (err as any)?.message);
    }

    return id;
  }

  /**
   * Retrieve all audit logs for a given session or trace
   */
  static async getTrace(sessionIdOrTraceId: string): Promise<any[]> {
    try {
      if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost:5432/razoragent_db")) {
        const dbLogs = await prisma.auditLog.findMany({
          where: {
            OR: [
              { sessionId: sessionIdOrTraceId },
              { traceId: sessionIdOrTraceId },
            ],
          },
          orderBy: { createdAt: "asc" },
        });
        if (dbLogs.length > 0) return dbLogs;
      }
    } catch {
      // Fallback
    }

    return this.inMemoryLedger.filter(
      (log) =>
        log.sessionId === sessionIdOrTraceId || log.traceId === sessionIdOrTraceId
    );
  }

  /**
   * Retrieve entire immutable audit ledger
   */
  static getLedger(): any[] {
    return this.inMemoryLedger;
  }
}
