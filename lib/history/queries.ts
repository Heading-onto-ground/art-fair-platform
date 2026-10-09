import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma as untypedPrisma } from "@/lib/prisma";
import {
  careerSpan,
  decodeDisplayText,
  displayCountry,
  groupByYear,
  momentPlace,
  signatureColumns,
  type DotMark,
} from "@/lib/history/display";
import {
  dedupeById,
  densityForCount,
  formatHistoryDate,
  isFilledMarker,
  isFirstPartyImage,
  isIndexEligible,
  legacyArtistRedirect,
  provenanceLabel,
  type ContributorKind,
} from "@/lib/history/policy";
import type {
  HistoryArtistView,
  HistoryConnection,
  HistoryExhibitionPage,
  HistoryExhibitionView,
  HistoryPersonRef,
  HistorySearchResult,
  HistorySourceView,
  HistorySpacePage,
} from "@/lib/history/types";

const prisma = untypedPrisma as PrismaClient;

const publicExhibitionWhere: Prisma.ExhibitionWhereInput = {
  isPublic: true,
  OR: [{ historyMeta: { is: null } }, { historyMeta: { is: { clearanceStatus: "APPROVED" } } }],
};

type SourceRow = { id: string; url: string; sourceName: string; sourceType: string; clearanceStatus: string };
type ArtistRow = { id: string; slug: string; canonicalName: string; nativeName: string | null };
type MetaRow = {
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
};

type ExhibitionRow = {
  id: string;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  city: string | null;
  country: string | null;
  createdBy: string | null;
  space: { id: string; name: string; city: string | null; country: string | null; slugRecord: { slug: string } | null } | null;
  curator: { id: string; name: string; slugRecord: { slug: string } | null } | null;
  historyMeta: MetaRow | null;
  historySources: { source: SourceRow }[];
  historyArtists: { artist: ArtistRow }[];
  unresolvedNames: { label: string; status: string }[];
};

const exhibitionInclude = {
  space: { include: { slugRecord: true } },
  curator: { include: { slugRecord: true } },
  historyMeta: true,
  historySources: { include: { source: true } },
  historyArtists: { include: { artist: { select: { id: true, slug: true, canonicalName: true, nativeName: true } } } },
  unresolvedNames: { select: { label: true, status: true } },
} satisfies Prisma.ExhibitionInclude;

function contributorOf(row: ExhibitionRow): ContributorKind | null {
  const kind = row.historyMeta?.contributorKind;
  if (kind === "artist" || kind === "gallery" || kind === "institution") return kind;
  return row.createdBy ? "artist" : null;
}

function approvedSources(row: ExhibitionRow): HistorySourceView[] {
  return row.historySources
    .map((join) => join.source)
    .filter((source) => source.clearanceStatus === "APPROVED")
    .map((source) => ({
      id: source.id,
      url: source.url,
      sourceName: source.sourceName,
      sourceType: source.sourceType,
    }));
}

function dateParts(row: ExhibitionRow) {
  const meta = row.historyMeta;
  if (meta) {
    return {
      precision: meta.datePrecision,
      year: meta.startYear,
      month: meta.datePrecision === "DAY" || meta.datePrecision === "MONTH" ? meta.startMonth : null,
      day: meta.datePrecision === "DAY" ? meta.startDay : null,
      endYear: meta.endYear,
      endMonth: meta.datePrecision === "DAY" || meta.datePrecision === "MONTH" ? meta.endMonth : null,
      endDay: meta.datePrecision === "DAY" ? meta.endDay : null,
    };
  }
  if (!row.startDate) {
    return { precision: "UNKNOWN", year: null, month: null, day: null, endYear: null, endMonth: null, endDay: null };
  }
  const end = row.endDate;
  return {
    precision: "DAY",
    year: row.startDate.getUTCFullYear(),
    month: row.startDate.getUTCMonth() + 1,
    day: row.startDate.getUTCDate(),
    endYear: end ? end.getUTCFullYear() : null,
    endMonth: end ? end.getUTCMonth() + 1 : null,
    endDay: end ? end.getUTCDate() : null,
  };
}

