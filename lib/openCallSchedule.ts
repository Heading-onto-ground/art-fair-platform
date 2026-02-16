import { prisma } from "@/lib/prisma";

type ScheduleRow = {
  openCallId: string;
  exhibitionDate: string | null;
  applicationDeadline: string | null;
};

let ensured = false;

async function ensureOpenCallScheduleTable() {
  if (ensured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OpenCallSchedule" (
      "openCallId" TEXT PRIMARY KEY,
      "exhibitionDate" TEXT,
      "applicationDeadline" TEXT,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  ensured = true;
}

export async function upsertOpenCallSchedule(input: {
  openCallId: string;
  exhibitionDate?: string | null;
  applicationDeadline?: string | null;
}) {
  await ensureOpenCallScheduleTable();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "OpenCallSchedule" ("openCallId", "exhibitionDate", "applicationDeadline", "updatedAt")
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT ("openCallId")
      DO UPDATE SET
        "exhibitionDate" = EXCLUDED."exhibitionDate",
        "applicationDeadline" = EXCLUDED."applicationDeadline",
        "updatedAt" = CURRENT_TIMESTAMP;
    `,
    input.openCallId,
    input.exhibitionDate ?? null,
    input.applicationDeadline ?? null
  );
}

export async function getOpenCallScheduleMap(openCallIds: string[]) {
  await ensureOpenCallScheduleTable();
  if (openCallIds.length === 0) return new Map<string, ScheduleRow>();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT "openCallId", "exhibitionDate", "applicationDeadline"
      FROM "OpenCallSchedule"
      WHERE "openCallId" = ANY($1::text[]);
    `,
    openCallIds
  )) as ScheduleRow[];
  return new Map(rows.map((row) => [row.openCallId, row]));
}

