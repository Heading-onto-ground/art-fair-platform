import { decodeDisplayText, displayCountry, phrasesMatch } from "@/lib/history/display";
import { densityForCount, HISTORY_READY_MIN, recordIsPublic, RICH_HISTORY_MIN, type HistoryDensity } from "@/lib/history/policy";

/**
 * Gallery Discovery reads the same public exhibition rule as Artist World.
 * Place comes from the exhibition or its space. Artist nationality and residence are not inputs.
 *
 * Date windows use UTC. A record matches a window when its factual interval overlaps that window.
 * DAY uses the recorded day. MONTH uses the recorded month. YEAR uses the whole calendar year,
 * so a year-only record matches a window when that year intersects it. UNKNOWN dates match neither
 * a year range nor a recent-activity window. "Last 3 years" and "last 5 years" start on 1 January
 * of (current UTC year − 2) and (current UTC year − 4). "Last 12 months" is a rolling UTC interval.
 *
 * Relevance is deterministic. It is not a recommendation score.
 * relevance = sharedExhibitions × 1_000_000_000 + matchedExhibitions × 1_000_000 + latestActivityYear
 * One shared exhibition outranks any number of other matches below 1,000.
 * One matched exhibition outranks any activity year. latestActivityYear is 0 when no year is recorded.
 * Ties break by canonical name (`ko`, base sensitivity), then id.
 * Recent sort uses the latest factual year, descending, with undated records last.
 * Exhibition-count sort uses the public exhibition count, descending.
 */

export const DISCOVERY_PAGE_SIZE = 24;
export const DISCOVERY_SHARED_CAP = 8;
export const DISCOVERY_SPACE_CAP = 3;

export const DISCOVERY_COPY = {
  emptyKo: "이 필터와 일치하는 확인된 작가 기록이 아직 없습니다.",
  emptyEn: "No verified artist records match these filters yet.",
  noneKo: "확인된 공개 전시 기록이 있는 작가가 아직 없습니다.",
  disclaimer:
    "ROB는 확인된 활동 기록을 기반으로 결과를 보여줍니다. ROB의 기록은 작가의 전체 경력을 의미하지 않을 수 있습니다. 관계는 확인된 공동 전시 기록을 기반으로 합니다.",
  activityNote: "활동은 확인된 공개 전시 기록입니다. 게시물이나 기사 언급은 활동으로 세지 않습니다.",
} as const;

export type DiscoverySort = "relevant" | "recent" | "exhibitions" | "name";
export type RecentActivity = "12m" | "3y" | "5y";
export type DiscoveryDensity = Exclude<HistoryDensity, "EMPTY">;
export type ProvenanceKind = "approved_external" | "first_party" | "limited_factual";

export type DiscoveryFilters = {
  q: string | null;
  city: string | null;
  country: string | null;
  from: number | null;
  to: number | null;
  recent: RecentActivity | null;
  min: number | null;
  density: DiscoveryDensity | null;
  connected: string | null;
  space: string | null;
};

export type ParsedDiscovery = DiscoveryFilters & { sort: DiscoverySort; cursor: string | null };

export type DiscoveryArtist = {
  id: string;
  slug: string;
  canonicalName: string;
  nativeName: string | null;
  aliases: string[];
};

export type DiscoveryExhibition = {
  id: string;
  slug: string | null;
  title: string;
  precision: string;
  startYear: number | null;
  startMonth: number | null;
  startDay: number | null;
  endYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  city: string | null;
  country: string | null;
  spaceId: string | null;
  spaceName: string | null;
  spaceSlug: string | null;
  artistIds: string[];
  provenance: ProvenanceKind;
};

export type DiscoveryGraph = {
  artists: DiscoveryArtist[];
  exhibitions: DiscoveryExhibition[];
};

export type SharedExhibitionRef = {
  id: string;
  slug: string | null;
  title: string;
  year: number | null;
  label: string | null;
};

