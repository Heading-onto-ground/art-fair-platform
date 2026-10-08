import type { ExhibitionRecord } from "./claims";
import { isRecordedExhibition } from "./claims";
import { sha256 } from "./hash";
import { historySignature, seoBucket, timelineFraction, type SeoBucket } from "./product";
import { compactName } from "./resolve";
import type { SeedArtist } from "./seed";

export const PILOT_AS_OF = "2026-10-08";
export const EMPTY_HISTORY = "No accepted exhibition records in ROB yet.";
export const EMPTY_HELP = "Are you this artist? Help complete this history.";
export const MAP_NODE_LIMIT = 12;

export type DotMark = "filled" | "open";

export type TimelineMark =
  | { kind: "dot"; id: string; fraction: number; lane: number; mark: DotMark; year: number | null }
  | { kind: "cluster"; ids: string[]; fraction: number; lane: number; mark: DotMark; year: number | null; count: number };

export type CatalogSource = { url: string; retrievedAt: string | null };

export type CatalogExhibition = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  precision: string;
  when: string;
  year: number | null;
  decade: number | null;
  venue: string | null;
  spaceId: string | null;
  city: string | null;
  country: string | null;
  artistIds: string[];
  recordedNames: string[];
  curators: string[];
  sources: CatalogSource[];
  origin: "ROB_RESEARCHED";
  verification: "OFFICIAL_SOURCE";
};

export type CatalogArtist = {
  id: string;
  name: string;
  korean: string;
  labels: string[];
  aliases: string[];
  birthYear: number | null;
  birthVerified: boolean;
  identityStatus: string;
  qid: string | null;
  count: number;
  bucket: SeoBucket;
  signature: number[];
  earliest: string | null;
  latest: string | null;
  earliestId: string | null;
  exhibitionIds: string[];
  undatedIds: string[];
  marks: TimelineMark[];
};

export type CatalogSpace = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  exhibitionIds: string[];
};

export type CatalogCurator = {
  id: string;
  name: string;
  exhibitionIds: string[];
};

export type RankingModule = {
  id: "oldest-living" | "highest-auction" | "expensive-per-area" | "most-searched";
  title: string;
  status: "COMING_FROM_VERIFIED_DATA";
  reason: string;
  entries: [];
};

export type Catalog = {
  usageStatus: "PILOT_ONLY";
  productionClearance: "UNRESOLVED";
  asOf: string;
  artists: CatalogArtist[];
  exhibitions: CatalogExhibition[];
  spaces: CatalogSpace[];
  curators: CatalogCurator[];
  now: { currentIds: string[]; recentIds: string[] };
  rankings: RankingModule[];
  explore: {
    decades: number[];
    cities: { name: string; count: number }[];
    countries: { name: string; count: number }[];
  };
};

type IdentityRow = {
  pilotId: string;
  status: string;
  birthYear: number | null;
  aliases?: string[];
  qid?: string | null;
};

export function displayCity(city: string | null | undefined): string | null {
  const trimmed = (city ?? "").trim();
  if (!trimmed || trimmed.length > 40) return null;
  return trimmed;
}

export function dotMark(value: string | null, precision: string): DotMark {
  if (!value || precision === "year" || precision === "unknown" || value.length === 4) return "open";
  return "filled";
}

export function historyLayout(viewportWidth: number): "horizontal" | "vertical" {
  return viewportWidth <= 720 ? "vertical" : "horizontal";
}

export function assignLanes(fractions: number[], gap = 0.012): number[] {
  const last: number[] = [];
  return fractions.map((fraction) => {
    let lane = last.findIndex((value) => fraction - value >= gap);
    if (lane < 0) {
      lane = last.length;
      last.push(fraction);
    } else last[lane] = fraction;
    return lane;
  });
}

