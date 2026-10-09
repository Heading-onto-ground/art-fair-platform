-- Additive source-policy fields. No drops, deletes, or rewrites of existing rows.

ALTER TABLE "HistorySource" ADD COLUMN IF NOT EXISTS "internalUseDecision" TEXT NOT NULL DEFAULT 'HOLD';
ALTER TABLE "HistorySource" ADD COLUMN IF NOT EXISTS "externalPermission" TEXT NOT NULL DEFAULT 'NOT_OBTAINED';
ALTER TABLE "HistorySource" ADD COLUMN IF NOT EXISTS "contentScope" TEXT NOT NULL DEFAULT 'UNSPECIFIED';

ALTER TABLE "HistoryImportRecord" ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;
ALTER TABLE "HistoryImportRecord" ADD COLUMN IF NOT EXISTS "sourceFamily" TEXT;
ALTER TABLE "HistoryImportRecord" ADD COLUMN IF NOT EXISTS "internalUseDecision" TEXT;
ALTER TABLE "HistoryImportRecord" ADD COLUMN IF NOT EXISTS "externalPermission" TEXT;
ALTER TABLE "HistoryImportRecord" ADD COLUMN IF NOT EXISTS "importVersion" TEXT;

CREATE TABLE IF NOT EXISTS "HistoryCorrectionReport" (
  "id" TEXT PRIMARY KEY,
  "exhibitionId" TEXT,
  "artistSlug" TEXT,
  "kind" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "HistoryCorrectionReport_createdAt_idx" ON "HistoryCorrectionReport"("createdAt");