export type DiscoveryCard = {
  id: string;
  slug: string;
  canonicalName: string;
  nativeName: string | null;
  exhibitionCount: number;
  careerStart: number | null;
  careerEnd: number | null;
  latestActivityLabel: string | null;
  topSpaces: { id: string; slug: string | null; name: string; count: number }[];
  connectionCount: number;
  reasons: string[];
  provenance: {
    publicExhibitions: number;
    approvedExternal: number;
    firstParty: number;
    limitedFactual: number;
  };
  sparseNote: string | null;
  sharedExhibitions: SharedExhibitionRef[];
  sharedMore: number;
};

export const DISCOVERY_CARD_KEYS = [
  "id",
  "slug",
  "canonicalName",
  "nativeName",
  "exhibitionCount",
  "careerStart",
  "careerEnd",
  "latestActivityLabel",
  "topSpaces",
  "connectionCount",
  "reasons",
  "provenance",
  "sparseNote",
  "sharedExhibitions",
  "sharedMore",
] as const;

export type DiscoveryStatus = "ok" | "unknown_artist" | "ambiguous_artist" | "unknown_space" | "ambiguous_space";

export type DiscoveryOutcome = {
  status: DiscoveryStatus;
  total: number;
  cards: DiscoveryCard[];
  nextCursor: string | null;
  applied: ParsedDiscovery;
  resolvedArtist: { id: string; slug: string; canonicalName: string; nativeName: string | null } | null;
  resolvedSpace: { id: string; slug: string | null; name: string } | null;
};

type DateFields = {
  precision: string;
  startYear: number | null;
  startMonth: number | null;
  startDay: number | null;
  endYear: number | null;
  endMonth: number | null;
  endDay: number | null;
};

const RECENT = new Set<RecentActivity>(["12m", "3y", "5y"]);
const DENSITIES = new Set<DiscoveryDensity>(["LOW_DENSITY", "HISTORY_READY", "RICH_HISTORY"]);
const SORTS = new Set<DiscoverySort>(["relevant", "recent", "exhibitions", "name"]);

export function isPublicGraphExhibition(input: {
  isPublic: boolean;
  createdBy: string | null;
  publicationStatus: string | null;
  origin: string | null;
  sourceClearance: string | null;
  limitedFactualSource: boolean;
}): boolean {
  if (!input.isPublic) return false;
  if (!input.publicationStatus && !input.origin) return Boolean(input.createdBy);
  return recordIsPublic({
    publicationStatus: input.publicationStatus ?? "DRAFT",
    origin: input.origin ?? "ROB_RESEARCHED",
    sourceClearance: input.sourceClearance ?? "REVIEW_REQUIRED",
    internalUseDecision: input.limitedFactualSource ? "ALLOW_LIMITED" : null,
    contentScope: input.limitedFactualSource ? "FACTUAL_METADATA_ONLY" : null,
  });
}

function text(value: string | null | undefined): string | null {
  if (!value) return null;
  const decoded = decodeDisplayText(value).trim();
  return decoded || null;
}

function firstParam(value: string | string[] | undefined | null): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim() ?? "";
  return trimmed || null;
}

function yearParam(value: string | null): number | null {
  if (!value || !/^\d{1,4}$/.test(value)) return null;
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1 || year > 2100) return null;
  return year;
}

export function defaultDiscoverySort(filters: DiscoveryFilters): DiscoverySort {
  if (
    filters.city ||
    filters.country ||
    filters.space ||
    filters.from != null ||
    filters.to != null ||
    filters.recent ||
    filters.connected ||
    filters.min != null ||
    filters.density
  ) {
    return "relevant";
  }
  return "name";
}

