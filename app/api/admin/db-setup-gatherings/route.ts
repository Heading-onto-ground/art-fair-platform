import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Idempotent creation of the Gathering tables.
// Mirrors the /api/admin/db-setup pattern: this repo applies schema to prod
// via raw SQL run by an admin, not via prisma migrate.
const SETUP_SQL = `
CREATE TABLE IF NOT EXISTS "Gathering" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "title" TEXT NOT NULL,
  "theme" TEXT,
  "location" TEXT,
  "note" TEXT,
  "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Gathering_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Gathering_happenedAt_idx" ON "Gathering"("happenedAt");

CREATE TABLE IF NOT EXISTS "GatheringAttendee" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "gatheringId" TEXT NOT NULL,
  "artistId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GatheringAttendee_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GatheringAttendee_gatheringId_fkey" FOREIGN KEY ("gatheringId") REFERENCES "Gathering"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "GatheringAttendee_gatheringId_artistId_key" ON "GatheringAttendee"("gatheringId", "artistId");
CREATE INDEX IF NOT EXISTS "GatheringAttendee_artistId_idx" ON "GatheringAttendee"("artistId");
CREATE INDEX IF NOT EXISTS "GatheringAttendee_gatheringId_idx" ON "GatheringAttendee"("gatheringId");

-- Operator permission flag on User
DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isOperator" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN others THEN NULL;
END $$;
`;

export async function POST() {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized — login at /admin/login first" }, { status: 401 });
    }

    const statements = SETUP_SQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const results: string[] = [];
    for (const stmt of statements) {
      try {
        await prisma.$executeRawUnsafe(stmt + ";");
        results.push("✅ OK");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push(`⚠️ ${msg.slice(0, 120)}`);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Executed ${statements.length} SQL statements (Gathering tables + User.isOperator)`,
      results,
    });
  } catch (e) {
    console.error("Gathering DB setup error:", e);
    return NextResponse.json({ error: "setup failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "POST to this endpoint (as admin) to create the Gathering tables",
    instructions: "1. Login at /admin/login  2. POST to /api/admin/db-setup-gatherings",
  });
}
