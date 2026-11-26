import { prisma } from "@/lib/prisma";
import { computeArtistTrust } from "@/lib/trustScore";
import { getVerificationByArtistId } from "@/lib/verification";
import { publicArtworkImagePath, publicArtworkImagePaths, seriesCoverArtworkId } from "@/lib/artist/publicProfile";

type ProfileRow = {
  userId: string;
  artistId: string;
  name: string;
  exhibitions_public: boolean;
  workNote?: string | null;
  bio?: string | null;
  id: string;
  country?: string | null;
  city?: string | null;
  genre?: string | null;
  startedYear?: number | null;
  instagram?: string | null;
  website?: string | null;
  profileImage?: string | null;
  portfolioUrl?: string | null;
};

type ArtworkMeta = {
  id: string;
  title: string | null;
  caption: string | null;
  medium: string | null;
  postType: string | null;
  seriesId: string | null;
  seriesTitle: string | null;
  inPortfolio: boolean;
  portfolioOrder: number | null;
  createdAt: Date;
  hasImage: boolean;
  imageCount: number;
};

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function loadPublicArtist(artistId: string) {
  const profileRows = await prisma.$queryRawUnsafe(
    `SELECT "userId", "artistId", name, "exhibitions_public", "workNote", bio, id, country, city, genre, "startedYear", instagram, website, "profileImage", "portfolioUrl"
     FROM "ArtistProfile" WHERE "artistId" = $1 LIMIT 1`,
    artistId,
  ).catch(() => []) as ProfileRow[];
  const profile = profileRows[0];
  if (!profile || !profile.exhibitions_public) return null;

  const [exhibitions, series, artEvents, artworkMeta, selfExhibitions, verification] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT "galleryName", theme, country, city, "acceptedAt"
       FROM artist_exhibitions WHERE "artistId" = $1 ORDER BY "acceptedAt" DESC`,
      profile.userId,
    ).catch(() => []) as Promise<Array<{ galleryName: string; theme: string; country: string; city: string; acceptedAt: string }>>,
    prisma.artworkSeries.findMany({
      where: { artistId: profile.id, isPublic: true },
      orderBy: { startYear: "desc" },
      select: { id: true, title: true, description: true, startYear: true, endYear: true, works: true },
    }).catch(() => []),
    prisma.artEvent.findMany({
      where: { artistId: profile.id, isPublic: true },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      select: { id: true, eventType: true, title: true, year: true, description: true },
    }).catch(() => []),
    prisma.$queryRawUnsafe(
      `SELECT a.id, a.title, a.caption, a.medium, a."postType", a."seriesId", a."inPortfolio", a."portfolioOrder", a."createdAt",
              s.title AS "seriesTitle",
              (
                COALESCE(a."imageUrl", '') <> ''
                OR EXISTS (
                  SELECT 1 FROM "ArtworkImage" ai
                  WHERE ai."artworkId" = a.id AND COALESCE(ai.url, '') <> ''
                )
              ) AS "hasImage",
              (
                SELECT COUNT(*)::int FROM "ArtworkImage" ai
                WHERE ai."artworkId" = a.id AND COALESCE(ai.url, '') <> ''
              ) AS "imageCount"
       FROM "Artwork" a
       LEFT JOIN "ArtworkSeries" s ON s.id = a."seriesId"
       WHERE a."artistId" = $1 AND a."isPublic" = true
       ORDER BY a."portfolioOrder" ASC NULLS LAST, a."createdAt" DESC`,
      profile.id,
    ).catch(() => []) as Promise<ArtworkMeta[]>,
    prisma.exhibition.findMany({
      where: {
        isPublic: true,
        OR: [
          { createdBy: profile.id },
          { artists: { some: { artistId: profile.id } } },
        ],
      },
      include: {
        space: true,
        curator: true,
        artists: { include: { artist: { select: { id: true, name: true, artistId: true } } } },
      },
      orderBy: { startDate: "desc" },
    }).catch(() => []),
    getVerificationByArtistId(String(profile.artistId || "")).catch(() => null),
  ]);

  const visible = artworkMeta;
  const selected = visible.filter((work) => work.inPortfolio);
  const { loadHashtagsForArtworks } = await import("@/lib/artworkHashtags");
  const tagMap = await loadHashtagsForArtworks(selected.map((work) => work.id)).catch(() => new Map<string, string[]>());
  const imagePaths = (work: ArtworkMeta) => {
    const stored = Number(work.imageCount);
    const count = stored > 0 ? stored : work.hasImage ? 1 : 0;
    return publicArtworkImagePaths(work.id, count);
  };

  const trust = computeArtistTrust({
    bio: profile.bio ?? null,
    country: profile.country ?? null,
    city: profile.city ?? null,
    instagram: profile.instagram ?? null,
    website: profile.website ?? null,
    profileImage: profile.profileImage ?? null,
    hasPortfolio: !!profile.portfolioUrl,
    seriesCount: series.length,
    artEventCount: artEvents.length,
    exhibitionCount: selfExhibitions.length + exhibitions.length,
  });

  const payload = {
    name: profile.name,
    artistId: profile.artistId,
    userId: profile.userId ?? null,
    workNote: profile.workNote ?? null,
    bio: profile.bio ?? null,
    country: profile.country ?? null,
    city: profile.city ?? null,
    genre: profile.genre ?? null,
    startedYear: profile.startedYear ?? null,
    instagram: profile.instagram ?? null,
    website: profile.website ?? null,
    profileImage: profile.profileImage ?? null,
    exhibitions,
    selfExhibitions: selfExhibitions.map((item: {
      startDate?: Date | string | null;
      endDate?: Date | string | null;
      createdAt?: Date | string | null;
    }) => ({
      ...item,
      startDate: iso(item.startDate),
      endDate: iso(item.endDate),
      createdAt: iso(item.createdAt),
    })),
    series: series.map((item: { id: string }) => {
      const coverId = seriesCoverArtworkId(item.id, visible.map((work) => ({
        id: work.id,
        seriesId: work.seriesId,
        isPublic: true,
        inPortfolio: work.inPortfolio,
        hasImage: work.hasImage,
      })));
      return {
        ...item,
        coverImageUrl: coverId ? publicArtworkImagePath(coverId) : null,
      };
    }),
    artEvents,
    artworks: selected.map((work) => ({
      id: work.id,
      title: work.title,
      caption: work.caption,
      imageUrl: imagePaths(work)[0] ?? null,
      imageUrls: imagePaths(work),
      medium: work.medium?.trim() || null,
      postType: work.postType === "exhibition" ? "exhibition" : "work",
      seriesId: work.seriesId,
      seriesTitle: work.seriesTitle,
      hashtags: tagMap.get(work.id) ?? [],
      createdAt: iso(work.createdAt),
    })),
    trustScore: trust.score,
    trustLevel: trust.level,
    trustSignals: trust.signals,
    verification: verification
      ? { verified: true, label: verification.label, approvedAt: verification.approvedAt }
      : { verified: false, label: null, approvedAt: null },
  };
  return JSON.parse(JSON.stringify(payload)) as typeof payload;
}