export function parseDiscoveryRequest(input: URLSearchParams | Record<string, string | string[] | undefined>): ParsedDiscovery {
  const read = (key: string) => (input instanceof URLSearchParams ? firstParam(input.get(key)) : firstParam(input[key]));
  let from = yearParam(read("from"));
  let to = yearParam(read("to"));
  if (from != null && to == null) to = from;
  if (to != null && from == null) from = to;
  if (from != null && to != null && from > to) {
    const swap = from;
    from = to;
    to = swap;
  }
  const recentRaw = read("recent");
  const densityRaw = read("density");
  const sortRaw = read("sort");
  const minRaw = read("min");
  const min = minRaw && /^\d{1,3}$/.test(minRaw) ? Number(minRaw) : null;
  const filters: DiscoveryFilters = {
    q: read("q"),
    city: text(read("city")),
    country: text(read("country")),
    from,
    to,
    recent: recentRaw && RECENT.has(recentRaw as RecentActivity) ? (recentRaw as RecentActivity) : null,
    min: min != null && min >= 1 ? min : null,
    density: densityRaw && DENSITIES.has(densityRaw as DiscoveryDensity) ? (densityRaw as DiscoveryDensity) : null,
    connected: read("connected"),
    space: read("space"),
  };
  return {
    ...filters,
    sort: sortRaw && SORTS.has(sortRaw as DiscoverySort) ? (sortRaw as DiscoverySort) : defaultDiscoverySort(filters),
    cursor: read("cursor"),
  };
}

export function discoveryFilterKeys(filters: DiscoveryFilters): string[] {
  const keys: string[] = [];
  if (filters.q) keys.push("q");
  if (filters.city) keys.push("city");
  if (filters.country) keys.push("country");
  if (filters.from != null || filters.to != null) keys.push("years");
  if (filters.recent) keys.push("recent");
  if (filters.min != null) keys.push("min");
  if (filters.density) keys.push("density");
  if (filters.connected) keys.push("connected");
  if (filters.space) keys.push("space");
  return keys;
}

export function discoveryHref(applied: ParsedDiscovery, cursor?: string | null): string {
  const params = new URLSearchParams();
  if (applied.q) params.set("q", applied.q);
  if (applied.city) params.set("city", applied.city);
  if (applied.country) params.set("country", applied.country);
  if (applied.from != null) params.set("from", String(applied.from));
  if (applied.to != null) params.set("to", String(applied.to));
  if (applied.recent) params.set("recent", applied.recent);
  if (applied.min != null) params.set("min", String(applied.min));
  if (applied.density) params.set("density", applied.density);
  if (applied.connected) params.set("connected", applied.connected);
  if (applied.space) params.set("space", applied.space);
  if (applied.sort !== defaultDiscoverySort(applied)) params.set("sort", applied.sort);
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return query ? `/pro/discover?${query}` : "/pro/discover";
}

function utc(year: number, monthIndex: number, day: number, endOfDay = false): number {
  if (endOfDay) return Date.UTC(year, monthIndex, day, 23, 59, 59, 999);
  return Date.UTC(year, monthIndex, day);
}

function lastDay(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function exhibitionInterval(ex: DateFields): { start: number; end: number } | null {
  if (ex.precision === "UNKNOWN" || ex.startYear == null) return null;
  const startYear = ex.startYear;
  const endYear = ex.endYear ?? startYear;
  if (ex.precision === "DAY" && ex.startMonth && ex.startDay) {
    const start = utc(startYear, ex.startMonth - 1, ex.startDay);
    const month = (ex.endMonth ?? ex.startMonth) - 1;
    const day = ex.endDay ?? ex.startDay;
    const end = utc(endYear, month, day, true);
    return start <= end ? { start, end } : { start: end, end: start };
  }
  if (ex.precision === "MONTH" && ex.startMonth) {
    const start = utc(startYear, ex.startMonth - 1, 1);
    const month = (ex.endMonth ?? ex.startMonth) - 1;
    const end = utc(endYear, month, lastDay(endYear, month), true);
    return start <= end ? { start, end } : { start: end, end: start };
  }
  if (ex.precision === "YEAR" || ex.precision === "DAY" || ex.precision === "MONTH") {
    const first = Math.min(startYear, endYear);
    const last = Math.max(startYear, endYear);
    return { start: utc(first, 0, 1), end: utc(last, 11, 31, true) };
  }
  return null;
}

export function recentWindow(kind: RecentActivity, now: Date): { start: number; end: number } {
  const end = now.getTime();
  if (kind === "12m") {
    const start = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() - 12,
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds(),
    );
    return { start, end };
  }
  const yearsBack = kind === "3y" ? 2 : 4;
  return { start: utc(now.getUTCFullYear() - yearsBack, 0, 1), end };
}

