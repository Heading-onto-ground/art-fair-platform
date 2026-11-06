-- Additive Global Artist Expansion tables.
-- Do not apply to production without explicit approval.
-- Safe to retry: every statement creates only when missing. No existing table or column changes.

CREATE TABLE IF NOT EXISTS "ArtistResearchCandidate" (
  "id" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "nativeNameCandidate" TEXT,
  "normalizedName" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "sourceHost" TEXT,
  "sourceContext" TEXT NOT NULL,
  "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "identityCandidateId" TEXT,
  "resolvedArtistId" TEXT,
  "researchJobId" TEXT,
  "demandCount" INTEGER NOT NULL DEFAULT 0,
  "graphAdjacencyScore" INTEGER NOT NULL DEFAULT 0,
  "trustedSourceScore" INTEGER NOT NULL DEFAULT 0,
  "bridgePotentialScore" INTEGER NOT NULL DEFAULT 0,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "nextEligibleAt" TIMESTAMP(3),
  "failureCode" TEXT,
  "priorityScore" INTEGER NOT NULL DEFAULT 0,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArtistResearchCandidate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ArtistResearchCandidate_normalizedName_key" ON "ArtistResearchCandidate"("normalizedName");
CREATE INDEX IF NOT EXISTS "ArtistResearchCandidate_status_idx" ON "ArtistResearchCandidate"("status");
CREATE INDEX IF NOT EXISTS "ArtistResearchCandidate_priorityScore_idx" ON "ArtistResearchCandidate"("priorityScore");
CREATE INDEX IF NOT EXISTS "ArtistResearchCandidate_nextEligibleAt_idx" ON "ArtistResearchCandidate"("nextEligibleAt");
CREATE INDEX IF NOT EXISTS "ArtistResearchCandidate_identityCandidateId_idx" ON "ArtistResearchCandidate"("identityCandidateId");
CREATE INDEX IF NOT EXISTS "ArtistResearchCandidate_resolvedArtistId_idx" ON "ArtistResearchCandidate"("resolvedArtistId");
CREATE INDEX IF NOT EXISTS "ArtistResearchCandidate_researchJobId_idx" ON "ArtistResearchCandidate"("researchJobId");

CREATE TABLE IF NOT EXISTS "ExpansionRun" (
  "id" TEXT NOT NULL,
  "runKey" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "candidatesObserved" INTEGER NOT NULL DEFAULT 0,
  "candidatesInserted" INTEGER NOT NULL DEFAULT 0,
  "candidatesUpdated" INTEGER NOT NULL DEFAULT 0,
  "jobsStarted" INTEGER NOT NULL DEFAULT 0,
  "jobsReused" INTEGER NOT NULL DEFAULT 0,
  "estimatedFetches" INTEGER NOT NULL DEFAULT 0,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "summary" JSONB NOT NULL,
  CONSTRAINT "ExpansionRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExpansionRun_runKey_key" ON "ExpansionRun"("runKey");
CREATE INDEX IF NOT EXISTS "ExpansionRun_startedAt_idx" ON "ExpansionRun"("startedAt");
CREATE INDEX IF NOT EXISTS "ExpansionRun_mode_idx" ON "ExpansionRun"("mode");

-- Internal queue tables. The server connects as postgres, which bypasses RLS.
-- The public Data API roles get no privileges and no policy.
REVOKE ALL ON TABLE "ArtistResearchCandidate" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "ExpansionRun" FROM PUBLIC, anon, authenticated;
ALTER TABLE "ArtistResearchCandidate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExpansionRun" ENABLE ROW LEVEL SECURITY;
