-- Read receipts for AdminSupportThread (run once in Supabase SQL Editor on existing DBs)
ALTER TABLE "AdminSupportThread" ADD COLUMN IF NOT EXISTS "lastReadByUserAt" TIMESTAMP(3);
ALTER TABLE "AdminSupportThread" ADD COLUMN IF NOT EXISTS "lastReadByAdminAt" TIMESTAMP(3);