export function overlapsWindow(ex: DateFields, window: { start: number; end: number }): boolean {
  const interval = exhibitionInterval(ex);
  if (!interval) return false;
  return interval.start <= window.end && interval.end >= window.start;
}

function yearBounds(from: number, to: number): { start: number; end: number } {
  return { start: utc(from, 0, 1), end: utc(to, 11, 31, true) };
}

function activityYear(ex: DateFields): number | null {
  if (ex.startYear == null) return null;
  return Math.max(ex.startYear, ex.endYear ?? ex.startYear);
}

export function activityLabel(ex: DateFields): string | null {
  const year = ex.endYear ?? ex.startYear;
  if (year == null) return null;
  const month = ex.endYear != null ? ex.endMonth : ex.startMonth;
  const day = ex.endYear != null ? ex.endDay : ex.startDay;
  if (ex.precision === "DAY" && month && day) return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
  if ((ex.precision === "MONTH" || ex.precision === "DAY") && month) return `${year}.${String(month).padStart(2, "0")}`;
  return String(year);
}

function foldIncludes(haystack: string, needle: string): boolean {
  const needleFold = decodeDisplayText(needle).trim().toLowerCase();
  if (!needleFold) return false;
  return decodeDisplayText(haystack).toLowerCase().includes(needleFold);
}

function nameMatches(artist: DiscoveryArtist, query: string): boolean {
  if (foldIncludes(artist.canonicalName, query)) return true;
  if (artist.nativeName && foldIncludes(artist.nativeName, query)) return true;
  return artist.aliases.some((alias) => foldIncludes(alias, query));
}

function exactName(artist: DiscoveryArtist, query: string): boolean {
  if (phrasesMatch(artist.canonicalName, query)) return true;
  if (phrasesMatch(artist.nativeName, query)) return true;
  return artist.aliases.some((alias) => phrasesMatch(alias, query));
}

function koreanAnd(name: string): string {
  const last = [...name.trim()].pop() ?? "";
  const code = last.charCodeAt(0);
  const particle = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0 ? "과" : "와";
  return `${name}${particle}`;
}

function densityLabel(density: DiscoveryDensity): string {
  if (density === "LOW_DENSITY") return `전시 1–${HISTORY_READY_MIN - 1}건 구간`;
  if (density === "HISTORY_READY") return `전시 ${HISTORY_READY_MIN}–${RICH_HISTORY_MIN - 1}건 구간`;
  return `전시 ${RICH_HISTORY_MIN}건 이상 구간`;
}

const RECENT_LABEL: Record<RecentActivity, string> = {
  "12m": "최근 12개월",
  "3y": "최근 3년",
  "5y": "최근 5년",
};

type Sortable = {
  id: string;
  name: string;
  count: number;
  latest: number;
  relevance: number;
  shared: number;
};

function compareDiscovery(a: Sortable, b: Sortable, sort: DiscoverySort): number {
  const name = a.name.localeCompare(b.name, "ko", { numeric: true, sensitivity: "base" });
  const id = a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  if (sort === "name") return name || id;
  if (sort === "exhibitions") return b.count - a.count || name || id;
  if (sort === "recent") return b.latest - a.latest || name || id;
  return b.relevance - a.relevance || name || id;
}

