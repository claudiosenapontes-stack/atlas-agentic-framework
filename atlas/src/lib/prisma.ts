import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function makeClient() {
  // DATABASE_URL is like: file:./dev.db
  const url = process.env.DATABASE_URL || "file:./dev.db";
  const filePath = url.startsWith("file:") ? url.replace(/^file:/, "") : url;

  const adapter = new PrismaBetterSqlite3({ url: filePath });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
