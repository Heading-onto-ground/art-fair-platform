import { mayRelinkUnresolvedName, normalizeArtistLookup, resolveArtistSlug } from "@/lib/history/identity";

export type SourceClass =
  | "FOUNDATION"
  | "ESTATE"
  | "MUSEUM"
  | "GALLERY_CV"
  | "INSTITUTION"
  | "MUSEUM_API"
  | "WIKIDATA"
  | "OTHER";

export type SourceJob = {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourceClass: SourceClass;
  targetArtists: string[];
  retrievedAt: string;
  extractionMode: "MANUAL_FACT_LINES" | "STRUCTURED_FILE";
  contentScope: "FACTUAL_METADATA_ONLY";
  notes: string;
};

export type FactualCandidate = {
  artistNames: string[];
  title: string;
  startYear: number | null;
  startMonth: number | null;
  startDay: number | null;
  endYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  datePrecision: "DAY" | "MONTH" | "YEAR" | "UNKNOWN";
  space: string | null;
  city: string | null;
  country: string | null;
  curatorNames: string[];
  sourceName: string;
  sourceUrl: string;
  retrievedAt: string;
  evidenceShort: string;
  externalIds: string[];
  pilotRecordId: string;
};

export type VerifiedSpace = {
  slug: string;
  canonicalName: string;
  aliases: string[];
};

/** Explicit space names. Spacing variants are not guessed. */
export const VERIFIED_SPACES: readonly VerifiedSpace[] = [
  {
    slug: "kukje-gallery",
    canonicalName: "Kukje Gallery",
    aliases: ["Kukje Gallery", "Kukjegallery"],
  },
  {
    slug: "gallery-hyundai",
    canonicalName: "Gallery Hyundai",
    aliases: ["Gallery Hyundai", "Hyundai Gallery"],
  },
  {
    slug: "national-museum-of-modern-and-contemporary-art",
    canonicalName: "National Museum of Modern and Contemporary Art",
    aliases: ["National Museum of Modern and Contemporary Art", "MMCA"],
  },
];

export type GrowthArtist = {
  slug: string;
  labels: string[];
  exhibitionIds: string[];
};

export type GrowthExhibition = {
  id: string;
  title: string;
  year: number | null;
  space: string | null;
  city: string | null;
  artistSlugs: string[];
};

export type GrowthSnapshot = {
  artists: GrowthArtist[];
  exhibitions: GrowthExhibition[];
  unresolved: { label: string; exhibitionTitle: string }[];
};

export type DuplicateDecision = "NEW" | "EXACT" | "REVIEW";

export type GraphValue = {
  newExhibition: boolean;
  newArtist: boolean;
  newSpace: boolean;
  newArtistPairCount: number;
  new2HopPaths: number;
  new3HopPaths: number;
  connectsIsolatedArtist: boolean;
  connectsTwoComponents: boolean;
  chronologyValue: "NEW_YEAR" | "DENSIFY" | "NONE";
};

export type FrontierReason =
  | "UNRESOLVED_PARTICIPANT"
  | "SPARSE_CONNECTED_ARTIST"
  | "SEARCHED_MISSING_ARTIST"
  | "BRIDGE_CANDIDATE"
  | "ISOLATED_ARTIST";

export type FrontierRow = {
  artist: string;
  reason: FrontierReason;
  currentRecords: number;
  currentComponent: number;
  sharedMomentSource: string | null;
  searchDemand: number;
  candidateSources: string[];
  priority: number;
};