type CursorPayload = Sortable & { v: 1; sort: DiscoverySort };

function encodeCursor(row: Sortable, sort: DiscoverySort): string {
  const payload: CursorPayload = { v: 1, sort, ...row };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(cursor: string | null, sort: DiscoverySort): Sortable | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<CursorPayload>;
    if (parsed.v !== 1 || parsed.sort !== sort) return null;
    if (!parsed.id || !parsed.name) return null;
    if (typeof parsed.count !== "number" || typeof parsed.latest !== "number" || typeof parsed.relevance !== "number") return null;
    return {
      id: parsed.id,
      name: parsed.name,
      count: parsed.count,
      latest: parsed.latest,
      relevance: parsed.relevance,
      shared: typeof parsed.shared === "number" ? parsed.shared : 0,
    };
  } catch {
    return null;
  }
}

function placeTimeMatch(ex: DiscoveryExhibition, filters: DiscoveryFilters, spaceId: string | null, now: Date): boolean {
  if (filters.city && !phrasesMatch(ex.city, filters.city)) return false;
  if (filters.country && !phrasesMatch(displayCountry(ex.country), displayCountry(filters.country))) return false;
  if (spaceId && ex.spaceId !== spaceId) return false;
  if (filters.from != null && filters.to != null && !overlapsWindow(ex, yearBounds(filters.from, filters.to))) return false;
  if (filters.recent && !overlapsWindow(ex, recentWindow(filters.recent, now))) return false;
  return true;
}

function hasPlaceTimeFilter(filters: DiscoveryFilters): boolean {
  return Boolean(filters.city || filters.country || filters.space || filters.from != null || filters.recent);
}

