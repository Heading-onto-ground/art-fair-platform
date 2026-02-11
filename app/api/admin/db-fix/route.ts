import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STATEMENTS = [
  `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "artistName" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "artistEmail" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "artistCountry" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "artistCity" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "artistPortfolioUrl" TEXT`,
  `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "shippingNote" TEXT`,
  `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "shippingCarrier" TEXT`,
  `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "trackingNumber" TEXT`,
  `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "trackingUrl" TEXT`,
  `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "isExternal" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "outreachSent" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "outreachSentAt" TIMESTAMP(3)`,
  `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "outreachNote" TEXT`,
  `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "shippingStatus" TEXT NOT NULL DEFAULT 'pending'`,
  // Profile images
  `ALTER TABLE "ArtistProfile" ADD COLUMN IF NOT EXISTS "profileImage" TEXT`,
  `ALTER TABLE "GalleryProfile" ADD COLUMN IF NOT EXISTS "profileImage" TEXT`,
  // Open call poster image
  `ALTER TABLE "OpenCall" ADD COLUMN IF NOT EXISTS "posterImage" TEXT`,
];

export async function POST() {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const results: string[] = [];
    for (const sql of STATEMENTS) {
      try {
        await prisma.$executeRawUnsafe(sql);
        results.push(`✅ ${sql.slice(0, 60)}...`);
      } catch (e: any) {
        results.push(`⚠️ ${e?.message?.slice(0, 80) || 'error'}`);
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    console.error("DB fix error:", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