export function normalizeFactTitle(title: string): string {
  return title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveVerifiedSpace(name: string): VerifiedSpace | null {
  const key = normalizeArtistLookup(name);
  if (!key) return null;
  return VERIFIED_SPACES.find((space) => space.aliases.some((alias) => normalizeArtistLookup(alias) === key)) ?? null;
}

export function sameVerifiedSpace(left: string | null, right: string | null): boolean {
  if (!left || !right) return false;
  if (normalizeArtistLookup(left) === normalizeArtistLookup(right)) return true;
  const a = resolveVerifiedSpace(left);
  const b = resolveVerifiedSpace(right);
  return Boolean(a && b && a.slug === b.slug);
}

export function duplicateDecision(
  candidate: Pick<FactualCandidate, "title" | "startYear" | "space">,
  existing: Pick<GrowthExhibition, "title" | "year" | "space">,
): DuplicateDecision {
  if (candidate.startYear == null || existing.year == null || candidate.startYear !== existing.year) return "NEW";
  if (normalizeFactTitle(candidate.title) !== normalizeFactTitle(existing.title)) return "NEW";
  if (!candidate.space || !existing.space) return "REVIEW";
  if (sameVerifiedSpace(candidate.space, existing.space)) return "EXACT";
  return "REVIEW";
}

function components(snapshot: GrowthSnapshot): Map<string, number> {
  const parent = new Map<string, string>();
  const find = (slug: string): string => {
    const current = parent.get(slug) ?? slug;
    if (current === slug) return slug;
    const root = find(current);
    parent.set(slug, root);
    return root;
  };
  const unite = (left: string, right: string) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent.set(b, a);
  };
  for (const artist of snapshot.artists) parent.set(artist.slug, artist.slug);
  for (const exhibition of snapshot.exhibitions) {
    const [first, ...rest] = exhibition.artistSlugs;
    for (const slug of rest) if (first) unite(first, slug);
  }
  const roots = new Map<string, number>();
  const sizes = new Map<string, number>();
  for (const artist of snapshot.artists) {
    const root = find(artist.slug);
    sizes.set(root, (sizes.get(root) ?? 0) + 1);
  }
  let next = 1;
  const numbered = new Map<string, number>();
  for (const artist of snapshot.artists) {
    const root = find(artist.slug);
    if (!numbered.has(root)) numbered.set(root, next++);
    roots.set(artist.slug, numbered.get(root) ?? 0);
  }
  return roots;
}

function componentSize(snapshot: GrowthSnapshot, slug: string): number {
  const ids = components(snapshot);
  const mine = ids.get(slug);
  if (mine == null) return 0;
  let size = 0;
  for (const value of ids.values()) if (value === mine) size += 1;
  return size;
}

function pairs(slugs: string[]): string[] {
  const unique = [...new Set(slugs)].sort();
  const found: string[] = [];
  for (let i = 0; i < unique.length; i += 1) {
    for (let j = i + 1; j < unique.length; j += 1) found.push(`${unique[i]}|${unique[j]}`);
  }
  return found;
}

export function graphValueFor(
  candidate: FactualCandidate,
  snapshot: GrowthSnapshot,
  resolvedSlugs: string[],
  decision: DuplicateDecision,
): GraphValue {
  const newArtist = resolvedSlugs.some((slug) => {
    const artist = snapshot.artists.find((item) => item.slug === slug);
    return !artist || artist.exhibitionIds.length === 0;
  });
  const spaceKnown = snapshot.exhibitions.some((exhibition) => sameVerifiedSpace(exhibition.space, candidate.space));
  const existingPairs = new Set(snapshot.exhibitions.flatMap((exhibition) => pairs(exhibition.artistSlugs)));
  const target = decision === "EXACT"
    ? snapshot.exhibitions.find((exhibition) => duplicateDecision(candidate, exhibition) === "EXACT")
    : null;
  const combined = [...new Set([...(target?.artistSlugs ?? []), ...resolvedSlugs])];
  const addedPairs = pairs(combined).filter((pair) => !existingPairs.has(pair));
  const componentsBefore = new Set(resolvedSlugs.map((slug) => components(snapshot).get(slug)).filter((value) => value != null));
  const isolated = resolvedSlugs.some((slug) => componentSize(snapshot, slug) <= 1);
  const years = new Map<string, Set<number>>();
  for (const exhibition of snapshot.exhibitions) {
    if (exhibition.year == null) continue;
    for (const slug of exhibition.artistSlugs) {
      const bucket = years.get(slug) ?? new Set<number>();
      bucket.add(exhibition.year);
      years.set(slug, bucket);
    }
  }
  const chronologyValue = resolvedSlugs.some((slug) => candidate.startYear != null && !years.get(slug)?.has(candidate.startYear))
    ? "NEW_YEAR"
    : resolvedSlugs.length > 0
      ? "DENSIFY"
      : "NONE";
  return {
    newExhibition: decision === "NEW",
    newArtist,
    newSpace: Boolean(candidate.space) && !spaceKnown && decision === "NEW",
    newArtistPairCount: decision === "REVIEW" ? 0 : addedPairs.length,
    new2HopPaths: decision === "REVIEW" ? 0 : addedPairs.length,
    new3HopPaths: decision === "REVIEW" ? 0 : (combined.length >= 3 ? addedPairs.length : 0),
    connectsIsolatedArtist: isolated && combined.length >= 2,
    connectsTwoComponents: componentsBefore.size >= 2,
    chronologyValue,
  };
}

export type CandidatePreview = {
  pilotRecordId: string;
  decision: DuplicateDecision;
  resolved: string[];
  unresolved: string[];
  value: GraphValue;
};

