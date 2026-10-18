import type { PrismaClient } from "@prisma/client";
import { prisma as untypedPrisma } from "@/lib/prisma";
import { journeyDepthFromCounts, type JourneyDepthReport } from "@/lib/history/analytics";
import { DEMAND_SEPARATION_AT } from "@/lib/history/demandQuality";
import { namedFrontier, type NamedFrontier } from "@/lib/history/frontierCases";
import { buildGraphFrontier, largestComponentSize, type FrontierRow, type FrontierStatus, type GrowthSnapshot } from "@/lib/history/growth";
import { aliasLookupEqual, resolveVerifiedAlias } from "@/lib/history/identity";
import { buildDocumentedPaths } from "@/lib/history/paths";
import { densityForCount } from "@/lib/history/policy";
import { publicExhibitionWhere } from "@/lib/history/queries";

const prisma = untypedPrisma as PrismaClient;

export type HistoryHealth = {
  publicArtists: number;
  historyReady: number;
  richHistory: number;
  lowDensity: number;
  isolatedArtists: string[];
  sharedExhibitions: number;
  largestComponent: number;
  twoHopPairs: number;
  documentedPaths: number;
  readablePaths: number;
  threeArtistRoutes: number;
  unresolvedParticipants: string[];
  legacyMixedSearches: { query: string; count: number }[];
  noResultSearches: {
    query: string;
    count: number;
    operatorCount: number;
    lastSearched: string | null;
    possibleAlias: string | null;
    unresolvedCandidate: string | null;
    frontierStatus: FrontierStatus | null;
  }[];
  journey: JourneyDepthReport;
  namedFrontier: NamedFrontier[];
  frontier: FrontierRow[];
};

