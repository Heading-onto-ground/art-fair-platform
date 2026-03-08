/**
 * Minimal migration script: add workNote column and ArtworkSeries table.
 * Run once: npx ts-node scripts/migrate-context.ts
 */
import { prisma } from "../lib/prisma";

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "ArtistProfile" ADD COLUMN IF NOT EXISTS "workNote" TEXT`);
  console.log("✓ workNote column added (or already exists)");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ArtworkSeries" (
      "id" TEXT NOT NULL,
      "artistId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "startYear" INTEGER,
      "endYear" INTEGER,
      "works" TEXT,
      "isPublic" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ArtworkSeries_pkey" PRIMARY KEY ("id")
    )
  `);
  console.log("✓ ArtworkSeries table created (or already exists)");

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ArtworkSeries_artistId_idx" ON "ArtworkSeries"("artistId")
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ArtworkSeries_artistId_fkey'
      ) THEN
        ALTER TABLE "ArtworkSeries"
          ADD CONSTRAINT "ArtworkSeries_artistId_fkey"
          FOREIGN KEY ("artistId") REFERENCES "ArtistProfile"("id") ON DELETE CASCADE;
      END IF;
    END $$
  `);
  console.log("✓ Foreign key added (or already exists)");
}

main()
  .then(() => { console.log("Migration complete."); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
