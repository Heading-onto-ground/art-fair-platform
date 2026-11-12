import {
  activityLabel,
  defaultDiscoverySort,
  discoverArtists,
  discoveryFilterKeys,
  discoveryFilterSummary,
  discoveryHref,
  parseDiscoveryRequest,
  type DiscoveryDensity,
  type DiscoveryFilters,
  type DiscoveryGraph,
  type DiscoverySort,
  type ParsedDiscovery,
  type RecentActivity,
} from "@/lib/pro/discoveryPolicy";

/**
 * A saved search remembers which artists matched, not when those artists were created.
 * The stored id list is capped. Past the cap, the new-count only sees the name-sorted window.
 */
export const SAVED_SEARCH_BASELINE_CAP = 500;
export const SAVED_SEARCH_NAME_MAX = 80;

const FILTER_ORDER = [
  "q",
  "city",
  "country",
  "from",
  "to",
  "recent",
  "min",
  "density",
  "connected",
  "space",
  "sort",
] as const;

export type CanonicalFilter = {
  q?: string;
  city?: string;
  country?: string;
  from?: number;
  to?: number;
  recent?: RecentActivity;
  min?: number;
  density?: DiscoveryDensity;
  connected?: string;
  space?: string;
  sort?: DiscoverySort;
};

export type Membership = { ids: string[]; total: number; capped: boolean };

export type WatchRow = {
  id: string;
  userId: string;
  artistEntityId: string;
  createdAt: Date;
};

export type SearchRow = {
  id: string;
  userId: string;
  name: string;
  filterJson: CanonicalFilter;
  baselineIds: string[];
  baselineCapped: boolean;
  resultTotalAtView: number;
  lastViewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export interface PrivateStore {
  findWatch(userId: string, artistEntityId: string): Promise<WatchRow | null>;
  createWatch(row: WatchRow): Promise<WatchRow>;
  deleteWatch(userId: string, artistEntityId: string): Promise<number>;
  listWatches(userId: string): Promise<WatchRow[]>;
  createSearch(row: SearchRow): Promise<SearchRow>;
  listSearches(userId: string): Promise<SearchRow[]>;
  findSearch(userId: string, id: string): Promise<SearchRow | null>;
  updateSearch(userId: string, id: string, patch: Pick<SearchRow, "baselineIds" | "baselineCapped" | "resultTotalAtView" | "lastViewedAt">): Promise<SearchRow | null>;
  deleteSearch(userId: string, id: string): Promise<boolean>;
}

export function canonicalSavedFilter(applied: ParsedDiscovery): CanonicalFilter | null {
  if (discoveryFilterKeys(applied).length === 0) return null;
  const filter: CanonicalFilter = {};
  if (applied.q) filter.q = applied.q;
  if (applied.city) filter.city = applied.city;
  if (applied.country) filter.country = applied.country;
  if (applied.from != null) filter.from = applied.from;
  if (applied.to != null) filter.to = applied.to;
  if (applied.recent) filter.recent = applied.recent;
  if (applied.min != null) filter.min = applied.min;
  if (applied.density) filter.density = applied.density;
  if (applied.connected) filter.connected = applied.connected;
  if (applied.space) filter.space = applied.space;
  if (applied.sort !== defaultDiscoverySort(applied)) filter.sort = applied.sort;
  return filter;
}

export function parseStoredFilter(value: unknown): CanonicalFilter | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !FILTER_ORDER.includes(key as (typeof FILTER_ORDER)[number]))) return null;
  const params = new URLSearchParams();
  for (const key of FILTER_ORDER) {
    if (!(key in record) || record[key] == null) continue;
    const item = record[key];
    if (typeof item !== "string" && typeof item !== "number") return null;
    params.set(key, String(item));
  }
  const parsed = parseDiscoveryRequest(params);
  const canonical = canonicalSavedFilter(parsed);
  if (!canonical) return null;
  for (const key of FILTER_ORDER) {
    if (record[key] == null) continue;
    const kept = canonical[key];
    if (kept == null || String(kept) !== String(record[key])) return null;
  }
  return canonical;
}

function recordFrom(filter: CanonicalFilter): CanonicalFilter {
  const ordered: CanonicalFilter = {};
  for (const key of FILTER_ORDER) {
    if (filter[key] != null) ordered[key] = filter[key] as never;
  }
  return ordered;
}

export function toParsedDiscovery(filter: CanonicalFilter): ParsedDiscovery {
  const params = new URLSearchParams();
  for (const key of FILTER_ORDER) {
    const value = filter[key];
    if (value != null) params.set(key, String(value));
  }
  return parseDiscoveryRequest(params);
}

export function savedSearchHref(filter: CanonicalFilter, id: string): string {
  const href = discoveryHref(toParsedDiscovery(filter));
  return `${href}${href.includes("?") ? "&" : "?"}saved=${encodeURIComponent(id)}`;
}

