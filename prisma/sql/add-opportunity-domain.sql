-- Additive Opportunity domain. OpenCall is unchanged.
-- Apply only after a verified PostgreSQL backup.
-- Unknown facts stay null. This file adds tables, indexes, foreign keys, and the API-role lock.
-- No existing columns are renamed or rewritten.

CREATE TABLE IF NOT EXISTS "Opportunity" (
  "id" TEXT NOT NULL,
  "type" TEXT,
  "title" TEXT NOT NULL,
  "organizerName" TEXT,
  "organizerType" TEXT,
  "country" TEXT,
  "city" TEXT,
  "locationText" TEXT,
  "deadline" TEXT,
  "deadlineTimezone" TEXT,
  "applicationStart" TEXT,
  "eventStart" TEXT,
  "eventEnd" TEXT,
  "feeAmount" INTEGER,
  "feeCurrency" TEXT,
  "feeRequired" BOOLEAN,
  "eligibility" TEXT,
  "disciplines" TEXT,
  "internationalEligible" BOOLEAN,
  "description" TEXT,
  "officialUrl" TEXT,
  "sourceUrl" TEXT,
  "sourceHost" TEXT,
  "sourceLanguage" TEXT,
  "sourceClass" TEXT,
  "status" TEXT NOT NULL,
  "verificationStatus" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "discoveredAt" TIMESTAMP(3),
  "fingerprint" TEXT NOT NULL,
  "legacyOpenCallId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Opportunity_fingerprint_key" ON "Opportunity"("fingerprint");
CREATE INDEX IF NOT EXISTS "Opportunity_status_verificationStatus_idx"
  ON "Opportunity"("status", "verificationStatus");
CREATE UNIQUE INDEX IF NOT EXISTS "Opportunity_legacyOpenCallId_key" ON "Opportunity"("legacyOpenCallId");

CREATE TABLE IF NOT EXISTS "OpportunitySource" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "sourceHost" TEXT,
  "sourceLanguage" TEXT,
  "sourceClass" TEXT,
  "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "legacyOpenCallId" TEXT,
  CONSTRAINT "OpportunitySource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OpportunitySource_opportunityId_sourceUrl_key"
  ON "OpportunitySource"("opportunityId", "sourceUrl");
CREATE UNIQUE INDEX IF NOT EXISTS "OpportunitySource_legacyOpenCallId_key"
  ON "OpportunitySource"("legacyOpenCallId");
CREATE INDEX IF NOT EXISTS "OpportunitySource_opportunityId_idx"
  ON "OpportunitySource"("opportunityId");

DO $$ BEGIN
  ALTER TABLE "Opportunity"
    ADD CONSTRAINT "Opportunity_legacyOpenCallId_fkey"
    FOREIGN KEY ("legacyOpenCallId") REFERENCES "OpenCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OpportunitySource"
    ADD CONSTRAINT "OpportunitySource_opportunityId_fkey"
    FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OpportunitySource"
    ADD CONSTRAINT "OpportunitySource_legacyOpenCallId_fkey"
    FOREIGN KEY ("legacyOpenCallId") REFERENCES "OpenCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Opportunity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OpportunitySource" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Opportunity" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE "OpportunitySource" FROM anon, authenticated, PUBLIC;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'Opportunity' AND policyname = '__afp_deny_api_roles'
  ) THEN
    CREATE POLICY "__afp_deny_api_roles"
      ON "Opportunity"
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'OpportunitySource' AND policyname = '__afp_deny_api_roles'
  ) THEN
    CREATE POLICY "__afp_deny_api_roles"
      ON "OpportunitySource"
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;
