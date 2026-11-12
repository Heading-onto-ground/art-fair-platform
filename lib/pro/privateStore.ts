import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { loadPublicDiscoveryGraph } from "@/lib/pro/discoveryQuery";
import {
  artistPublicActivity,
  canonicalSavedFilter,
  discoveryMembership,
  evaluateSearches,
  filterSummary,
  parseStoredFilter,
  readIdList,
  sameCanonicalFilter,
  saveDiscoverySearch,
  savedSearchHref,
  savedSearchName,
  toParsedDiscovery,
  unwatchArtist,
  viewSavedSearch,
  watchArtist,
  type CanonicalFilter,
  type PrivateStore,
  type SearchRow,
  type WatchRow,
} from "@/lib/pro/privatePolicy";

function watchRow(row: { id: string; userId: string; artistEntityId: string; createdAt: Date }): WatchRow {
  return row;
}

function searchRow(row: {
  id: string;
  userId: string;
  name: string;
  filterJson: Prisma.JsonValue;
  baselineIds: Prisma.JsonValue;
  baselineCapped: boolean;
  resultTotalAtView: number;
  lastViewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): SearchRow | null {
  const filter = parseStoredFilter(row.filterJson);
  if (!filter) return null;
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    filterJson: filter,
    baselineIds: readIdList(row.baselineIds),
    baselineCapped: row.baselineCapped,
    resultTotalAtView: row.resultTotalAtView,
    lastViewedAt: row.lastViewedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const store: PrivateStore = {
  async findWatch(userId, artistEntityId) {
    const row = await prisma.artistWatch.findUnique({
      where: { userId_artistEntityId: { userId, artistEntityId } },
    });
    return row ? watchRow(row) : null;
  },
  async createWatch(row) {
    const created = await prisma.artistWatch.create({ data: row });
    return watchRow(created);
  },
  async deleteWatch(userId, artistEntityId) {
    const result = await prisma.artistWatch.deleteMany({ where: { userId, artistEntityId } });
    return result.count;
  },
  async listWatches(userId) {
    const rows = await prisma.artistWatch.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return rows.map(watchRow);
  },
  async createSearch(row) {
    const created = await prisma.savedDiscoverySearch.create({
      data: {
        id: row.id,
        userId: row.userId,
        name: row.name,
        filterJson: row.filterJson as Prisma.InputJsonValue,
        baselineIds: row.baselineIds as Prisma.InputJsonValue,
        baselineCapped: row.baselineCapped,
        resultTotalAtView: row.resultTotalAtView,
        lastViewedAt: row.lastViewedAt,
        createdAt: row.createdAt,
      },
    });
    return searchRow(created) ?? row;
  },
  async listSearches(userId) {
    const rows = await prisma.savedDiscoverySearch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return rows.flatMap((row: Parameters<typeof searchRow>[0]) => {
      const parsed = searchRow(row);
      return parsed ? [parsed] : [];
    });
  },
  async findSearch(userId, id) {
    const row = await prisma.savedDiscoverySearch.findFirst({ where: { id, userId } });
    return row ? searchRow(row) : null;
  },
  async updateSearch(userId, id, patch) {
    const existing = await prisma.savedDiscoverySearch.findFirst({ where: { id, userId }, select: { id: true } });
    if (!existing) return null;
    const updated = await prisma.savedDiscoverySearch.update({
      where: { id: existing.id },
      data: {
        baselineIds: patch.baselineIds as Prisma.InputJsonValue,
        baselineCapped: patch.baselineCapped,
        resultTotalAtView: patch.resultTotalAtView,
        lastViewedAt: patch.lastViewedAt,
      },
    });
    return searchRow(updated);
  },
  async deleteSearch(userId, id) {
    const result = await prisma.savedDiscoverySearch.deleteMany({ where: { id, userId } });
    return result.count > 0;
  },
};

export async function resolveArtistEntity(artistEntityId: string | null, slug: string | null) {
  if (artistEntityId) {
    return prisma.artistEntity.findUnique({
      where: { id: artistEntityId },
      select: { id: true, slug: true, canonicalName: true },
    });
  }
  if (slug) {
    return prisma.artistEntity.findUnique({
      where: { slug },
      select: { id: true, slug: true, canonicalName: true },
    });
  }
  return null;
}

export async function addArtistWatch(userId: string, artistEntityId: string) {
  try {
    return await watchArtist(store, userId, artistEntityId);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "P2002") {
      return { watching: true as const, created: false };
    }
    throw error;
  }
}

export async function removeArtistWatch(userId: string, artistEntityId: string) {
  return unwatchArtist(store, userId, artistEntityId);
}

export async function listArtistWatches(userId: string) {
  const [watches, graph] = await Promise.all([store.listWatches(userId), loadPublicDiscoveryGraph()]);
  return watches.map((watch) => ({
    id: watch.id,
    artistEntityId: watch.artistEntityId,
    watchedAt: watch.createdAt.toISOString(),
    ...artistPublicActivity(graph, watch.artistEntityId),
  }));
}

export async function watchedArtistIds(userId: string, artistEntityIds: string[]): Promise<Set<string>> {
  if (artistEntityIds.length === 0) return new Set<string>();
  const rows = await prisma.artistWatch.findMany({
    where: { userId, artistEntityId: { in: artistEntityIds } },
    select: { artistEntityId: true },
  });
  const ids: string[] = [];
  for (const row of rows as { artistEntityId: string }[]) ids.push(row.artistEntityId);
  return new Set(ids);
}

export async function createSavedSearch(userId: string, name: unknown, filters: unknown) {
  const filter = parseStoredFilter(filters);
  if (!filter) return { ok: false as const, error: "unsupported_filters" };
  const graph = await loadPublicDiscoveryGraph();
  const membership = discoveryMembership(graph, filter);
  const row = await saveDiscoverySearch(store, {
    userId,
    name: savedSearchName(name, filter),
    filter,
    membership,
  });
  return { ok: true as const, search: presentSearch(row, 0, membership.total, membership.capped) };
}

export async function listSavedSearches(userId: string) {
  const [rows, graph] = await Promise.all([store.listSearches(userId), loadPublicDiscoveryGraph()]);
  const stats = new Map(evaluateSearches(graph, rows).map((item) => [item.id, item]));
  return rows.map((row) => {
    const stat = stats.get(row.id);
    return presentSearch(row, stat?.newCount ?? 0, stat?.total ?? 0, Boolean(stat?.capped));
  });
}

export async function readSavedSearch(userId: string, id: string) {
  const row = await store.findSearch(userId, id);
  if (!row) return null;
  const graph = await loadPublicDiscoveryGraph();
  const [stat] = evaluateSearches(graph, [row]);
  return presentSearch(row, stat?.newCount ?? 0, stat?.total ?? 0, Boolean(stat?.capped));
}

export async function removeSavedSearch(userId: string, id: string) {
  return store.deleteSearch(userId, id);
}

export async function markSavedSearchViewed(
  userId: string,
  id: string,
  filter: CanonicalFilter,
  graph?: Awaited<ReturnType<typeof loadPublicDiscoveryGraph>>,
) {
  const loaded = graph ?? (await loadPublicDiscoveryGraph());
  const row = await store.findSearch(userId, id);
  if (!row || !sameCanonicalFilter(row.filterJson, filter)) return "skipped" as const;
  const membership = discoveryMembership(loaded, filter);
  const result = await viewSavedSearch(store, userId, id, membership);
  return result;
}

function presentSearch(row: SearchRow, newCount: number, total: number, capped: boolean) {
  return {
    id: row.id,
    name: row.name,
    summary: filterSummary(row.filterJson),
    filters: row.filterJson,
    href: savedSearchHref(row.filterJson, row.id),
    total,
    newCount,
    capped,
    lastViewedAt: row.lastViewedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export function savedSearchFilters(applied: ReturnType<typeof toParsedDiscovery>): CanonicalFilter | null {
  return canonicalSavedFilter(applied);
}

export { isHistoryUnavailable };