export function toExhibitionView(row: ExhibitionRow): HistoryExhibitionView {
  const dates = dateParts(row);
  const place = momentPlace({
    title: row.title,
    venue: row.space?.name ?? null,
    city: row.city ?? row.space?.city ?? null,
    country: displayCountry(row.country ?? row.space?.country ?? null),
  });
  const sources = approvedSources(row);
  const artists: HistoryPersonRef[] = row.historyArtists.map((join) => ({
    id: join.artist.id,
    slug: join.artist.slug,
    name: decodeDisplayText(join.artist.canonicalName),
    nativeName: join.artist.nativeName ? decodeDisplayText(join.artist.nativeName) : null,
  }));
  return {
    id: row.id,
    slug: row.historyMeta?.slug ?? null,
    title: place.title,
    year: dates.year,
    precision: dates.precision,
    dateLabel: formatHistoryDate(dates),
    endLabel: dates.endYear
      ? formatHistoryDate({
          precision: dates.precision,
          year: dates.endYear,
          month: dates.endMonth,
          day: dates.endDay,
        })
      : null,
    spaceId: row.space?.id ?? null,
    spaceName: row.space ? decodeDisplayText(row.space.name) : null,
    spaceSlug: row.space?.slugRecord?.slug ?? null,
    city: row.city ? decodeDisplayText(row.city) : row.space?.city ? decodeDisplayText(row.space.city) : null,
    country: displayCountry(row.country ?? row.space?.country ?? null),
    curatorId: row.curator?.id ?? null,
    curatorName: row.curator ? decodeDisplayText(row.curator.name) : null,
    curatorSlug: row.curator?.slugRecord?.slug ?? null,
    artists,
    sources,
    provenance: provenanceLabel({ official: sources.length > 0, contributor: contributorOf(row), conflict: false }),
    review: place.review,
  };
}

function connectionsFor(selfId: string, exhibitions: HistoryExhibitionView[]) {
  const artists = new Map<string, HistoryConnection>();
  const spaces = new Map<string, HistoryConnection>();
  const curators = new Map<string, HistoryConnection>();
  for (const exhibition of exhibitions) {
    for (const artist of exhibition.artists) {
      if (artist.id === selfId) continue;
      const current = artists.get(artist.id) ?? {
        id: artist.id,
        slug: artist.slug,
        name: artist.name,
        nativeName: artist.nativeName,
        count: 0,
        exhibitions: [],
      };
      current.count += 1;
      current.exhibitions.push({ id: exhibition.id, slug: exhibition.slug, title: exhibition.title });
      artists.set(artist.id, current);
    }
    if (exhibition.spaceId && exhibition.spaceName) {
      const current = spaces.get(exhibition.spaceId) ?? {
        id: exhibition.spaceId,
        slug: exhibition.spaceSlug,
        name: exhibition.spaceName,
        nativeName: null,
        count: 0,
        exhibitions: [],
      };
      current.count += 1;
      current.exhibitions.push({ id: exhibition.id, slug: exhibition.slug, title: exhibition.title });
      spaces.set(exhibition.spaceId, current);
    }
    if (exhibition.curatorId && exhibition.curatorName) {
      const current = curators.get(exhibition.curatorId) ?? {
        id: exhibition.curatorId,
        slug: exhibition.curatorSlug,
        name: exhibition.curatorName,
        nativeName: null,
        count: 0,
        exhibitions: [],
      };
      current.count += 1;
      current.exhibitions.push({ id: exhibition.id, slug: exhibition.slug, title: exhibition.title });
      curators.set(exhibition.curatorId, current);
    }
  }
  const byCount = (rows: HistoryConnection[]) => rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { artists: byCount([...artists.values()]), spaces: byCount([...spaces.values()]), curators: byCount([...curators.values()]) };
}

async function exhibitionsForEntity(entityId: string, profileId: string | null): Promise<HistoryExhibitionView[]> {
  const [participations, firstParty] = await Promise.all([
    prisma.historyParticipation.findMany({
      where: { artistEntityId: entityId, exhibition: publicExhibitionWhere },
      include: { exhibition: { include: exhibitionInclude } },
    }),
    profileId
      ? prisma.exhibitionArtist.findMany({
          where: { artistId: profileId, status: "confirmed", exhibition: publicExhibitionWhere },
          include: { exhibition: { include: exhibitionInclude } },
        })
      : Promise.resolve([]),
  ]);
  const rows = dedupeById([
    ...participations.map((row) => row.exhibition),
    ...firstParty.map((row) => row.exhibition),
  ]);
  return rows
    .map((row) => toExhibitionView(row as ExhibitionRow))
    .sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.title.localeCompare(b.title));
}

export function signatureFor(exhibitions: { year: number | null; precision: string; id: string }[]): number[] {
  const groups = groupByYear(
    exhibitions.map((exhibition) => ({
      id: exhibition.id,
      year: exhibition.year,
      mark: (isFilledMarker(exhibition.precision) ? "filled" : "open") as DotMark,
    })),
  );
  return signatureColumns(groups.map((group) => group.count));
}

