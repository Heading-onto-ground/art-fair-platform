import { prisma } from "@/lib/prisma";

type LogInput = {
  emailType: string;
  toEmail: string;
  subject: string;
  status: "sent" | "failed" | "simulated";
  error?: string;
  meta?: Record<string, unknown>;
};

let ensured = false;

async function ensureEmailLogTable() {
  if (ensured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "EmailLog" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "emailType" TEXT NOT NULL,
      "toEmail" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "error" TEXT,
      "provider" TEXT NOT NULL DEFAULT 'resend',
      "meta" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "EmailLog_createdAt_idx" ON "EmailLog" ("createdAt" DESC);`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "EmailLog_emailType_idx" ON "EmailLog" ("emailType");`
  );
  ensured = true;
}

export async function logEmailEvent(input: LogInput) {
  try {
    await ensureEmailLogTable();
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "EmailLog" ("emailType", "toEmail", "subject", "status", "error", "provider", "meta")
        VALUES ($1, $2, $3, $4, $5, 'resend', $6::jsonb)
      `,
      input.emailType,
      input.toEmail,
      input.subject,
      input.status,
      input.error ? String(input.error).slice(0, 2000) : null,
      JSON.stringify(input.meta || {})
    );
  } catch (e) {
    console.error("logEmailEvent failed:", e);
  }
}

export async function listEmailLogs(limit = 100) {
  await ensureEmailLogTable();
  const safeLimit = Math.max(1, Math.min(500, Number(limit || 100)));
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT "id", "emailType", "toEmail", "subject", "status", "error", "provider", "meta", "createdAt"
      FROM "EmailLog"
      ORDER BY "createdAt" DESC
      LIMIT $1
    `,
    safeLimit
  )) as Array<{
    id: string;
    emailType: string;
    toEmail: string;
    subject: string;
    status: string;
    error: string | null;
    provider: string;
    meta: unknown;
    createdAt: Date;
  }>;
  return rows.map((r) => ({
    ...r,
    createdAt: new Date(r.createdAt).getTime(),
  }));
}

