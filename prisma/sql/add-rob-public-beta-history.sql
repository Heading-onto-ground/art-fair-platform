-- ROB public history.
-- Additive only. Do not run until the database host is confirmed and a backup exists.
-- Apply order: this file, once, in the Supabase SQL editor for the same project as DATABASE_URL.
-- Then run scripts/backfill-artist-entities.ts only with ROB_CONFIRM_DATABASE=1.
-- This file does not copy pilot records.

ALTER TABLE "Exhibition" ALTER COLUMN "createdBy" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "ArtistEntity" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "canonicalName" TEXT NOT NULL,
  "nativeName" TEXT,
  "birthYear" INTEGER,
  "country" TEXT,
  "city" TEXT,
  "officialWebsite" TEXT,
  "profileId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ArtistEntity_slug_key" ON "ArtistEntity"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "ArtistEntity_profileId_key" ON "ArtistEntity"("profileId");
CREATE INDEX IF NOT EXISTS "ArtistEntity_canonicalName_idx" ON "ArtistEntity"("canonicalName");

CREATE TABLE IF NOT EXISTS "ArtistAlias" (
  "id" TEXT PRIMARY KEY,
  "artistEntityId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ArtistAlias_artistEntityId_idx" ON "ArtistAlias"("artistEntityId");
CREATE INDEX IF NOT EXISTS "ArtistAlias_label_idx" ON "ArtistAlias"("label");

CREATE TABLE IF NOT EXISTS "ArtistEntityClaim" (
  "id" TEXT PRIMARY KEY,
  "artistEntityId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedBy" TEXT
);
CREATE INDEX IF NOT EXISTS "ArtistEntityClaim_artistEntityId_idx" ON "ArtistEntityClaim"("artistEntityId");
CREATE INDEX IF NOT EXISTS "ArtistEntityClaim_userId_idx" ON "ArtistEntityClaim"("userId");
CREATE INDEX IF NOT EXISTS "ArtistEntityClaim_status_idx" ON "ArtistEntityClaim"("status");

CREATE TABLE IF NOT EXISTS "ExhibitionHistoryMeta" (
  "exhibitionId" TEXT PRIMARY KEY,
  "slug" TEXT,
  "datePrecision" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "startYear" INTEGER,
  "startMonth" INTEGER,
  "startDay" INTEGER,
  "endYear" INTEGER,
  "endMonth" INTEGER,
  "endDay" INTEGER,
  "clearanceStatus" TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
  "contributorKind" TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS "ExhibitionHistoryMeta_slug_key" ON "ExhibitionHistoryMeta"("slug");
CREATE INDEX IF NOT EXISTS "ExhibitionHistoryMeta_clearanceStatus_idx" ON "ExhibitionHistoryMeta"("clearanceStatus");
CREATE INDEX IF NOT EXISTS "ExhibitionHistoryMeta_startYear_idx" ON "ExhibitionHistoryMeta"("startYear");

CREATE TABLE IF NOT EXISTS "HistoryParticipation" (
  "id" TEXT PRIMARY KEY,
  "exhibitionId" TEXT NOT NULL,
  "artistEntityId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "HistoryParticipation_exhibitionId_artistEntityId_key" ON "HistoryParticipation"("exhibitionId", "artistEntityId");
CREATE INDEX IF NOT EXISTS "HistoryParticipation_artistEntityId_idx" ON "HistoryParticipation"("artistEntityId");

CREATE TABLE IF NOT EXISTS "HistoryUnresolvedName" (
  "id" TEXT PRIMARY KEY,
  "exhibitionId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UNRESOLVED_PARTICIPANT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "HistoryUnresolvedName_exhibitionId_idx" ON "HistoryUnresolvedName"("exhibitionId");

CREATE TABLE IF NOT EXISTS "SpaceSlug" (
  "spaceId" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "SpaceSlug_slug_key" ON "SpaceSlug"("slug");

CREATE TABLE IF NOT EXISTS "CuratorSlug" (
  "curatorId" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "CuratorSlug_slug_key" ON "CuratorSlug"("slug");

CREATE TABLE IF NOT EXISTS "HistorySource" (
  "id" TEXT PRIMARY KEY,
  "url" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "retrievedAt" TIMESTAMP(3),
  "clearanceStatus" TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "HistorySource_clearanceStatus_idx" ON "HistorySource"("clearanceStatus");

CREATE TABLE IF NOT EXISTS "ExhibitionSource" (
  "exhibitionId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  PRIMARY KEY ("exhibitionId", "sourceId")
);
CREATE INDEX IF NOT EXISTS "ExhibitionSource_sourceId_idx" ON "ExhibitionSource"("sourceId");

CREATE TABLE IF NOT EXISTS "HistoryImportRecord" (
  "id" TEXT PRIMARY KEY,
  "pilotRecordId" TEXT NOT NULL,
  "usageStatus" TEXT NOT NULL DEFAULT 'PILOT_ONLY',
  "productionClearance" TEXT NOT NULL DEFAULT 'UNRESOLVED',
  "reviewStatus" TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "HistoryImportRecord_pilotRecordId_key" ON "HistoryImportRecord"("pilotRecordId");
CREATE INDEX IF NOT EXISTS "HistoryImportRecord_reviewStatus_idx" ON "HistoryImportRecord"("reviewStatus");

CREATE TABLE IF NOT EXISTS "HistorySignal" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "path" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "HistorySignal_name_idx" ON "HistorySignal"("name");
CREATE INDEX IF NOT EXISTS "HistorySignal_createdAt_idx" ON "HistorySignal"("createdAt");

DO $$ BEGIN
  ALTER TABLE "ArtistEntity" ADD CONSTRAINT "ArtistEntity_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ArtistProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ArtistAlias" ADD CONSTRAINT "ArtistAlias_artistEntityId_fkey" FOREIGN KEY ("artistEntityId") REFERENCES "ArtistEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ArtistEntityClaim" ADD CONSTRAINT "ArtistEntityClaim_artistEntityId_fkey" FOREIGN KEY ("artistEntityId") REFERENCES "ArtistEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ArtistEntityClaim" ADD CONSTRAINT "ArtistEntityClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ExhibitionHistoryMeta" ADD CONSTRAINT "ExhibitionHistoryMeta_exhibitionId_fkey" FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "HistoryParticipation" ADD CONSTRAINT "HistoryParticipation_exhibitionId_fkey" FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "HistoryParticipation" ADD CONSTRAINT "HistoryParticipation_artistEntityId_fkey" FOREIGN KEY ("artistEntityId") REFERENCES "ArtistEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "HistoryUnresolvedName" ADD CONSTRAINT "HistoryUnresolvedName_exhibitionId_fkey" FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SpaceSlug" ADD CONSTRAINT "SpaceSlug_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CuratorSlug" ADD CONSTRAINT "CuratorSlug_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "Curator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ExhibitionSource" ADD CONSTRAINT "ExhibitionSource_exhibitionId_fkey" FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ExhibitionSource" ADD CONSTRAINT "ExhibitionSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "HistorySource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
