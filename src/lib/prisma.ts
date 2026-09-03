import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return undefined;

  const url = new URL(databaseUrl);
  if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "5");
  if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "20");
  if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "15");
  return url.toString();
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasourceUrl: getDatabaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

/**
 * Execute a Prisma operation with automatic retry for Neon cold-start errors.
 * Neon serverless suspends compute after ~5min idle and kills open connections
 * with E57P01 (ProcessInterrupts) or simply closes the socket. This wrapper
 * catches those transient failures and retries after a short delay.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || "";
      const isTransient =
        msg.includes("connection") ||
        msg.includes("Connection") ||
        msg.includes("Closed") ||
        msg.includes("ProcessInterrupts") ||
        msg.includes("E57P01") ||
        msg.includes("ECONNRESET") ||
        msg.includes("socket hang up") ||
        msg.includes("Can't reach database");

      if (isTransient && attempt < maxRetries) {
        console.warn(
          `[Prisma Retry] Attempt ${attempt}/${maxRetries} failed (${msg.slice(0, 80)}). Retrying in ${delayMs}ms...`
        );
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs *= 1.5; // backoff
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * Warm up the Neon DB connection. Call this before demo or on app start.
 */
export async function warmupDb(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await withRetry(() => prisma.$queryRaw`SELECT 1`);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, error: err.message };
  }
}

export default prisma;
