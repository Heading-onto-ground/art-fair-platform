-- Additive private inbox for watched-artist public activity alerts.
-- Apply only after a verified PostgreSQL backup.
-- Safe to retry: the table, indexes, and foreign keys are created only when missing.
-- No existing columns are renamed, dropped, or rewritten.
--
-- User deletion cascades these private rows, matching ArtistWatch.
-- ArtistEntity deletion cascades only this private row, matching ArtistWatch.
-- Exhibition deletion cascades only this private row. Exhibition, HistoryParticipation,
-- and other public graph rows are not rewritten by this file.
-- Unwatching an artist does not delete alerts. There is no foreign key to ArtistWatch.

CREATE TABLE IF NOT EXISTS "ActivityAlert" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "artistEntityId" TEXT NOT NULL,
  "exhibitionId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'EXHIBITION_RECORDED',
  "eventYear" INTEGER,
  "isHistoricalBackfill" BOOLEAN NOT NULL DEFAULT false,
  "recordedAt" TIMESTAMP(3) NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ActivityAlert_userId_artistEntityId_exhibitionId_type_key"
  ON "ActivityAlert"("userId", "artistEntityId", "exhibitionId", "type");
CREATE INDEX IF NOT EXISTS "ActivityAlert_userId_createdAt_idx"
  ON "ActivityAlert"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ActivityAlert_userId_readAt_idx"
  ON "ActivityAlert"("userId", "readAt");

DO $$ BEGIN
  ALTER TABLE "ActivityAlert"
    ADD CONSTRAINT "ActivityAlert_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ActivityAlert"
    ADD CONSTRAINT "ActivityAlert_artistEntityId_fkey"
    FOREIGN KEY ("artistEntityId") REFERENCES "ArtistEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ActivityAlert"
    ADD CONSTRAINT "ActivityAlert_exhibitionId_fkey"
    FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