export async function loadHistoryHealth(): Promise<HistoryHealth> {
  const separationAt = new Date(DEMAND_SEPARATION_AT);
  const [exhibitions, unresolved, signals, legacySignals, operatorSignals, depthSignals] = await Promise.all([
    prisma.exhibition.findMany({
      where: publicExhibitionWhere,
      select: {
        id: true,
        title: true,
        space: { select: { name: true } },
        historyMeta: { select: { startYear: true, slug: true } },
        historyArtists: {
          select: {
            artist: {
              select: {
                slug: true,
                canonicalName: true,
                nativeName: true,
                aliases: { select: { label: true } },
              },
            },
          },
        },
      },
    }),
    prisma.historyUnresolvedName.findMany({
      select: { label: true, exhibition: { select: { title: true } } },
    }),
    prisma.historySignal.groupBy({
      by: ["path"],
      where: { name: "SEARCH_NO_RESULT", createdAt: { gte: separationAt } },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.historySignal.groupBy({
      by: ["path"],
      where: { name: "SEARCH_NO_RESULT", createdAt: { lt: separationAt } },
      _count: { _all: true },
    }),
    prisma.historySignal.groupBy({
      by: ["path"],
      where: { name: "SEARCH_NO_RESULT_OPERATOR" },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.historySignal.groupBy({
      by: ["name"],
      where: {
        name: { in: ["ARTIST_OPENED", "SECOND_ARTIST_REACHED", "THIRD_ARTIST_REACHED", "FOURTH_ARTIST_REACHED"] },
      },
      _count: { _all: true },
    }),
  ]);

  const artists = new Map<string, GrowthSnapshot["artists"][number]>();
  for (const exhibition of exhibitions) {
    for (const row of exhibition.historyArtists) {
      const current = artists.get(row.artist.slug) ?? {
        slug: row.artist.slug,
        labels: [row.artist.canonicalName, row.artist.nativeName, ...row.artist.aliases.map((alias) => alias.label)].filter((label): label is string => Boolean(label)),
        exhibitionIds: [],
      };
      current.exhibitionIds.push(exhibition.id);
      artists.set(row.artist.slug, current);
    }
  }
  const snapshot: GrowthSnapshot = {
    artists: [...artists.values()],
    exhibitions: exhibitions.map((exhibition) => ({
      id: exhibition.id,
      title: exhibition.title,
      year: exhibition.historyMeta?.startYear ?? null,
      space: exhibition.space?.name ?? null,
      city: null,
      artistSlugs: exhibition.historyArtists.map((row) => row.artist.slug),
    })),
    unresolved: unresolved.map((row) => ({ label: row.label, exhibitionTitle: row.exhibition.title })),
  };
  const demand = signals
    .filter((row) => row.path)
    .map((row) => ({ query: row.path as string, count: row._count._all, lastSearched: row._max.createdAt?.toISOString() ?? null }))
    .sort((left, right) => right.count - left.count || left.query.localeCompare(right.query));
  const frontier = buildGraphFrontier({ snapshot, demand });
  const isolated = frontier.filter((row) => row.reason === "ISOLATED_ARTIST").map((row) => row.artist);
  const largest = largestComponentSize(snapshot);
  let historyReady = 0;
  let richHistory = 0;
  let lowDensity = 0;
  for (const artist of snapshot.artists) {
    const density = densityForCount(artist.exhibitionIds.length);
    if (density === "RICH_HISTORY") richHistory += 1;
    else if (density === "HISTORY_READY") historyReady += 1;
    else if (density === "LOW_DENSITY") lowDensity += 1;
  }
  const pairs = new Set<string>();
  let threeArtistRoutes = 0;
  for (let i = 0; i < snapshot.exhibitions.length; i += 1) {
    for (let j = i + 1; j < snapshot.exhibitions.length; j += 1) {
      const left = snapshot.exhibitions[i];
      const right = snapshot.exhibitions[j];
      const shared = left.artistSlugs.filter((slug) => right.artistSlugs.includes(slug));
      if (shared.length !== 1) continue;
      const sides = [...new Set([...left.artistSlugs, ...right.artistSlugs])];
      if (sides.length >= 3) threeArtistRoutes += 1;
    }
  }
  for (const exhibition of snapshot.exhibitions) {
    const unique = [...new Set(exhibition.artistSlugs)].sort();
    for (let i = 0; i < unique.length; i += 1) {
      for (let j = i + 1; j < unique.length; j += 1) pairs.add(`${unique[i]}|${unique[j]}`);
    }
  }
  const paths = buildDocumentedPaths(
    exhibitions.map((exhibition) => ({
      id: exhibition.id,
      slug: exhibition.historyMeta?.slug ?? null,
      title: exhibition.title,
      year: exhibition.historyMeta?.startYear ?? null,
      artists: exhibition.historyArtists.map((row) => ({ slug: row.artist.slug, name: row.artist.canonicalName })),
    })),
    2000,
  );
  const readablePaths = paths.filter((path) => path.exhibitions.every((show) => show.title.length <= 42)).length;
  const operatorCountFor = (query: string) =>
    operatorSignals.find((row) => row.path === query)?._count._all ?? 0;
  const decisions = namedFrontier(
    [...artists.values()].map((artist) => ({ slug: artist.slug, exhibitionCount: artist.exhibitionIds.length })),
  );
  const depthCount = (name: string) => depthSignals.find((row) => row.name === name)?._count._all ?? 0;
  const noResultSearches = demand.slice(0, 20).map((row) => ({
    ...row,
    operatorCount: operatorCountFor(row.query),
    possibleAlias: resolveVerifiedAlias(row.query),
    unresolvedCandidate: snapshot.unresolved.find((name) => aliasLookupEqual(name.label, row.query))?.label ?? null,
    frontierStatus: decisions.find((item) => aliasLookupEqual(item.name, row.query))?.status ?? null,
  }));
  return {
    publicArtists: snapshot.artists.length,
    historyReady,
    richHistory,
    lowDensity,
    isolatedArtists: isolated,
    sharedExhibitions: snapshot.exhibitions.filter((exhibition) => new Set(exhibition.artistSlugs).size >= 2).length,
    largestComponent: largest,
    twoHopPairs: pairs.size,
    documentedPaths: paths.length,
    readablePaths,
    threeArtistRoutes,
    unresolvedParticipants: [...new Set(snapshot.unresolved.map((row) => row.label))].sort(),
    legacyMixedSearches: legacySignals
      .filter((row) => row.path)
      .map((row) => ({ query: row.path as string, count: row._count._all }))
      .sort((left, right) => right.count - left.count || left.query.localeCompare(right.query))
      .slice(0, 20),
    noResultSearches,
    journey: journeyDepthFromCounts({
      opened: depthCount("ARTIST_OPENED"),
      second: depthCount("SECOND_ARTIST_REACHED"),
      third: depthCount("THIRD_ARTIST_REACHED"),
      fourth: depthCount("FOURTH_ARTIST_REACHED"),
    }),
    namedFrontier: decisions,
    frontier: frontier.slice(0, 40),
  };
}
