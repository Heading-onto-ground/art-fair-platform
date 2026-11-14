-- Additive private table for an artist's own open-call preparation.
-- Apply only after a verified PostgreSQL backup.
-- This is not an application to an organizer.
-- No existing columns are renamed or rewritten.
-- This file only adds the private table, its indexes, foreign keys, and API-role lock.

CREATE TABLE IF NOT EXISTS "OpenCallPreparation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "openCallId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpenCallPreparation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OpenCallPreparation_userId_openCallId_key"
  ON "OpenCallPreparation"("userId", "openCallId");
CREATE INDEX IF NOT EXISTS "OpenCallPreparation_userId_idx"
  ON "OpenCallPreparation"("userId");

DO $$ BEGIN
  ALTER TABLE "OpenCallPreparation"
    ADD CONSTRAINT "OpenCallPreparation_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OpenCallPreparation"
    ADD CONSTRAINT "OpenCallPreparation_openCallId_fkey"
    FOREIGN KEY ("openCallId") REFERENCES "OpenCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "OpenCallPreparation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "OpenCallPreparation" FROM anon, authenticated, PUBLIC;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'OpenCallPreparation'
      AND policyname = '__afp_deny_api_roles'
  ) THEN
    CREATE POLICY "__afp_deny_api_roles"
      ON "OpenCallPreparation"
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;
