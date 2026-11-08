import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { publicSitemapEntries } from "@/lib/history/sitemapEntries";
import { HISTORY_READY_MIN, SPACE_INDEX_MIN } from "@/lib/history/policy";

export const revalidate = 21600;

const MAX_PER_TYPE = 5000;
const PUBLIC_HISTORY = `
  m."publicationStatus" = 'PUBLIC'
  AND (
    m."origin" <> 'ROB_RESEARCHED'
    OR m."sourceClearance" = 'APPROVED'
    OR (
      m."sourceClearance" <> 'REJECTED'
      AND EXISTS (
      SELECT 1 FROM "ExhibitionSource" es
      JOIN "HistorySource" hs ON hs.id = es."sourceId"
      WHERE es."exhibitionId" = x.id
        AND hs."internalUseDecision" IN ('ALLOW_LIMITED', 'FACTUAL_USE_OK')
        AND hs."contentScope" = 'FACTUAL_METADATA_ONLY'
    )
    )
  )
`;

const ARTIST_COUNT = `
  x."isPublic" = true
  AND (
    (m."exhibitionId" IS NULL AND x."createdBy" IS NOT NULL)
    OR (${PUBLIC_HISTORY})
  )
`;

async function required<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (error) {
    console.error(`sitemap: ${label} query failed`, error);
    // Production and preview must fail closed so a dropped artist or exhibition
    // bucket cannot ship as an empty success. CI builds use a dummy database.
    if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview") throw error;
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const historyArtists = await required<{ slug: string; updatedAt: Date }>("history-artists", () =>
    prisma.$queryRawUnsafe(
      `SELECT e.slug, e."updatedAt"
       FROM "ArtistEntity" e
       WHERE (
         SELECT COUNT(DISTINCT p."exhibitionId")
         FROM "HistoryParticipation" p
         JOIN "Exhibition" x ON x.id = p."exhibitionId"
         LEFT JOIN "ExhibitionHistoryMeta" m ON m."exhibitionId" = x.id
         WHERE p."artistEntityId" = e.id
           AND ${ARTIST_COUNT}
       ) >= ${HISTORY_READY_MIN}
       ORDER BY e."updatedAt" DESC
       LIMIT ${MAX_PER_TYPE}`,
    ),
  );

  const historyExhibitions = await required<{ slug: string; updatedAt: Date }>("history-exhibitions", () =>
    prisma.$queryRawUnsafe(
      `SELECT m.slug, x."updatedAt"
       FROM "ExhibitionHistoryMeta" m
       JOIN "Exhibition" x ON x.id = m."exhibitionId"
       WHERE m.slug IS NOT NULL
         AND x."isPublic" = true
         AND ${PUBLIC_HISTORY}
         AND EXISTS (
           SELECT 1 FROM "HistoryParticipation" p WHERE p."exhibitionId" = x.id
         )
       ORDER BY x."updatedAt" DESC
       LIMIT ${MAX_PER_TYPE}`,
    ),
  );

  const historySpaces = await required<{ slug: string }>("history-spaces", () =>
    prisma.$queryRawUnsafe(
      `SELECT s.slug
       FROM "SpaceSlug" s
       WHERE (
         SELECT COUNT(*)
         FROM "Exhibition" x
         JOIN "ExhibitionHistoryMeta" m ON m."exhibitionId" = x.id
         WHERE x."spaceId" = s."spaceId"
           AND m.slug IS NOT NULL
           AND x."isPublic" = true
           AND ${PUBLIC_HISTORY}
       ) >= ${SPACE_INDEX_MIN}
       LIMIT ${MAX_PER_TYPE}`,
    ),
  );

  return publicSitemapEntries({
    artists: historyArtists,
    exhibitions: historyExhibitions,
    spaces: historySpaces,
  });
}
