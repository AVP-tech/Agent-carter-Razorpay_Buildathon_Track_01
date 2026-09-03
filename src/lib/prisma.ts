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
  if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "10");
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

export default prisma;
