-- Additive private tables for artist watches and saved discovery searches.
-- Apply only after a verified PostgreSQL backup.
-- Safe to retry: tables, indexes, and foreign keys are created only when missing.
-- No existing columns are renamed or dropped.

CREATE TABLE IF NOT EXISTS "ArtistWatch" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "artistEntityId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArtistWatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ArtistWatch_userId_artistEntityId_key"
  ON "ArtistWatch"("userId", "artistEntityId");
CREATE INDEX IF NOT EXISTS "ArtistWatch_userId_idx" ON "ArtistWatch"("userId");

DO $$ BEGIN
  ALTER TABLE "ArtistWatch"
    ADD CONSTRAINT "ArtistWatch_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ArtistWatch"
    ADD CONSTRAINT "ArtistWatch_artistEntityId_fkey"
    FOREIGN KEY ("artistEntityId") REFERENCES "ArtistEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SavedDiscoverySearch" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "filterJson" JSONB NOT NULL,
  "baselineIds" JSONB NOT NULL,
  "baselineCapped" BOOLEAN NOT NULL DEFAULT false,
  "resultTotalAtView" INTEGER NOT NULL DEFAULT 0,
  "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SavedDiscoverySearch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SavedDiscoverySearch_userId_idx" ON "SavedDiscoverySearch"("userId");

DO $$ BEGIN
  ALTER TABLE "SavedDiscoverySearch"
    ADD CONSTRAINT "SavedDiscoverySearch_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