async function presentArtist(entity: {
  id: string;
  slug: string;
  canonicalName: string;
  nativeName: string | null;
  birthYear: number | null;
  country: string | null;
  city: string | null;
  officialWebsite: string | null;
  profileId: string | null;
  profile: { artistId: string } | null;
}): Promise<HistoryArtistView> {
  const exhibitions = await exhibitionsForEntity(entity.id, entity.profileId);
  const links = connectionsFor(entity.id, exhibitions);
  const density = densityForCount(exhibitions.length);
  const works = entity.profileId
    ? await prisma.artwork.findMany({
        where: { artistId: entity.profileId, isPublic: true },
        select: { id: true, title: true, imageUrl: true },
        orderBy: { createdAt: "desc" },
        take: 24,
      })
    : [];
  return {
    slug: entity.slug,
    canonicalName: decodeDisplayText(entity.canonicalName),
    nativeName: entity.nativeName ? decodeDisplayText(entity.nativeName) : null,
    birthYear: entity.birthYear,
    country: displayCountry(entity.country),
    city: entity.city ? decodeDisplayText(entity.city) : null,
    officialWebsite: entity.officialWebsite,
    exhibitionCount: exhibitions.length,
    density,
    indexEligible: isIndexEligible(density),
    worksHref: entity.profile?.artistId ? `/artist/public/${entity.profile.artistId}` : null,
    exhibitions,
    ...links,
    works: works.map((work) => ({
      id: work.id,
      title: work.title?.trim() || "Untitled",
      year: null,
      imageUrl: isFirstPartyImage(work.imageUrl) ? work.imageUrl : null,
    })),
  };
}

export async function loadPublicArtist(key: string): Promise<
  { kind: "missing" } | { kind: "redirect"; to: string; artist: HistoryArtistView } | { kind: "history"; artist: HistoryArtistView }
> {
  const direct = await prisma.artistEntity.findUnique({
    where: { slug: key },
    include: { profile: { select: { artistId: true, userId: true } } },
  });
  if (direct) return { kind: "history", artist: await presentArtist(direct) };

  const profile = await prisma.artistProfile.findFirst({
    where: { OR: [{ userId: key }, { artistId: key }] },
    include: { artistEntity: { include: { profile: { select: { artistId: true, userId: true } } } } },
  });
  if (!profile?.artistEntity) return { kind: "missing" };
  const artist = await presentArtist(profile.artistEntity);
  const to = legacyArtistRedirect({
    requested: key,
    userId: profile.userId,
    artistId: profile.artistId,
    slug: artist.slug,
  });
  if (to) return { kind: "redirect", to, artist };
  return { kind: "history", artist };
}

export async function searchArtists(rawQuery: string): Promise<HistorySearchResult[]> {
  const query = rawQuery.trim();
  if (query.length < 1) return [];
  const rows = await prisma.artistEntity.findMany({
    where: {
      OR: [
        { canonicalName: { contains: query, mode: "insensitive" } },
        { nativeName: { contains: query, mode: "insensitive" } },
        { aliases: { some: { label: { contains: query, mode: "insensitive" } } } },
      ],
    },
    include: {
      profile: {
        select: {
          exhibitionEntries: {
            where: { status: "confirmed", exhibition: publicExhibitionWhere },
            select: { exhibitionId: true },
          },
        },
      },
      participations: {
        where: { exhibition: publicExhibitionWhere },
        select: { exhibition: { select: { id: true, historyMeta: { select: { startYear: true, datePrecision: true } }, startDate: true } } },
      },
    },
    orderBy: { canonicalName: "asc" },
    take: 20,
  });
  return rows.map((row) => {
    const dated = row.participations.map((item) => {
      const exhibition = item.exhibition;
      const meta = exhibition.historyMeta;
      return {
        id: exhibition.id,
        year: meta ? meta.startYear : exhibition.startDate?.getUTCFullYear() ?? null,
        precision: meta?.datePrecision ?? (exhibition.startDate ? "DAY" : "UNKNOWN"),
      };
    });
    const ids = new Set(dated.map((item) => item.id));
    for (const entry of row.profile?.exhibitionEntries ?? []) ids.add(entry.exhibitionId);
    return {
      slug: row.slug,
      canonicalName: decodeDisplayText(row.canonicalName),
      nativeName: row.nativeName ? decodeDisplayText(row.nativeName) : null,
      birthYear: row.birthYear,
      exhibitionCount: ids.size,
      signature: signatureFor(dated),
    };
  });
}

export async function loadExhibitionPage(key: string): Promise<HistoryExhibitionPage | null> {
  const meta = await prisma.exhibitionHistoryMeta.findFirst({
    where: { OR: [{ slug: key }, { exhibitionId: key }] },
    include: { exhibition: { include: exhibitionInclude } },
  });
  if (!meta || !meta.exhibition.isPublic || meta.clearanceStatus !== "APPROVED") return null;
  const view = toExhibitionView(meta.exhibition as ExhibitionRow);
  if (!view.slug) return null;
  return {
    id: view.id,
    slug: view.slug,
    title: view.title,
    dateLabel: view.dateLabel,
    endLabel: view.endLabel,
    spaceName: view.spaceName,
    spaceSlug: view.spaceSlug,
    city: view.city,
    country: view.country,
    curatorName: view.curatorName,
    curatorSlug: view.curatorSlug,
    artists: view.artists,
    sources: view.sources,
    provenance: view.provenance,
    unresolved: meta.exhibition.unresolvedNames.map((name) => ({ label: name.label, status: name.status })),
    indexEligible: view.artists.length > 0,
  };
}

