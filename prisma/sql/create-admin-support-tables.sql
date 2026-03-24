-- Run this in Supabase → SQL Editor (same project as Vercel DATABASE_URL)
-- Use when `npx prisma db push` was run against a different DB than production.

-- AdminSupportThread
CREATE TABLE IF NOT EXISTS "AdminSupportThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminSupportThread_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminSupportThread_userId_key" ON "AdminSupportThread"("userId");
CREATE INDEX IF NOT EXISTS "AdminSupportThread_updatedAt_idx" ON "AdminSupportThread"("updatedAt");

DO $$
BEGIN
  ALTER TABLE "AdminSupportThread"
    ADD CONSTRAINT "AdminSupportThread_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AdminSupportMessage
CREATE TABLE IF NOT EXISTS "AdminSupportMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "fromAdmin" BOOLEAN NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminSupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminSupportMessage_threadId_idx" ON "AdminSupportMessage"("threadId");

DO $$
BEGIN
  ALTER TABLE "AdminSupportMessage"
    ADD CONSTRAINT "AdminSupportMessage_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "AdminSupportThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
