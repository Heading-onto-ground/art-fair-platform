import type { PrismaClient } from "@prisma/client";

export const PUBLIC_HISTORY_CACHE_TAG = "rob-public-artist-history";
export const PUBLIC_HISTORY_REVALIDATE_SECONDS = 120;

/**
 * One round trip for a public artist history.
 * Prisma's include loader issues a separate query per relation, and the
 * production pool allows one connection, so those queries run serially
 * across the US-to-Mumbai database path.
 * This statement reads only public exhibition facts and public works.
 */

export type PublicHistoryGraph = {
  entity: {
    id: string;
    slug: string;
    canonicalName: string;
    nativeName: string | null;
    birthYear: number | null;
    country: string | null;
    city: string | null;
    officialWebsite: string | null;
    profileId: string | null;
    profileArtistId: string | null;
    profileUserId: string | null;
  };
  exhibitions: PublicGraphExhibition[];
  works: { id: string; title: string | null; imageUrl: string }[];
};

export type PublicGraphExhibition = {
  id: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  city: string | null;
  country: string | null;
  createdBy: string | null;
  space: { id: string; name: string; city: string | null; country: string | null; slug: string | null } | null;
  curator: { id: string; name: string; slug: string | null } | null;
  meta: {
    slug: string | null;
    datePrecision: string;
    startYear: number | null;
    startMonth: number | null;
    startDay: number | null;
    endYear: number | null;
    endMonth: number | null;
    endDay: number | null;
    clearanceStatus: string;
    contributorKind: string | null;
    publicationStatus: string;
    origin: string;
    sourceClearance: string;
  } | null;
  sources: {
    id: string;
    url: string;
    sourceName: string;
    sourceType: string;
    clearanceStatus: string;
    internalUseDecision: string;
    externalPermission: string;
    contentScope: string;
  }[];
  artists: { id: string; slug: string; canonicalName: string; nativeName: string | null }[];
  unresolved: { label: string; status: string }[];
};

function asGraph(value: unknown): PublicHistoryGraph | null {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== "object" || !("entity" in parsed) || !parsed.entity) return null;
  return parsed as PublicHistoryGraph;
}