export function discoverArtists(
  graph: DiscoveryGraph,
  applied: ParsedDiscovery,
  options?: { now?: Date; pageSize?: number },
): DiscoveryOutcome {
  const now = options?.now ?? new Date();
  const pageSize = options?.pageSize ?? DISCOVERY_PAGE_SIZE;
  const artists = new Map(graph.artists.map((artist) => [artist.id, artist]));
  const byArtist = new Map<string, DiscoveryExhibition[]>();
  for (const exhibition of graph.exhibitions) {
    for (const artistId of new Set(exhibition.artistIds)) {
      if (!artists.has(artistId)) continue;
      const list = byArtist.get(artistId) ?? [];
      list.push(exhibition);
      byArtist.set(artistId, list);
    }
  }

  let status: DiscoveryStatus = "ok";
  let resolvedArtist: DiscoveryOutcome["resolvedArtist"] = null;
  if (applied.connected) {
    const query = applied.connected;
    const slugHits = graph.artists.filter((artist) => artist.slug === query);
    const matches = slugHits.length > 0 ? slugHits : graph.artists.filter((artist) => exactName(artist, query));
    if (matches.length === 0) status = "unknown_artist";
    else if (matches.length > 1) status = "ambiguous_artist";
    else {
      const artist = matches[0];
      resolvedArtist = { id: artist.id, slug: artist.slug, canonicalName: artist.canonicalName, nativeName: artist.nativeName };
    }
  }

  let resolvedSpace: DiscoveryOutcome["resolvedSpace"] = null;
  if (applied.space && status === "ok") {
    const bySlug = new Map<string, { id: string; slug: string | null; name: string }>();
    const byName = new Map<string, { id: string; slug: string | null; name: string }>();
    for (const exhibition of graph.exhibitions) {
      if (!exhibition.spaceId || !exhibition.spaceName) continue;
      const record = { id: exhibition.spaceId, slug: exhibition.spaceSlug, name: exhibition.spaceName };
      if (exhibition.spaceSlug === applied.space) bySlug.set(exhibition.spaceId, record);
      if (phrasesMatch(exhibition.spaceName, applied.space)) byName.set(exhibition.spaceId, record);
    }
    const spaces = bySlug.size > 0 ? bySlug : byName;
    if (spaces.size === 0) status = "unknown_space";
    else if (spaces.size > 1) status = "ambiguous_space";
    else resolvedSpace = [...spaces.values()][0];
  }

  const base = {
    applied,
    resolvedArtist,
    resolvedSpace,
    nextCursor: null,
    cards: [] as DiscoveryCard[],
    total: 0,
  };
  if (status !== "ok") return { ...base, status };

  const spaceId = resolvedSpace?.id ?? null;
  const placeTimeActive = hasPlaceTimeFilter(applied);
  const targetIds = resolvedArtist ? new Set((byArtist.get(resolvedArtist.id) ?? []).map((exhibition) => exhibition.id)) : null;
  const rows: { card: DiscoveryCard; sort: Sortable }[] = [];

  for (const [artistId, exhibitions] of byArtist) {
    const artist = artists.get(artistId);
    if (!artist) continue;
    if (resolvedArtist && artist.id === resolvedArtist.id) continue;
    if (applied.q && !nameMatches(artist, applied.q)) continue;
    const density = densityForCount(exhibitions.length);
    if (applied.density && density !== applied.density) continue;
    if (applied.min != null && exhibitions.length < applied.min) continue;

    const matched = placeTimeActive ? exhibitions.filter((exhibition) => placeTimeMatch(exhibition, applied, spaceId, now)) : exhibitions;
    if (placeTimeActive && matched.length === 0) continue;

    const shared = targetIds ? exhibitions.filter((exhibition) => targetIds.has(exhibition.id)) : [];
    if (targetIds && shared.length === 0) continue;

    const reasons: string[] = [];
    if (resolvedArtist) reasons.push(`${koreanAnd(resolvedArtist.nativeName ?? resolvedArtist.canonicalName)} 확인된 공동 전시 ${shared.length}건`);
    if (applied.recent) reasons.push(`${RECENT_LABEL[applied.recent]} 내 확인된 전시 ${matched.length}건`);
    if (resolvedSpace) reasons.push(`${resolvedSpace.name} 전시 기록 ${matched.length}건`);
    if (applied.city) {
      const cityName = matched.find((exhibition) => phrasesMatch(exhibition.city, applied.city))?.city ?? applied.city;
      reasons.push(`${cityName}에서 확인된 전시 ${matched.length}건`);
    }
    if (applied.country) {
      const countryName = displayCountry(matched.find((exhibition) => exhibition.country)?.country) ?? displayCountry(applied.country);
      reasons.push(`${countryName}에서 확인된 전시 ${matched.length}건`);
    }
    if (applied.from != null && applied.to != null) reasons.push(`${applied.from}–${applied.to}에 겹치는 확인된 전시 ${matched.length}건`);
    if (applied.min != null || applied.density) {
      const band = applied.density ? ` · ${densityLabel(applied.density)}` : "";
      reasons.push(`확인된 공개 전시 ${exhibitions.length}건${band}`);
    }
    if (reasons.length === 0) reasons.push(applied.q ? "이름과 일치하는 확인된 기록" : "확인된 공개 전시 기록");

    let careerStart: number | null = null;
    let careerEnd: number | null = null;
    let latestExhibition: DiscoveryExhibition | null = null;
    let latestStamp = Number.NEGATIVE_INFINITY;
    const spaces = new Map<string, { id: string; slug: string | null; name: string; count: number }>();
    const others = new Set<string>();
    const provenance = { publicExhibitions: exhibitions.length, approvedExternal: 0, firstParty: 0, limitedFactual: 0 };
    for (const exhibition of exhibitions) {
      if (exhibition.provenance === "approved_external") provenance.approvedExternal += 1;
      else if (exhibition.provenance === "first_party") provenance.firstParty += 1;
      else provenance.limitedFactual += 1;
      if (exhibition.startYear != null) {
        careerStart = careerStart == null ? exhibition.startYear : Math.min(careerStart, exhibition.startYear);
        const end = exhibition.endYear ?? exhibition.startYear;
        careerEnd = careerEnd == null ? end : Math.max(careerEnd, end);
      }
      const interval = exhibitionInterval(exhibition);
      if (interval && interval.end >= latestStamp) {
        latestStamp = interval.end;
        latestExhibition = exhibition;
      }
      if (exhibition.spaceId && exhibition.spaceName) {
        const current = spaces.get(exhibition.spaceId) ?? {
          id: exhibition.spaceId,
          slug: exhibition.spaceSlug,
          name: exhibition.spaceName,
          count: 0,
        };
        current.count += 1;
        spaces.set(exhibition.spaceId, current);
      }
      for (const otherId of exhibition.artistIds) {
        if (otherId !== artist.id && artists.has(otherId)) others.add(otherId);
      }
    }

    const latestYear = latestExhibition ? activityYear(latestExhibition) : null;
    const sharedSorted = [...shared].sort((a, b) => (activityYear(b) ?? -1) - (activityYear(a) ?? -1) || a.title.localeCompare(b.title, "ko"));
    const card: DiscoveryCard = {
      id: artist.id,
      slug: artist.slug,
      canonicalName: artist.canonicalName,
      nativeName: artist.nativeName,
      exhibitionCount: exhibitions.length,
      careerStart,
      careerEnd,
      latestActivityLabel: latestExhibition ? activityLabel(latestExhibition) : null,
      topSpaces: [...spaces.values()]
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"))
        .slice(0, DISCOVERY_SPACE_CAP),
      connectionCount: others.size,
      reasons,
      provenance,
      sparseNote:
        exhibitions.length < HISTORY_READY_MIN
          ? `ROB currently has ${exhibitions.length} verified exhibition ${exhibitions.length === 1 ? "record" : "records"} for this artist.`
          : null,
      sharedExhibitions: sharedSorted.slice(0, DISCOVERY_SHARED_CAP).map((exhibition) => ({
        id: exhibition.id,
        slug: exhibition.slug,
        title: exhibition.title,
        year: activityYear(exhibition),
        label: activityLabel(exhibition),
      })),
      sharedMore: Math.max(0, sharedSorted.length - DISCOVERY_SHARED_CAP),
    };
    const sortable: Sortable = {
      id: artist.id,
      name: artist.canonicalName,
      count: exhibitions.length,
      latest: latestYear ?? -1,
      shared: shared.length,
      relevance: shared.length * 1_000_000_000 + matched.length * 1_000_000 + (latestYear ?? 0),
    };
    rows.push({ card, sort: sortable });
  }

  rows.sort((a, b) => compareDiscovery(a.sort, b.sort, applied.sort));
  const cursor = decodeCursor(applied.cursor, applied.sort);
  const start = cursor ? rows.findIndex((row) => compareDiscovery(row.sort, cursor, applied.sort) > 0) : 0;
  const slice = start < 0 ? [] : rows.slice(start, start + pageSize);
  const nextOffset = start < 0 ? rows.length : start + pageSize;
  return {
    status: "ok",
    total: rows.length,
    cards: slice.map((row) => row.card),
    nextCursor: nextOffset < rows.length && slice.length > 0 ? encodeCursor(slice[slice.length - 1].sort, applied.sort) : null,
    applied,
    resolvedArtist,
    resolvedSpace,
  };
}