export function collapseTimeline(
  items: { id: string; fraction: number; mark: DotMark; year: number | null }[],
): TimelineMark[] {
  const sorted = [...items].sort((a, b) => a.fraction - b.fraction || a.id.localeCompare(b.id));
  const groups: (typeof sorted)[] = [];
  for (const item of sorted) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(last[0].fraction - item.fraction) < 1e-9) last.push(item);
    else groups.push([item]);
  }
  const marks: TimelineMark[] = groups.map((group) => {
    const mark: DotMark = group.every((item) => item.mark === "filled") ? "filled" : "open";
    const year = group[0].year;
    const fraction = group[0].fraction;
    if (group.length === 1) return { kind: "dot", id: group[0].id, fraction, lane: 0, mark, year };
    return {
      kind: "cluster",
      ids: group.map((item) => item.id),
      fraction,
      lane: 0,
      mark,
      year,
      count: group.length,
    };
  });
  const lanes = assignLanes(marks.map((mark) => mark.fraction));
  return marks.map((mark, index) => ({ ...mark, lane: lanes[index] }));
}

export function pageTitle(kind: "home" | "artist" | "exhibition" | "space" | "ranking", name?: string): string {
  if (kind === "artist" && name) return `${name}: Exhibition History & Connections | ROB`;
  if (kind === "exhibition" && name) return `${name}: Artists, Space & History | ROB`;
  if (kind === "space" && name) return `${name}: Exhibitions & Artists | ROB`;
  if (kind === "ranking" && name) return `${name} | ROB`;
  return "ROB";
}

export function searchArtists<T extends { labels: string[] }>(artists: T[], query: string): T[] {
  const raw = query.trim().toLowerCase();
  if (!raw) return [];
  const needle = compactName(raw);
  return artists.filter((artist) => {
    if (artist.labels.join(" ").toLowerCase().includes(raw)) return true;
    if (needle.length < 2) return false;
    return artist.labels.some((label) => compactName(label).includes(needle));
  });
}

export function documentedShares(
  exhibitions: { id: string; artistIds: string[] }[],
  artistId: string,
): { id: string; exhibitionIds: string[] }[] {
  const map = new Map<string, string[]>();
  for (const exhibition of exhibitions) {
    if (!exhibition.artistIds.includes(artistId)) continue;
    for (const other of exhibition.artistIds) {
      if (other === artistId) continue;
      map.set(other, [...(map.get(other) ?? []), exhibition.id]);
    }
  }
  return [...map.entries()]
    .map(([id, exhibitionIds]) => ({ id, exhibitionIds }))
    .sort((a, b) => b.exhibitionIds.length - a.exhibitionIds.length || a.id.localeCompare(b.id));
}

export function sharedExhibitionPhrase(count: number): string {
  return count === 1 ? "1 documented shared exhibition" : `${count} documented shared exhibitions`;
}

export type MapNode = { id: string; kind: "artist" | "exhibition" | "space" | "curator"; label: string };
export type MapEdge = { from: string; to: string };

export function connectionMap(
  artist: { id: string; name: string },
  exhibitions: {
    id: string;
    title: string;
    year: number | null;
    spaceId: string | null;
    venue: string | null;
    artistIds: string[];
    people: { id: string; name: string }[];
    curators: string[];
  }[],
  depth: number,
  limit = MAP_NODE_LIMIT,
): { nodes: MapNode[]; edges: MapEdge[]; truncated: boolean } {
  const mine = exhibitions
    .filter((item) => item.artistIds.includes(artist.id))
    .sort((a, b) => (b.year ?? -1) - (a.year ?? -1) || a.title.localeCompare(b.title));
  const nodes: MapNode[] = [{ id: artist.id, kind: "artist", label: artist.name }];
  const edges: MapEdge[] = [];
  const seen = new Set<string>([artist.id]);
  let truncated = false;
  const add = (node: MapNode, from: string) => {
    if (!seen.has(node.id) && nodes.length >= limit) {
      truncated = true;
      return false;
    }
    if (!seen.has(node.id)) {
      seen.add(node.id);
      nodes.push(node);
    }
    if (!edges.some((edge) => edge.from === from && edge.to === node.id)) edges.push({ from, to: node.id });
    return true;
  };
  const ring = mine.slice(0, depth <= 1 ? 4 : 8);
  if (mine.length > ring.length) truncated = true;
  for (const exhibition of ring) {
    if (!add({ id: exhibition.id, kind: "exhibition", label: exhibition.title }, artist.id)) continue;
    if (depth < 2) continue;
    if (exhibition.spaceId && exhibition.venue) add({ id: exhibition.spaceId, kind: "space", label: exhibition.venue }, exhibition.id);
    for (const person of exhibition.people) {
      if (person.id !== artist.id) add({ id: person.id, kind: "artist", label: person.name }, exhibition.id);
    }
    for (const curator of exhibition.curators) {
      add({ id: `c${sha256(compactName(curator)).slice(0, 12)}`, kind: "curator", label: curator }, exhibition.id);
    }
  }
  return { nodes, edges, truncated };
}

