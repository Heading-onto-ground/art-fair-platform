import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/auth";

let ensured = false;

export async function ensureEmailVerificationTable() {
  if (ensured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "EmailVerification" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "email" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "token" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "verifiedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerification_email_role_key" ON "EmailVerification" ("email", "role");`
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerification_token_key" ON "EmailVerification" ("token");`
  );
  ensured = true;
}

export async function createOrRefreshVerificationToken(input: {
  email: string;
  role: Role;
  expiresInHours?: number;
}) {
  await ensureEmailVerificationTable();
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + (input.expiresInHours ?? 24) * 60 * 60 * 1000);

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "EmailVerification" ("email", "role", "token", "expiresAt", "verifiedAt", "updatedAt")
      VALUES ($1, $2, $3, $4, NULL, NOW())
      ON CONFLICT ("email", "role")
      DO UPDATE SET "token" = EXCLUDED."token", "expiresAt" = EXCLUDED."expiresAt", "verifiedAt" = NULL, "updatedAt" = NOW();
    `,
    input.email,
    input.role,
    token,
    expiresAt
  );

  return { token, expiresAt };
}

export async function getEmailVerificationState(input: { email: string; role: Role }) {
  await ensureEmailVerificationTable();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT "verifiedAt", "expiresAt", "updatedAt" FROM "EmailVerification" WHERE "email" = $1 AND "role" = $2 LIMIT 1;`,
    input.email,
    input.role
  )) as Array<{ verifiedAt: Date | null; expiresAt: Date; updatedAt: Date }>;
  if (rows.length === 0) {
    return {
      exists: false,
      verified: false,
      expired: false,
      expiresAt: null as Date | null,
      updatedAt: null as Date | null,
    };
  }
  const row = rows[0];
  // Once verified, login should remain allowed even after token expiry.
  // Expiry only matters for unverified tokens.
  const verified = !!row.verifiedAt;
  const expired = !verified && row.expiresAt.getTime() <= Date.now();
  return {
    exists: true,
    verified,
    expired,
    expiresAt: row.expiresAt,
    updatedAt: row.updatedAt,
  };
}

export async function verifyByToken(input: { email: string; role: Role; token: string }) {
  await ensureEmailVerificationTable();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT "id", "verifiedAt", "expiresAt"
      FROM "EmailVerification"
      WHERE "email" = $1 AND "role" = $2 AND "token" = $3
      LIMIT 1;
    `,
    input.email,
    input.role,
    input.token
  )) as Array<{ id: string; verifiedAt: Date | null; expiresAt: Date }>;
  if (rows.length === 0) {
    return { ok: false as const, reason: "invalid" as const };
  }
  const row = rows[0];
  if (row.verifiedAt) {
    return { ok: true as const, alreadyVerified: true as const };
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    return { ok: false as const, reason: "expired" as const };
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "EmailVerification" SET "verifiedAt" = NOW(), "updatedAt" = NOW() WHERE id = $1;`,
    row.id
  );
  return { ok: true as const, alreadyVerified: false as const };
}

