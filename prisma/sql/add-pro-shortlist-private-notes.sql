-- Additive private tables for artist shortlists and private artist notes.
-- Apply only after a verified PostgreSQL backup.
-- Safe to retry: tables, indexes, and foreign keys are created only when missing.
-- No existing columns are renamed, dropped, or rewritten.
--
-- User deletion cascades these private rows, matching ArtistWatch and SavedDiscoverySearch.
-- ArtistEntity deletion cascades only these private rows, matching ArtistWatch.
-- This file does not alter Exhibition, HistoryParticipation, ArtistEntity, or any other public graph table.
-- A shortlist row and note stay when the artist remains in ArtistEntity but leaves the public graph.
-- The application shows an unavailable state for that row. The cascade runs only if the ArtistEntity row itself is deleted.

CREATE TABLE IF NOT EXISTS "ArtistShortlist" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "artistEntityId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REVIEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArtistShortlist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ArtistShortlist_userId_artistEntityId_key"
  ON "ArtistShortlist"("userId", "artistEntityId");
CREATE INDEX IF NOT EXISTS "ArtistShortlist_userId_idx" ON "ArtistShortlist"("userId");

DO $$ BEGIN
  ALTER TABLE "ArtistShortlist"
    ADD CONSTRAINT "ArtistShortlist_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ArtistShortlist"
    ADD CONSTRAINT "ArtistShortlist_artistEntityId_fkey"
    FOREIGN KEY ("artistEntityId") REFERENCES "ArtistEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PrivateArtistNote" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "artistEntityId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrivateArtistNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PrivateArtistNote_userId_artistEntityId_key"
  ON "PrivateArtistNote"("userId", "artistEntityId");
CREATE INDEX IF NOT EXISTS "PrivateArtistNote_userId_idx" ON "PrivateArtistNote"("userId");

DO $$ BEGIN
  ALTER TABLE "PrivateArtistNote"
    ADD CONSTRAINT "PrivateArtistNote_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PrivateArtistNote"
    ADD CONSTRAINT "PrivateArtistNote_artistEntityId_fkey"
    FOREIGN KEY ("artistEntityId") REFERENCES "ArtistEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
