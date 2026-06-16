/**
 * Run once: npx tsx scripts/migrate-artwork-engagement.ts
 */
import { prisma } from "../lib/prisma";

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ArtworkLike" (
      "artworkId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ArtworkLike_pkey" PRIMARY KEY ("artworkId", "userId")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ArtworkLike_userId_idx" ON "ArtworkLike"("userId")
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArtworkLike_artworkId_fkey') THEN
        ALTER TABLE "ArtworkLike"
          ADD CONSTRAINT "ArtworkLike_artworkId_fkey"
          FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE;
      END IF;
    END $$
  `);
  console.log("✓ ArtworkLike table ready");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ArtworkCollabInterest" (
      "artworkId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ArtworkCollabInterest_pkey" PRIMARY KEY ("artworkId", "userId")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ArtworkCollabInterest_userId_idx" ON "ArtworkCollabInterest"("userId")
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArtworkCollabInterest_artworkId_fkey') THEN
        ALTER TABLE "ArtworkCollabInterest"
          ADD CONSTRAINT "ArtworkCollabInterest_artworkId_fkey"
          FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE;
      END IF;
    END $$
  `);
  console.log("✓ ArtworkCollabInterest table ready");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ArtworkComment" (
      "id" TEXT NOT NULL,
      "artworkId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ArtworkComment_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ArtworkComment_artworkId_createdAt_idx" ON "ArtworkComment"("artworkId", "createdAt")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ArtworkComment_userId_idx" ON "ArtworkComment"("userId")
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArtworkComment_artworkId_fkey') THEN
        ALTER TABLE "ArtworkComment"
          ADD CONSTRAINT "ArtworkComment_artworkId_fkey"
          FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE;
      END IF;
    END $$
  `);
  console.log("✓ ArtworkComment table ready");
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