export async function loadSpacePage(key: string): Promise<HistorySpacePage | null> {
  const slug = await prisma.spaceSlug.findUnique({
    where: { slug: key },
    include: { space: true },
  });
  if (!slug) return null;
  const exhibitions = await prisma.exhibition.findMany({
    where: { spaceId: slug.spaceId, ...publicExhibitionWhere },
    include: exhibitionInclude,
    orderBy: { startDate: "asc" },
  });
  const views = exhibitions.map((row) => toExhibitionView(row as ExhibitionRow));
  const span = careerSpan(views.filter((view) => view.year != null).map((view) => ({ year: view.year as number })));
  return {
    id: slug.spaceId,
    slug: slug.slug,
    name: decodeDisplayText(slug.space.name),
    city: slug.space.city ? decodeDisplayText(slug.space.city) : null,
    country: displayCountry(slug.space.country),
    exhibitions: views.map((view) => ({
      id: view.id,
      slug: view.slug,
      title: view.title,
      year: view.year,
      dateLabel: view.dateLabel,
      artists: view.artists,
    })),
    indexEligible: Boolean(span) && views.length >= 1,
  };
}

export async function listExplore() {
  const [artists, exhibitions, spaces] = await Promise.all([
    prisma.artistEntity.findMany({
      include: { participations: { where: { exhibition: publicExhibitionWhere }, select: { exhibitionId: true } } },
      orderBy: { canonicalName: "asc" },
      take: 60,
    }),
    prisma.exhibitionHistoryMeta.findMany({
      where: { clearanceStatus: "APPROVED", exhibition: { isPublic: true } },
      include: { exhibition: { select: { title: true, city: true, country: true, startDate: true } } },
      orderBy: { startYear: "desc" },
      take: 40,
    }),
    prisma.spaceSlug.findMany({
      include: { space: { select: { name: true, city: true, country: true } } },
      take: 40,
      orderBy: { slug: "asc" },
    }),
  ]);
  const decades = new Set<number>();
  const cities = new Set<string>();
  const countries = new Set<string>();
  for (const row of exhibitions) {
    if (row.startYear) decades.add(Math.floor(row.startYear / 10) * 10);
    if (row.exhibition.city) cities.add(decodeDisplayText(row.exhibition.city));
    const country = displayCountry(row.exhibition.country);
    if (country) countries.add(country);
  }
  return {
    artists: artists
      .map((artist) => ({
        slug: artist.slug,
        canonicalName: decodeDisplayText(artist.canonicalName),
        nativeName: artist.nativeName,
        exhibitionCount: new Set(artist.participations.map((item) => item.exhibitionId)).size,
      }))
      .filter((artist) => artist.exhibitionCount > 0),
    exhibitions: exhibitions.map((row) => ({
      slug: row.slug,
      title: decodeDisplayText(row.exhibition.title),
      year: row.startYear,
    })),
    spaces: spaces.map((row) => ({
      slug: row.slug,
      name: decodeDisplayText(row.space.name),
      city: row.space.city,
      country: displayCountry(row.space.country),
    })),
    decades: decades.size >= 2 ? [...decades].sort((a, b) => a - b) : [],
    cities: cities.size >= 2 ? [...cities].sort() : [],
    countries: countries.size >= 2 ? [...countries].sort() : [],
  };
}

export async function contentGateCounts() {
  const [approvedSources, importedExhibitions, artists] = await Promise.all([
    prisma.historySource.count({ where: { clearanceStatus: "APPROVED" } }),
    prisma.exhibitionHistoryMeta.count({ where: { clearanceStatus: "APPROVED", exhibition: { isPublic: true } } }),
    prisma.artistEntity.findMany({
      select: { participations: { where: { exhibition: publicExhibitionWhere }, select: { exhibitionId: true } } },
    }),
  ]);
  let historyReady = 0;
  let rich = 0;
  const counts: number[] = [];
  for (const artist of artists) {
    const count = new Set(artist.participations.map((item) => item.exhibitionId)).size;
    const density = densityForCount(count);
    if (density === "HISTORY_READY") historyReady += 1;
    if (density === "RICH_HISTORY") rich += 1;
    if (density === "HISTORY_READY" || density === "RICH_HISTORY") counts.push(count);
  }
  return { approvedSources, importedExhibitions, publicArtists: artists.length, historyReady, rich, indexCounts: counts };
}