export function savedSearchName(requested: unknown, filter: CanonicalFilter): string {
  const summary = discoveryFilterSummary(toParsedDiscovery(filter));
  const raw = typeof requested === "string" ? requested.trim() : "";
  return (raw || summary || "저장된 검색").slice(0, SAVED_SEARCH_NAME_MAX);
}

export function sameCanonicalFilter(left: CanonicalFilter, right: CanonicalFilter): boolean {
  return JSON.stringify(recordFrom(left)) === JSON.stringify(recordFrom(right));
}

export function discoveryMembership(graph: DiscoveryGraph, filter: CanonicalFilter, now = new Date()): Membership {
  const applied = toParsedDiscovery(filter);
  applied.sort = "name";
  applied.cursor = null;
  const outcome = discoverArtists(graph, applied, { now, pageSize: SAVED_SEARCH_BASELINE_CAP });
  if (outcome.status !== "ok") return { ids: [], total: 0, capped: false };
  return {
    ids: outcome.cards.map((card) => card.id),
    total: outcome.total,
    capped: outcome.total > outcome.cards.length,
  };
}

/** Artists in the current result who were absent from the last viewed result. Removals are not counted. */
export function newSinceBaseline(baselineIds: readonly string[], currentIds: readonly string[]): number {
  const seen = new Set(baselineIds);
  let count = 0;
  for (const id of currentIds) if (!seen.has(id)) count += 1;
  return count;
}

export function evaluateSearches(graph: DiscoveryGraph, rows: readonly SearchRow[], now = new Date()) {
  return rows.map((row) => {
    const membership = discoveryMembership(graph, row.filterJson, now);
    return {
      id: row.id,
      total: membership.total,
      newCount: newSinceBaseline(row.baselineIds, membership.ids),
      capped: membership.capped || row.baselineCapped,
    };
  });
}

export function readIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export type WatchFacts = {
  available: boolean;
  slug: string | null;
  canonicalName: string | null;
  nativeName: string | null;
  exhibitionCount: number;
  latestActivityLabel: string | null;
  latestExhibitionTitle: string | null;
  latestYear: number;
};

export function artistPublicActivity(graph: DiscoveryGraph, artistId: string): WatchFacts {
  const artist = graph.artists.find((item) => item.id === artistId);
  if (!artist) {
    return {
      available: false,
      slug: null,
      canonicalName: null,
      nativeName: null,
      exhibitionCount: 0,
      latestActivityLabel: null,
      latestExhibitionTitle: null,
      latestYear: -1,
    };
  }
  const exhibitions = graph.exhibitions.filter((exhibition) => exhibition.artistIds.includes(artistId));
  let latest: (typeof exhibitions)[number] | null = null;
  let latestYear = -1;
  for (const exhibition of exhibitions) {
    const year = exhibition.endYear ?? exhibition.startYear ?? -1;
    if (!latest || year > latestYear) {
      latest = exhibition;
      latestYear = year;
    }
  }
  return {
    available: true,
    slug: artist.slug,
    canonicalName: artist.canonicalName,
    nativeName: artist.nativeName,
    exhibitionCount: exhibitions.length,
    latestActivityLabel: latest ? activityLabel(latest) : null,
    latestExhibitionTitle: latest?.title ?? null,
    latestYear,
  };
}

export function filterSummary(filter: CanonicalFilter): string {
  return discoveryFilterSummary(toParsedDiscovery(filter));
}

export async function watchArtist(store: PrivateStore, userId: string, artistEntityId: string, now = new Date()) {
  const existing = await store.findWatch(userId, artistEntityId);
  if (existing) return { watching: true as const, created: false };
  await store.createWatch({ id: crypto.randomUUID(), userId, artistEntityId, createdAt: now });
  return { watching: true as const, created: true };
}

export async function unwatchArtist(store: PrivateStore, userId: string, artistEntityId: string) {
  await store.deleteWatch(userId, artistEntityId);
  return { watching: false as const };
}

export async function saveDiscoverySearch(
  store: PrivateStore,
  input: { userId: string; name: string; filter: CanonicalFilter; membership: Membership; now?: Date },
) {
  const now = input.now ?? new Date();
  const row: SearchRow = {
    id: crypto.randomUUID(),
    userId: input.userId,
    name: savedSearchName(input.name, input.filter),
    filterJson: input.filter,
    baselineIds: input.membership.ids,
    baselineCapped: input.membership.capped,
    resultTotalAtView: input.membership.total,
    lastViewedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await store.createSearch(row);
  return row;
}

export async function viewSavedSearch(store: PrivateStore, userId: string, id: string, membership: Membership, now = new Date()) {
  const updated = await store.updateSearch(userId, id, {
    baselineIds: membership.ids,
    baselineCapped: membership.capped,
    resultTotalAtView: membership.total,
    lastViewedAt: now,
  });
  return updated ? "updated" : "missing";
}

export type { DiscoveryFilters };
