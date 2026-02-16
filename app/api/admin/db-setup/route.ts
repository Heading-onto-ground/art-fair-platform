import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SETUP_SQL = `
-- OpenCall table
CREATE TABLE IF NOT EXISTS "OpenCall" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "galleryId" TEXT NOT NULL,
  "gallery" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "theme" TEXT NOT NULL,
  "exhibitionDate" TEXT,
  "deadline" TEXT NOT NULL,
  "isExternal" BOOLEAN NOT NULL DEFAULT false,
  "externalEmail" TEXT,
  "externalUrl" TEXT,
  "galleryWebsite" TEXT,
  "galleryDescription" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpenCall_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OpenCall_country_idx" ON "OpenCall"("country");
CREATE INDEX IF NOT EXISTS "OpenCall_galleryId_idx" ON "OpenCall"("galleryId");
CREATE INDEX IF NOT EXISTS "OpenCall_isExternal_idx" ON "OpenCall"("isExternal");
DO $$ BEGIN
  ALTER TABLE "OpenCall" ADD COLUMN IF NOT EXISTS "exhibitionDate" TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Update Application table with new columns
DO $$ BEGIN
  ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "artistName" TEXT NOT NULL DEFAULT '';
  ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "artistEmail" TEXT NOT NULL DEFAULT '';
  ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "artistCountry" TEXT NOT NULL DEFAULT '';
  ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "artistCity" TEXT NOT NULL DEFAULT '';
  ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "artistPortfolioUrl" TEXT;
  ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "shippingNote" TEXT;
  ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "shippingCarrier" TEXT;
  ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "trackingNumber" TEXT;
  ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "trackingUrl" TEXT;
  ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "isExternal" BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "outreachSent" BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "outreachSentAt" TIMESTAMP(3);
  ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "outreachNote" TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

-- AppShippingStatus enum and column
DO $$ BEGIN
  CREATE TYPE "AppShippingStatus" AS ENUM ('pending', 'shipped', 'received', 'inspected', 'exhibited');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "shippingStatus" "AppShippingStatus" NOT NULL DEFAULT 'pending';
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Application_isExternal_idx" ON "Application"("isExternal");

-- CommunityPost table
CREATE TABLE IF NOT EXISTS "CommunityPost" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "authorId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "authorRole" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "imageUrl" TEXT,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CommunityPost_category_idx" ON "CommunityPost"("category");
CREATE INDEX IF NOT EXISTS "CommunityPost_authorId_idx" ON "CommunityPost"("authorId");

-- CommunityComment table
CREATE TABLE IF NOT EXISTS "CommunityComment" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "postId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "authorRole" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CommunityComment_postId_idx" ON "CommunityComment"("postId");

-- CommunityLike table
CREATE TABLE IF NOT EXISTS "CommunityLike" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityLike_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunityLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CommunityLike_postId_userId_key" ON "CommunityLike"("postId", "userId");
CREATE INDEX IF NOT EXISTS "CommunityLike_postId_idx" ON "CommunityLike"("postId");

-- Notification table
CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "link" TEXT,
  "data" JSONB,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- OutreachRecord table
CREATE TABLE IF NOT EXISTS "OutreachRecord" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "toEmail" TEXT NOT NULL,
  "galleryName" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'en',
  "status" TEXT NOT NULL DEFAULT 'sent',
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "openedAt" TIMESTAMP(3),
  "clickedAt" TIMESTAMP(3),
  "signedUpAt" TIMESTAMP(3),
  CONSTRAINT "OutreachRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OutreachRecord_status_idx" ON "OutreachRecord"("status");
`;

export async function POST() {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized — login at /admin/login first" }, { status: 401 });
    }

    // Run each statement
    const statements = SETUP_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const results: string[] = [];
    for (const stmt of statements) {
      try {
        await prisma.$executeRawUnsafe(stmt + ';');
        results.push(`✅ OK`);
      } catch (e: any) {
        results.push(`⚠️ ${e?.message?.slice(0, 100) || 'error'}`);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Executed ${statements.length} SQL statements`,
      results,
    });
  } catch (e) {
    console.error("DB setup error:", e);
    return NextResponse.json({ error: "setup failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "POST to this endpoint (as admin) to set up database tables",
    instructions: "1. Login at /admin/login  2. POST to /api/admin/db-setup",
  });
}