function monthEnd(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${yearMonth}-${String(last).padStart(2, "0")}`;
}

export function rangeCoversToday(start: string | null, end: string | null, precision: string, today: string): boolean {
  if (!start || precision === "year" || precision === "unknown" || start.length === 4) return false;
  if (start.length !== 7 && start.length !== 10) return false;
  const startBound = start.length === 7 ? `${start}-01` : start;
  let endBound: string | null = null;
  if (end && end.length === 10) endBound = end;
  else if (end && end.length === 7) endBound = monthEnd(end);
  else if (!end && start.length === 10) endBound = start;
  else if (!end && start.length === 7) endBound = monthEnd(start);
  if (!endBound) return false;
  return today >= startBound && today <= endBound;
}

export function rankingModules(): RankingModule[] {
  return [
    {
      id: "oldest-living",
      title: "Oldest Living Artists",
      status: "COMING_FROM_VERIFIED_DATA",
      reason: "Living status is not verified in this pilot, so no names are listed.",
      entries: [],
    },
    {
      id: "highest-auction",
      title: "Highest Auction Records",
      status: "COMING_FROM_VERIFIED_DATA",
      reason: "This pilot has no verified auction records.",
      entries: [],
    },
    {
      id: "expensive-per-area",
      title: "Most Expensive per cm²",
      status: "COMING_FROM_VERIFIED_DATA",
      reason: "This pilot has no verified price or dimension records.",
      entries: [],
    },
    {
      id: "most-searched",
      title: "Most Searched Artists",
      status: "COMING_FROM_VERIFIED_DATA",
      reason: "This pilot does not record public search counts.",
      entries: [],
    },
  ];
}

function seedLabels(artist: SeedArtist): string[] {
  return [artist.canonicalKoreanName, ...artist.romanizedNames, ...artist.otherAliases].filter(Boolean);
}

function matchesArtist(artist: SeedArtist, name: string): boolean {
  const target = compactName(name);
  return seedLabels(artist).some((label) => compactName(label) === target);
}

function whenLabel(record: ExhibitionRecord): string {
  if (!record.start) return "Date not recorded";
  return record.end ? `${record.start.value} – ${record.end.value}` : record.start.value;
}

function sourcesOf(record: ExhibitionRecord): CatalogSource[] {
  const urls = [...new Set([record.sourceUrl, ...(record.additionalSources ?? [])].filter(Boolean))];
  return urls.map((url) => ({
    url,
    retrievedAt: record.evidences.find((item) => item.sourceUrl === url)?.retrievedAt ?? record.evidences[0]?.retrievedAt ?? null,
  }));
}

function agreed(values: (string | null)[]): string | null {
  const present = [...new Set(values.filter((value): value is string => Boolean(value)))];
  return present.length === 1 ? present[0] : null;
}

export function spaceIdFor(venue: string): string {
  return `s${sha256(compactName(venue)).slice(0, 12)}`;
}

export function curatorIdFor(name: string): string {
  return `c${sha256(compactName(name)).slice(0, 12)}`;
}

export function yearStrata(items: { id: string; year: number | null }[]): { label: string; ids: string[] }[] {
  const sorted = [...items].sort((a, b) => (b.year ?? -1) - (a.year ?? -1) || a.id.localeCompare(b.id));
  const groups: { label: string; ids: string[] }[] = [];
  for (const item of sorted) {
    const label = item.year ? String(item.year) : "Date not recorded";
    const last = groups[groups.length - 1];
    if (last?.label === label) last.ids.push(item.id);
    else groups.push({ label, ids: [item.id] });
  }
  return groups;
}

export function buildCatalog(
  artists: SeedArtist[],
  records: ExhibitionRecord[],
  identity: IdentityRow[],
  asOf = PILOT_AS_OF,
): Catalog {
  const international = artists.filter((artist) => artist.cohort === "INTERNATIONAL");
  const accepted = records.filter(isRecordedExhibition);
  const identityById = new Map(identity.map((row) => [row.pilotId, row]));
  const exhibitions: CatalogExhibition[] = accepted.map((record) => {
    const artistIds: string[] = [];
    const recordedNames: string[] = [];
    for (const name of record.artistNames) {
      const found = international.find((artist) => matchesArtist(artist, name));
      if (found && !artistIds.includes(found.pilotId)) artistIds.push(found.pilotId);
      else if (!found) recordedNames.push(name);
    }
    const year = record.start ? Number(record.start.value.slice(0, 4)) : null;
    const venue = record.venueName?.trim() || null;
    return {
      id: record.id,
      title: record.title,
      start: record.start?.value ?? null,
      end: record.end?.value ?? null,
      precision: record.start?.precision ?? record.datePrecision,
      when: whenLabel(record),
      year: year && year >= 1800 ? year : null,
      decade: year && year >= 1800 ? Math.floor(year / 10) * 10 : null,
      venue,
      spaceId: venue ? spaceIdFor(venue) : null,
      city: displayCity(record.city),
      country: record.country?.trim() || null,
      artistIds,
      recordedNames,
      curators: record.curatorNames.map((name) => name.trim()).filter(Boolean),
      sources: sourcesOf(record),
      origin: "ROB_RESEARCHED",
      verification: "OFFICIAL_SOURCE",
    };
  });
  exhibitions.sort((a, b) => (a.start ?? "9999").localeCompare(b.start ?? "9999") || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));

  const catalogArtists: CatalogArtist[] = international
    .map((artist) => {
      const mine = exhibitions.filter((exhibition) => exhibition.artistIds.includes(artist.pilotId));
      const dated = mine.filter((exhibition) => exhibition.year);
      const years = dated.map((exhibition) => exhibition.year as number);
      const min = years.length ? Math.min(...years) : 1960;
      const max = years.length ? Math.max(...years) : 2026;
      const row = identityById.get(artist.pilotId);
      const confirmedRow = row?.status === "QID_CONFIRMED" ? row : null;
      const birthYear = confirmedRow?.birthYear ?? null;
      const extraAliases = [...artist.otherAliases, ...(confirmedRow?.aliases ?? [])].filter(
        (alias) => compactName(alias) !== compactName(artist.romanizedNames[0] ?? "") && compactName(alias) !== compactName(artist.canonicalKoreanName),
      );
      const items = dated.map((exhibition) => {
        const placed = exhibition.start
          ? timelineFraction(exhibition.start, exhibition.precision, min, max)
          : { fraction: 0.5, precise: false };
        return {
          id: exhibition.id,
          fraction: min === max ? 0.5 : placed.fraction,
          mark: dotMark(exhibition.start, exhibition.precision),
          year: exhibition.year,
        };
      });
      return {
        id: artist.pilotId,
        name: artist.romanizedNames[0] ?? artist.canonicalKoreanName,
        korean: artist.canonicalKoreanName,
        labels: [...new Set([...seedLabels(artist), ...(confirmedRow?.aliases ?? [])])],
        aliases: [...new Set(extraAliases)],
        birthYear,
        birthVerified: Boolean(birthYear),
        identityStatus: row?.status ?? artist.identityStatus,
        qid: confirmedRow?.qid ?? null,
        count: mine.length,
        bucket: seoBucket(mine.length),
        signature: historySignature(dated.map((exhibition) => exhibition.start ?? "").filter(Boolean)),
        earliest: dated[0]?.start ?? null,
        latest: dated[dated.length - 1]?.start ?? null,
        earliestId: dated[0]?.id ?? null,
        exhibitionIds: mine.map((exhibition) => exhibition.id),
        undatedIds: mine.filter((exhibition) => !exhibition.year).map((exhibition) => exhibition.id),
        marks: collapseTimeline(items),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const spaceMap = new Map<string, CatalogSpace & { cities: (string | null)[]; countries: (string | null)[] }>();
  for (const exhibition of exhibitions) {
    if (!exhibition.spaceId || !exhibition.venue) continue;
    const current = spaceMap.get(exhibition.spaceId) ?? {
      id: exhibition.spaceId,
      name: exhibition.venue,
      city: null,
      country: null,
      exhibitionIds: [],
      cities: [],
      countries: [],
    };
    current.exhibitionIds.push(exhibition.id);
    current.cities.push(exhibition.city);
    current.countries.push(exhibition.country);
    spaceMap.set(exhibition.spaceId, current);
  }
  const spaces: CatalogSpace[] = [...spaceMap.values()]
    .map((space) => ({
      id: space.id,
      name: space.name,
      city: agreed(space.cities),
      country: agreed(space.countries),
      exhibitionIds: space.exhibitionIds,
    }))
    .sort((a, b) => b.exhibitionIds.length - a.exhibitionIds.length || a.name.localeCompare(b.name));

  const curatorMap = new Map<string, CatalogCurator>();
  for (const exhibition of exhibitions) {
    for (const name of exhibition.curators) {
      const id = curatorIdFor(name);
      const current = curatorMap.get(id) ?? { id, name, exhibitionIds: [] };
      current.exhibitionIds.push(exhibition.id);
      curatorMap.set(id, current);
    }
  }

  const currentIds = exhibitions.filter((exhibition) => rangeCoversToday(exhibition.start, exhibition.end, exhibition.precision, asOf)).map((exhibition) => exhibition.id);
  const recentIds = exhibitions
    .filter((exhibition) => exhibition.year !== null && exhibition.year >= 2025 && dotMark(exhibition.start, exhibition.precision) === "filled" && !currentIds.includes(exhibition.id))
    .sort((a, b) => (b.start ?? "").localeCompare(a.start ?? ""))
    .slice(0, 12)
    .map((exhibition) => exhibition.id);

  const cityCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  for (const exhibition of exhibitions) {
    if (exhibition.city) cityCounts.set(exhibition.city, (cityCounts.get(exhibition.city) ?? 0) + 1);
    if (exhibition.country) countryCounts.set(exhibition.country, (countryCounts.get(exhibition.country) ?? 0) + 1);
  }
  const countSort = (left: { name: string; count: number }, right: { name: string; count: number }) =>
    right.count - left.count || left.name.localeCompare(right.name);

  return {
    usageStatus: "PILOT_ONLY",
    productionClearance: "UNRESOLVED",
    asOf,
    artists: catalogArtists,
    exhibitions,
    spaces,
    curators: [...curatorMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    now: { currentIds, recentIds },
    rankings: rankingModules(),
    explore: {
      decades: [...new Set(exhibitions.map((exhibition) => exhibition.decade).filter((decade): decade is number => decade !== null))].sort((a, b) => a - b),
      cities: [...cityCounts.entries()].map(([name, count]) => ({ name, count })).sort(countSort),
      countries: [...countryCounts.entries()].map(([name, count]) => ({ name, count })).sort(countSort),
    },
  };
}
