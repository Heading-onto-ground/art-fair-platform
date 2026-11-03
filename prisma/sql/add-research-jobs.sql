-- Additive Search-triggered Discovery jobs.
-- Do not apply to production without explicit approval.
-- Safe to retry: tables and the partial unique index are created only when missing.

CREATE TABLE IF NOT EXISTS "ResearchJob" (
  "id" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "normalizedQuery" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "demandQuality" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "resolvedArtistId" TEXT,
  "resolvedArtistSlug" TEXT,
  "identityStatus" TEXT,
  "sourcesFound" INTEGER NOT NULL DEFAULT 0,
  "sourcesChecked" INTEGER NOT NULL DEFAULT 0,
  "verifiedFactCount" INTEGER NOT NULL DEFAULT 0,
  "reviewFactCount" INTEGER NOT NULL DEFAULT 0,
  "blockedSourceCount" INTEGER NOT NULL DEFAULT 0,
  "failureCode" TEXT,
  "failureDetail" TEXT,
  "resultArtistSlug" TEXT,
  "payload" JSONB NOT NULL,
  CONSTRAINT "ResearchJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ResearchJob_normalizedQuery_idx" ON "ResearchJob"("normalizedQuery");
CREATE INDEX IF NOT EXISTS "ResearchJob_status_idx" ON "ResearchJob"("status");
CREATE INDEX IF NOT EXISTS "ResearchJob_stage_idx" ON "ResearchJob"("stage");

CREATE UNIQUE INDEX IF NOT EXISTS "ResearchJob_one_active_query"
  ON "ResearchJob"("normalizedQuery")
  WHERE "stage" <> 'DONE';
