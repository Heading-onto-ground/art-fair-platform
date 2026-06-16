/**
 * Run once: npx ts-node scripts/migrate-artworks.ts
 */
import { prisma } from "../lib/prisma";

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Artwork" (
      "id" TEXT NOT NULL,
      "artistId" TEXT NOT NULL,
      "seriesId" TEXT,
      "title" TEXT,
      "caption" TEXT,
      "imageUrl" TEXT NOT NULL,
      "medium" TEXT,
      "isPublic" BOOLEAN NOT NULL DEFAULT true,
      "inPortfolio" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Artwork_pkey" PRIMARY KEY ("id")
    )
  `);
  console.log("✓ Artwork table created (or already exists)");

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Artwork_artistId_idx" ON "Artwork"("artistId")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Artwork_seriesId_idx" ON "Artwork"("seriesId")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Artwork_artistId_createdAt_idx" ON "Artwork"("artistId", "createdAt")
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Artwork_artistId_fkey'
      ) THEN
        ALTER TABLE "Artwork"
          ADD CONSTRAINT "Artwork_artistId_fkey"
          FOREIGN KEY ("artistId") REFERENCES "ArtistProfile"("id") ON DELETE CASCADE;
      END IF;
    END $$
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Artwork_seriesId_fkey'
      ) THEN
        ALTER TABLE "Artwork"
          ADD CONSTRAINT "Artwork_seriesId_fkey"
          FOREIGN KEY ("seriesId") REFERENCES "ArtworkSeries"("id") ON DELETE SET NULL;
      END IF;
    END $$
  `);

  console.log("✓ Artwork indexes and foreign keys ready");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Artwork" ADD COLUMN IF NOT EXISTS "postType" TEXT NOT NULL DEFAULT 'work'
  `);
  console.log("✓ Artwork.postType column added (or already exists)");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Hashtag" (
      "id" TEXT NOT NULL,
      "tag" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Hashtag_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Hashtag_tag_key" ON "Hashtag"("tag")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ArtworkHashtag" (
      "artworkId" TEXT NOT NULL,
      "hashtagId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ArtworkHashtag_pkey" PRIMARY KEY ("artworkId", "hashtagId")
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ArtworkHashtag_hashtagId_idx" ON "ArtworkHashtag"("hashtagId")
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArtworkHashtag_artworkId_fkey') THEN
        ALTER TABLE "ArtworkHashtag"
          ADD CONSTRAINT "ArtworkHashtag_artworkId_fkey"
          FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE;
      END IF;
    END $$
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArtworkHashtag_hashtagId_fkey') THEN
        ALTER TABLE "ArtworkHashtag"
          ADD CONSTRAINT "ArtworkHashtag_hashtagId_fkey"
          FOREIGN KEY ("hashtagId") REFERENCES "Hashtag"("id") ON DELETE CASCADE;
      END IF;
    END $$
  `);

  console.log("✓ Hashtag tables ready");
}

main()
  .then(() => {
    console.log("Migration complete.");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
