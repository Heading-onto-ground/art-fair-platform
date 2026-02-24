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
  instagram: string | null;
  foundedYear: number | null;
  spaceSize: string | null;
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
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ExternalGalleryDirectory" ADD COLUMN IF NOT EXISTS "instagram" TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ExternalGalleryDirectory" ADD COLUMN IF NOT EXISTS "foundedYear" INTEGER;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ExternalGalleryDirectory" ADD COLUMN IF NOT EXISTS "spaceSize" TEXT;`
  );
  ensured = true;
}

export async function upsertExternalGalleryDirectory(items: CanonicalDirectoryGallery[]) {
  await ensureExternalGalleryDirectoryTable();
  const normalizedRows = items
    .map((item) => {
      const galleryId = String(item.galleryId || "").trim();
      // Keep nullable to avoid unique-index conflicts across heterogeneous source merges.
      const matchKey = null;
      const name = String(item.name || "").trim();
      const country = String(item.country || "").trim();
      const city = String(item.city || "").trim();
      if (!galleryId || !name || !country || !city) return null;
      return {
        galleryId,
        matchKey,
        name,
        country,
        city,
        website: item.website || null,
        bio: item.bio || null,
        sourcePortal: item.sourcePortals.join(", ") || null,
        sourceCount: item.sourcePortals.length,
        qualityScore: item.qualityScore,
        sourceUrl: item.sourceUrl || null,
        externalEmail: item.externalEmail || null,
        instagram: item.instagram || null,
        foundedYear: item.foundedYear ?? null,
        spaceSize: item.spaceSize || null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const byGalleryId = new Map<string, (typeof normalizedRows)[number]>();
  for (const row of normalizedRows) {
    byGalleryId.set(row.galleryId, row);
  }
  const rows = Array.from(byGalleryId.values());

  const batchSize = 120;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values: any[] = [];
    const tuples: string[] = [];
    for (const row of batch) {
      const offset = values.length;
      values.push(
        row.galleryId,
        row.matchKey,
        row.name,
        row.country,
        row.city,
        row.website,
        row.bio,
        row.sourcePortal,
        row.sourceCount,
        row.qualityScore,
        row.sourceUrl,
        row.externalEmail,
        row.instagram,
        row.foundedYear,
        row.spaceSize
      );
      tuples.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, NOW())`
      );
    }

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "ExternalGalleryDirectory"
        ("galleryId", "matchKey", "name", "country", "city", "website", "bio", "sourcePortal", "sourceCount", "qualityScore", "sourceUrl", "externalEmail", "instagram", "foundedYear", "spaceSize", "updatedAt")
      VALUES
        ${tuples.join(",\n")}
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
        "instagram" = COALESCE(EXCLUDED."instagram", "ExternalGalleryDirectory"."instagram"),
        "foundedYear" = COALESCE(EXCLUDED."foundedYear", "ExternalGalleryDirectory"."foundedYear"),
        "spaceSize" = COALESCE(EXCLUDED."spaceSize", "ExternalGalleryDirectory"."spaceSize"),
        "updatedAt" = NOW();
      `,
      ...values
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
        "instagram",
        "foundedYear",
        "spaceSize",
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
        "instagram",
        "foundedYear",
        "spaceSize",
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