export type DiscoveryExhibitionRow = {
  id: string;
  title: string;
  isPublic: boolean;
  createdBy: string | null;
  startDate: Date | null;
  endDate: Date | null;
  city: string | null;
  country: string | null;
  space: { id: string; name: string; city: string | null; country: string | null; slug: string | null } | null;
  slug: string | null;
  datePrecision: string | null;
  startYear: number | null;
  startMonth: number | null;
  startDay: number | null;
  endYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  publicationStatus: string | null;
  origin: string | null;
  sourceClearance: string | null;
  limitedFactualSource: boolean;
  participantEntityIds: string[];
  confirmedProfileIds: string[];
};

export type DiscoveryEntityRow = {
  id: string;
  slug: string;
  canonicalName: string;
  nativeName: string | null;
  profileId: string | null;
  aliases: string[];
};

function provenanceOf(row: DiscoveryExhibitionRow): ProvenanceKind {
  const clearance = row.sourceClearance;
  if (clearance === "APPROVED") return "approved_external";
  const origin = row.origin ?? (row.createdBy ? "LEGACY_FIRST_PARTY" : "ROB_RESEARCHED");
  if (origin === "ARTIST_SUBMITTED" || origin === "GALLERY_SUBMITTED" || origin === "INSTITUTION_SUBMITTED" || origin === "LEGACY_FIRST_PARTY") {
    return "first_party";
  }
  return "limited_factual";
}