export async function queryPublicHistory(prisma: PrismaClient, key: string): Promise<PublicHistoryGraph | null> {
  const rows = await prisma.$queryRaw<Array<{ graph: unknown }>>`
    WITH matched AS (
      SELECT
        ae.id,
        ae.slug,
        ae."canonicalName",
        ae."nativeName",
        ae."birthYear",
        ae.country,
        ae.city,
        ae."officialWebsite",
        ae."profileId",
        ap."artistId" AS "profileArtistId",
        ap."userId" AS "profileUserId"
      FROM "ArtistEntity" ae
      LEFT JOIN "ArtistProfile" ap ON ap.id = ae."profileId"
      WHERE ae.slug = ${key} OR ap."userId" = ${key} OR ap."artistId" = ${key}
      ORDER BY CASE WHEN ae.slug = ${key} THEN 0 ELSE 1 END, ae.slug
      LIMIT 1
    ),
    visible AS (
      SELECT ex.id
      FROM "Exhibition" ex
      LEFT JOIN "ExhibitionHistoryMeta" meta ON meta."exhibitionId" = ex.id
      WHERE ex."isPublic" = true
        AND (
          (meta."exhibitionId" IS NULL AND ex."createdBy" IS NOT NULL)
          OR (
            meta."publicationStatus" = 'PUBLIC'
            AND meta."sourceClearance" <> 'REJECTED'
            AND (
              meta.origin IN ('ARTIST_SUBMITTED', 'GALLERY_SUBMITTED', 'INSTITUTION_SUBMITTED', 'LEGACY_FIRST_PARTY')
              OR (meta.origin = 'ROB_RESEARCHED' AND meta."sourceClearance" = 'APPROVED')
              OR (
                meta.origin = 'ROB_RESEARCHED'
                AND EXISTS (
                  SELECT 1
                  FROM "ExhibitionSource" limited_link
                  JOIN "HistorySource" limited_source ON limited_source.id = limited_link."sourceId"
                  WHERE limited_link."exhibitionId" = ex.id
                    AND limited_source."internalUseDecision" = 'ALLOW_LIMITED'
                    AND limited_source."contentScope" = 'FACTUAL_METADATA_ONLY'
                )
              )
            )
          )
        )
    ),
    chosen AS (
      SELECT visible.id
      FROM visible
      JOIN "HistoryParticipation" participation ON participation."exhibitionId" = visible.id
      JOIN matched ON participation."artistEntityId" = matched.id
      UNION
      SELECT visible.id
      FROM visible
      JOIN "ExhibitionArtist" entry ON entry."exhibitionId" = visible.id AND entry.status = 'confirmed'
      JOIN matched ON entry."artistId" = matched."profileId"
      WHERE matched."profileId" IS NOT NULL
    )
    SELECT jsonb_build_object(
      'entity', (
        SELECT jsonb_build_object(
          'id', matched.id,
          'slug', matched.slug,
          'canonicalName', matched."canonicalName",
          'nativeName', matched."nativeName",
          'birthYear', matched."birthYear",
          'country', matched.country,
          'city', matched.city,
          'officialWebsite', matched."officialWebsite",
          'profileId', matched."profileId",
          'profileArtistId', matched."profileArtistId",
          'profileUserId', matched."profileUserId"
        )
        FROM matched
      ),
      'exhibitions', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', exhibition.id,
            'title', exhibition.title,
            'startDate', exhibition."startDate",
            'endDate', exhibition."endDate",
            'city', exhibition.city,
            'country', exhibition.country,
            'createdBy', exhibition."createdBy",
            'space', CASE WHEN space.id IS NULL THEN NULL ELSE jsonb_build_object(
              'id', space.id,
              'name', space.name,
              'city', space.city,
              'country', space.country,
              'slug', space_slug.slug
            ) END,
            'curator', CASE WHEN curator.id IS NULL THEN NULL ELSE jsonb_build_object(
              'id', curator.id,
              'name', curator.name,
              'slug', curator_slug.slug
            ) END,
            'meta', CASE WHEN meta."exhibitionId" IS NULL THEN NULL ELSE jsonb_build_object(
              'slug', meta.slug,
              'datePrecision', meta."datePrecision",
              'startYear', meta."startYear",
              'startMonth', meta."startMonth",
              'startDay', meta."startDay",
              'endYear', meta."endYear",
              'endMonth', meta."endMonth",
              'endDay', meta."endDay",
              'clearanceStatus', meta."clearanceStatus",
              'contributorKind', meta."contributorKind",
              'publicationStatus', meta."publicationStatus",
              'origin', meta.origin,
              'sourceClearance', meta."sourceClearance"
            ) END,
            'sources', COALESCE((
              SELECT jsonb_agg(jsonb_build_object(
                'id', source.id,
                'url', source.url,
                'sourceName', source."sourceName",
                'sourceType', source."sourceType",
                'clearanceStatus', source."clearanceStatus",
                'internalUseDecision', source."internalUseDecision",
                'externalPermission', source."externalPermission",
                'contentScope', source."contentScope"
              ) ORDER BY source."sourceName")
              FROM "ExhibitionSource" link
              JOIN "HistorySource" source ON source.id = link."sourceId"
              WHERE link."exhibitionId" = exhibition.id
            ), '[]'::jsonb),
            'artists', COALESCE((
              SELECT jsonb_agg(jsonb_build_object(
                'id', artist.id,
                'slug', artist.slug,
                'canonicalName', artist."canonicalName",
                'nativeName', artist."nativeName"
              ) ORDER BY artist."canonicalName")
              FROM "HistoryParticipation" participation
              JOIN "ArtistEntity" artist ON artist.id = participation."artistEntityId"
              WHERE participation."exhibitionId" = exhibition.id
            ), '[]'::jsonb),
            'unresolved', COALESCE((
              SELECT jsonb_agg(jsonb_build_object(
                'label', unresolved.label,
                'status', unresolved.status
              ) ORDER BY unresolved.label)
              FROM "HistoryUnresolvedName" unresolved
              WHERE unresolved."exhibitionId" = exhibition.id
            ), '[]'::jsonb)
          )
        )
        FROM chosen
        JOIN "Exhibition" exhibition ON exhibition.id = chosen.id
        LEFT JOIN "Space" space ON space.id = exhibition."spaceId"
        LEFT JOIN "SpaceSlug" space_slug ON space_slug."spaceId" = space.id
        LEFT JOIN "Curator" curator ON curator.id = exhibition."curatorId"
        LEFT JOIN "CuratorSlug" curator_slug ON curator_slug."curatorId" = curator.id
        LEFT JOIN "ExhibitionHistoryMeta" meta ON meta."exhibitionId" = exhibition.id
      ), '[]'::jsonb),
      'works', COALESCE((
        SELECT jsonb_agg(item ORDER BY created_at DESC)
        FROM (
          SELECT
            jsonb_build_object('id', work.id, 'title', work.title, 'imageUrl', work."imageUrl") AS item,
            work."createdAt" AS created_at
          FROM "Artwork" work
          JOIN matched ON work."artistId" = matched."profileId"
          WHERE matched."profileId" IS NOT NULL AND work."isPublic" = true
          ORDER BY work."createdAt" DESC
          LIMIT 24
        ) limited_works
      ), '[]'::jsonb)
    ) AS graph
  `;
  return asGraph(rows[0]?.graph);
}
