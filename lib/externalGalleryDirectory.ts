import { prisma } from "@/lib/prisma";
import type { CanonicalDirectoryGallery } from "@/lib/galleryDirectoryQuality";

let ensured = false;

export type ExternalGalleryDirectoryItem = {
  galleryId: string;
  matchKey: string | null;
  name: string;
  country: string;
  city: string;
  website: string | null;
  bio: string | null;
  sourcePortal: string | null;
  sourceCount: number | null;
  qualityScore: number | null;
  sourceUrl: string | null;
  externalEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function ensureExternalGalleryDirectoryTable() {
  if (ensured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ExternalGalleryDirectory" (
      "galleryId" TEXT NOT NULL,
      "matchKey" TEXT,
      "name" TEXT NOT NULL,
      "country" TEXT NOT NULL,
      "city" TEXT NOT NULL,
      "website" TEXT,
      "bio" TEXT,
      "sourcePortal" TEXT,
      "sourceCount" INTEGER NOT NULL DEFAULT 1,
      "qualityScore" INTEGER NOT NULL DEFAULT 0,
      "sourceUrl" TEXT,
      "externalEmail" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ExternalGalleryDirectory_pkey" PRIMARY KEY ("galleryId")
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ExternalGalleryDirectory_country_city_idx" ON "ExternalGalleryDirectory" ("country", "city");`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ExternalGalleryDirectory" ADD COLUMN IF NOT EXISTS "matchKey" TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ExternalGalleryDirectory" ADD COLUMN IF NOT EXISTS "sourceCount" INTEGER NOT NULL DEFAULT 1;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ExternalGalleryDirectory" ADD COLUMN IF NOT EXISTS "qualityScore" INTEGER NOT NULL DEFAULT 0;`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ExternalGalleryDirectory_quality_idx" ON "ExternalGalleryDirectory" ("qualityScore" DESC, "updatedAt" DESC);`
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "ExternalGalleryDirectory_matchKey_key" ON "ExternalGalleryDirectory" ("matchKey") WHERE "matchKey" IS NOT NULL;`
  );
  ensured = true;
}

export async function upsertExternalGalleryDirectory(items: CanonicalDirectoryGallery[]) {
  await ensureExternalGalleryDirectoryTable();
  for (const item of items) {
    const galleryId = String(item.galleryId || "").trim();
    const matchKey = String(item.matchKey || "").trim() || null;
    const name = String(item.name || "").trim();
    const country = String(item.country || "").trim();
    const city = String(item.city || "").trim();
    if (!galleryId || !name || !country || !city) continue;

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "ExternalGalleryDirectory"
        ("galleryId", "matchKey", "name", "country", "city", "website", "bio", "sourcePortal", "sourceCount", "qualityScore", "sourceUrl", "externalEmail", "updatedAt")
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT ("galleryId")
      DO UPDATE SET
        "matchKey" = EXCLUDED."matchKey",
        "name" = EXCLUDED."name",
        "country" = EXCLUDED."country",
        "city" = EXCLUDED."city",
        "website" = EXCLUDED."website",
        "bio" = EXCLUDED."bio",
        "sourcePortal" = EXCLUDED."sourcePortal",
        "sourceCount" = EXCLUDED."sourceCount",
        "qualityScore" = EXCLUDED."qualityScore",
        "sourceUrl" = EXCLUDED."sourceUrl",
        "externalEmail" = EXCLUDED."externalEmail",
        "updatedAt" = NOW();
      `,
      galleryId,
      matchKey,
      name,
      country,
      city,
      item.website || null,
      item.bio || null,
      item.sourcePortals.join(", ") || null,
      item.sourcePortals.length,
      item.qualityScore,
      item.sourceUrl || null,
      item.externalEmail || null
    );
  }
}

export async function listExternalGalleryDirectory() {
  await ensureExternalGalleryDirectoryTable();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        "galleryId",
        "matchKey",
        "name",
        "country",
        "city",
        "website",
        "bio",
        "sourcePortal",
        "sourceCount",
        "qualityScore",
        "sourceUrl",
        "externalEmail",
        "createdAt",
        "updatedAt"
      FROM "ExternalGalleryDirectory"
      ORDER BY "qualityScore" DESC, "updatedAt" DESC, "name" ASC;
    `
  )) as ExternalGalleryDirectoryItem[];
  return rows;
}

export async function getExternalGalleryDirectoryById(galleryId: string) {
  await ensureExternalGalleryDirectoryTable();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        "galleryId",
        "matchKey",
        "name",
        "country",
        "city",
        "website",
        "bio",
        "sourcePortal",
        "sourceCount",
        "qualityScore",
        "sourceUrl",
        "externalEmail",
        "createdAt",
        "updatedAt"
      FROM "ExternalGalleryDirectory"
      WHERE "galleryId" = $1
      LIMIT 1;
    `,
    galleryId
  )) as ExternalGalleryDirectoryItem[];
  return rows[0] || null;
}