function datesOf(row: DiscoveryExhibitionRow): DateFields {
  if (row.datePrecision) {
    return {
      precision: row.datePrecision,
      startYear: row.startYear,
      startMonth: row.startMonth,
      startDay: row.startDay,
      endYear: row.endYear,
      endMonth: row.endMonth,
      endDay: row.endDay,
    };
  }
  if (!row.startDate) {
    return { precision: "UNKNOWN", startYear: null, startMonth: null, startDay: null, endYear: null, endMonth: null, endDay: null };
  }
  const end = row.endDate;
  return {
    precision: "DAY",
    startYear: row.startDate.getUTCFullYear(),
    startMonth: row.startDate.getUTCMonth() + 1,
    startDay: row.startDate.getUTCDate(),
    endYear: end ? end.getUTCFullYear() : null,
    endMonth: end ? end.getUTCMonth() + 1 : null,
    endDay: end ? end.getUTCDate() : null,
  };
}

/** Builds the discovery graph from public-participation rows. Artist residence is not read. */
export function buildDiscoveryGraph(exhibitions: DiscoveryExhibitionRow[], entities: DiscoveryEntityRow[]): DiscoveryGraph {
  const byProfile = new Map(entities.filter((entity) => entity.profileId).map((entity) => [entity.profileId as string, entity.id]));
  const artists: DiscoveryArtist[] = entities.map((entity) => ({
    id: entity.id,
    slug: entity.slug,
    canonicalName: text(entity.canonicalName) ?? entity.canonicalName,
    nativeName: text(entity.nativeName),
    aliases: entity.aliases.map((alias) => text(alias) ?? alias).filter(Boolean),
  }));
  const visible: DiscoveryExhibition[] = [];
  for (const row of exhibitions) {
    if (
      !isPublicGraphExhibition({
        isPublic: row.isPublic,
        createdBy: row.createdBy,
        publicationStatus: row.publicationStatus,
        origin: row.origin,
        sourceClearance: row.sourceClearance,
        limitedFactualSource: row.limitedFactualSource,
      })
    ) {
      continue;
    }
    const dates = datesOf(row);
    const ids = new Set(row.participantEntityIds);
    for (const profileId of row.confirmedProfileIds) {
      const entityId = byProfile.get(profileId);
      if (entityId) ids.add(entityId);
    }
    visible.push({
      id: row.id,
      slug: row.slug,
      title: text(row.title) ?? row.title,
      ...dates,
      city: text(row.city ?? row.space?.city ?? null),
      country: displayCountry(row.country ?? row.space?.country ?? null),
      spaceId: row.space?.id ?? null,
      spaceName: row.space ? text(row.space.name) : null,
      spaceSlug: row.space?.slug ?? null,
      artistIds: [...ids],
      provenance: provenanceOf(row),
    });
  }
  return { artists, exhibitions: visible };
}
