import type { PrismaClient as PrismaClientType } from "@prisma/client";

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientType;
  pool?: any;
  adapter?: any;
};

// Neon/session poolers often cap concurrent DB sessions (e.g. 15). Each Vercel lambda
// keeps its own Pool; default pg max (10) × warm instances blows that limit quickly.
const parsedPoolMax = Number.parseInt(String(process.env.DATABASE_POOL_MAX || ""), 10);
const poolMax =
  Number.isFinite(parsedPoolMax) && parsedPoolMax > 0
    ? parsedPoolMax
    : process.env.NODE_ENV === "production"
      ? 1
      : 10;

function databaseSsl(connectionString: string | undefined) {
  try {
    const host = new URL(connectionString ?? "").hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
  } catch {
    // Hosted databases keep the default below.
  }
  return { rejectUnauthorized: false as const };
}

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: databaseSsl(process.env.DATABASE_URL),
    max: poolMax,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  });

const adapter = globalForPrisma.adapter ?? new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });

// Reuse pool + client across warm serverless invocations (and in dev).
// Omitting this in production caused a new Pool per request and DB connection exhaustion.
globalForPrisma.pool = pool;
globalForPrisma.adapter = adapter;
globalForPrisma.prisma = prisma;
