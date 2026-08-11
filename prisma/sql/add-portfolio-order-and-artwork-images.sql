-- Run this in Supabase SQL Editor (same project as the Vercel DATABASE_URL).
--
-- Adds:
--   * Artwork.portfolioOrder  — manual ordering of works in the public portfolio
--   * ArtworkImage            — multi-photo posts (Instagram-style carousel);
--                               Artwork.imageUrl stays the cover image.
--
-- Every statement is idempotent, so the whole script is safe to run more than once.

ALTER TABLE "Artwork" ADD COLUMN IF NOT EXISTS "portfolioOrder" INTEGER;

CREATE TABLE IF NOT EXISTS "ArtworkImage" (
    "id" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArtworkImage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ArtworkImage_artworkId_idx" ON "ArtworkImage"("artworkId");

DO $$ BEGIN
  ALTER TABLE "ArtworkImage"
    ADD CONSTRAINT "ArtworkImage_artworkId_fkey"
    FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