export function previewCandidates(candidates: FactualCandidate[], snapshot: GrowthSnapshot): CandidatePreview[] {
  const names = snapshot.artists.map((artist) => ({ slug: artist.slug, labels: artist.labels }));
  return candidates.map((candidate) => {
    const resolved: string[] = [];
    const unresolved: string[] = [];
    for (const label of candidate.artistNames) {
      const slug = resolveArtistSlug(label, names);
      if (slug && !resolved.includes(slug)) resolved.push(slug);
      else if (!slug) unresolved.push(label);
    }
    const decision = snapshot.exhibitions.some((exhibition) => duplicateDecision(candidate, exhibition) === "EXACT")
      ? "EXACT"
      : snapshot.exhibitions.some((exhibition) => duplicateDecision(candidate, exhibition) === "REVIEW")
        ? "REVIEW"
        : "NEW";
    return {
      pilotRecordId: candidate.pilotRecordId,
      decision,
      resolved,
      unresolved,
      value: graphValueFor(candidate, snapshot, resolved, decision),
    };
  });
}

export function largestComponentSize(snapshot: GrowthSnapshot): number {
  const ids = components(snapshot);
  const sizes = new Map<number, number>();
  for (const value of ids.values()) sizes.set(value, (sizes.get(value) ?? 0) + 1);
  let largest = 0;
  for (const size of sizes.values()) largest = Math.max(largest, size);
  return largest;
}

export function buildGraphFrontier(input: {
  snapshot: GrowthSnapshot;
  demand: { query: string; count: number }[];
  candidateSources?: { artist: string; sources: string[] }[];
}): FrontierRow[] {
  const names = input.snapshot.artists.map((artist) => ({ slug: artist.slug, labels: artist.labels }));
  const ids = components(input.snapshot);
  const sizes = new Map<number, number>();
  for (const value of ids.values()) sizes.set(value, (sizes.get(value) ?? 0) + 1);
  let largest = 0;
  for (const size of sizes.values()) largest = Math.max(largest, size);
  const rows: FrontierRow[] = [];
  for (const name of input.snapshot.unresolved) {
    if (!mayRelinkUnresolvedName(name.exhibitionTitle)) continue;
    if (resolveArtistSlug(name.label, names)) continue;
    rows.push({
      artist: name.label,
      reason: "UNRESOLVED_PARTICIPANT",
      currentRecords: 0,
      currentComponent: 0,
      sharedMomentSource: name.exhibitionTitle,
      searchDemand: 0,
      candidateSources: [],
      priority: 1,
    });
  }
  for (const artist of input.snapshot.artists) {
    const component = ids.get(artist.slug) ?? 0;
    const size = sizes.get(component) ?? 1;
    const records = artist.exhibitionIds.length;
    if (size <= 1) {
      rows.push({
        artist: artist.slug,
        reason: "ISOLATED_ARTIST",
        currentRecords: records,
        currentComponent: size,
        sharedMomentSource: null,
        searchDemand: 0,
        candidateSources: [],
        priority: 4,
      });
    } else if (records < 3 && size === largest) {
      rows.push({
        artist: artist.slug,
        reason: "SPARSE_CONNECTED_ARTIST",
        currentRecords: records,
        currentComponent: size,
        sharedMomentSource: null,
        searchDemand: 0,
        candidateSources: [],
        priority: 2,
      });
    }
  }
  for (const demand of input.demand) {
    if (resolveArtistSlug(demand.query, names)) continue;
    rows.push({
      artist: demand.query,
      reason: "SEARCHED_MISSING_ARTIST",
      currentRecords: 0,
      currentComponent: 0,
      sharedMomentSource: null,
      searchDemand: demand.count,
      candidateSources: [],
      priority: 3,
    });
  }
  for (const source of input.candidateSources ?? []) {
    rows.push({
      artist: source.artist,
      reason: "BRIDGE_CANDIDATE",
      currentRecords: input.snapshot.artists.find((artist) => artist.slug === source.artist)?.exhibitionIds.length ?? 0,
      currentComponent: sizes.get(ids.get(source.artist) ?? 0) ?? 0,
      sharedMomentSource: null,
      searchDemand: 0,
      candidateSources: source.sources,
      priority: 2,
    });
  }
  const seen = new Set<string>();
  return rows
    .filter((row) => {
      const key = `${row.reason}|${row.artist}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => left.priority - right.priority || right.searchDemand - left.searchDemand || left.artist.localeCompare(right.artist));
}
