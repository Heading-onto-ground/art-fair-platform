-- Run this in Supabase SQL Editor (same project as the Vercel DATABASE_URL).
-- Idempotent: safe to run more than once.

CREATE TABLE IF NOT EXISTS "LaborSurveyCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "gatheringId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LaborSurveyCampaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LaborSurveyCampaign_isActive_idx" ON "LaborSurveyCampaign"("isActive");

CREATE TABLE IF NOT EXISTS "LaborSurveyResponse" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artistProfileId" TEXT,
    "answers" JSONB NOT NULL,
    "consentResearch" BOOLEAN NOT NULL DEFAULT false,
    "consentPolicy" BOOLEAN NOT NULL DEFAULT false,
    "consentNationalAssembly" BOOLEAN NOT NULL DEFAULT false,
    "consentAnonymousCase" BOOLEAN NOT NULL DEFAULT false,
    "declineNationalAssembly" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LaborSurveyResponse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LaborSurveyResponse_campaignId_userId_key"
    ON "LaborSurveyResponse"("campaignId", "userId");
CREATE INDEX IF NOT EXISTS "LaborSurveyResponse_campaignId_idx" ON "LaborSurveyResponse"("campaignId");
CREATE INDEX IF NOT EXISTS "LaborSurveyResponse_userId_idx" ON "LaborSurveyResponse"("userId");

DO $$ BEGIN
  ALTER TABLE "LaborSurveyResponse"
    ADD CONSTRAINT "LaborSurveyResponse_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "LaborSurveyCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
