import { createHash } from "node:crypto";
import { isInternalCheckQuery } from "@/lib/history/demandQuality";
import { aliasLookupEqual, mayRelinkUnresolvedName, normalizeArtistLookup, resolveArtistSlug, searchDemandQuery } from "@/lib/history/identity";
import { densityForCount, type HistoryDensity } from "@/lib/history/policy";
import { classifyRosterEntries, parseArtistRoster, rosterByIndex, type ArtistRosterEntry } from "@/lib/history/artistRosters";
import { classifyTrustedUrl, type CrawlFact } from "@/lib/history/trustedCrawl";
import type { GraphYieldNote } from "@/lib/history/expansionGraphValue";
import type { CandidateContext, CandidateSourceType, CandidateStatus } from "@/lib/history/expansionPolicy";

/**
 * Candidate discovery for Global Artist Expansion V1.
 *
 * A candidate is a possible research target. Nothing in this module creates
 * an ArtistEntity, an exhibition, or a participation. The scheduler decides
 * which candidates become ResearchJobs; the research engine decides what is
 * published.
 */

export type CandidateProvenance = {
  sourceType: CandidateSourceType;
  sourceContext: CandidateContext;
  sourceUrl: string | null;
  seenAt: string;
  viaArtistSlug?: string | null;
  viaExhibitionId?: string | null;
  viaExhibitionTitle?: string | null;
  viaInstitution?: string | null;
  rosterAdapter?: string | null;
  rosterIndexUrl?: string | null;
  rawLabel?: string | null;
  rosterQualifier?: string | null;
};

export type CandidatePayload = {
  labels: string[];
  provenance: CandidateProvenance[];
  existingArtistSlug: string | null;
  exhibitionCount: number;
  unresolvedOccurrences: number;
  sharedExistingArtists: string[];
  sourceHints: string[];
  reasons: string[];
  outcomes: string[];
  labelClass: LabelClass;
  /** Structured identity id, such as a Wikidata QID. This is not a published alias. */
  identityKey: string | null;
  /** Outcome of the research action that owned this candidate. Null until that job finishes. */
  graphYield: GraphYieldNote | null;
};

export type CandidateRecord = {
  id: string;
  displayName: string;
  nativeNameCandidate: string | null;
  normalizedName: string;
  sourceType: CandidateSourceType;
  sourceUrl: string | null;
  sourceHost: string | null;
  sourceContext: CandidateContext;
  discoveredAt: string;
  lastSeenAt: string;
  status: CandidateStatus;
  identityCandidateId: string | null;
  resolvedArtistId: string | null;
  researchJobId: string | null;
  demandCount: number;
  graphAdjacencyScore: number;
  trustedSourceScore: number;
  bridgePotentialScore: number;
  attemptCount: number;
  lastAttemptAt: string | null;
  nextEligibleAt: string | null;
  failureCode: string | null;
  priorityScore: number;
  payload: CandidatePayload;
  createdAt: string;
  updatedAt: string;
};

export type CandidateObservation = {
  label: string;
  nativeLabel?: string | null;
  sourceType: CandidateSourceType;
  sourceContext: CandidateContext;
  sourceUrl: string | null;
  seenAt: string;
  demandCount?: number;
  existingArtistSlug?: string | null;
  exhibitionCount?: number;
  unresolvedOccurrences?: number;
  sharedExistingArtists?: string[];
  sourceHints?: string[];
  via?: {
    artistSlug?: string | null;
    exhibitionId?: string | null;
    exhibitionTitle?: string | null;
    institution?: string | null;
  };
  rosterAdapter?: string | null;
  rosterIndexUrl?: string | null;
  rawLabel?: string | null;
  rosterQualifier?: string | null;
};

export type ExpansionGraph = {
  artists: { slug: string; labels: string[]; exhibitionIds: string[]; lastResearchAt?: string | null }[];
  exhibitions: { id: string; title: string; year: number | null; space: string | null; artistSlugs: string[] }[];
  unresolved: { label: string; exhibitionId: string | null; exhibitionTitle: string; artistSlugs: string[]; sourceUrl: string | null }[];
};

export type LabelClass = "PERSON_LIKE" | "ORGANIZATION" | "EXHIBITION_TITLE" | "INVALID" | "ENTITY_TYPE_REVIEW";

const ORGANIZATION_WORDS = /\b(gallery|galerie|galeria|museum|musee|musée|foundation|fondation|institute|institution|center|centre|biennale|biennial|triennial|art fair|collective|studio|university|college|school|archive|archives|association|society|company|inc\.?|ltd\.?|co\.|corporation|council|ministry|department|committee|press|magazine|journal|publishing|publisher|auction|fund|trust)\b/i;
const ORGANIZATION_KOREAN = /(갤러리|미술관|박물관|재단|연구소|센터|비엔날레|트리엔날레|아트페어|대학교|대학|협회|학회|위원회|출판사|옥션)/;
const EXHIBITION_WORDS = /\b(exhibition|retrospective|survey|works|paintings|drawings|sculptures|selected|anthology|installation view)\b/i;
const EXHIBITION_KOREAN = /(전시|회고전|개인전|단체전|기획전|특별전|작품전)/;

/** Deterministic label class. A title, organization, or address is not a person-like artist label. */
export function classifyCandidateLabel(label: string): LabelClass {
  const text = label.normalize("NFKC").replace(/\s+/g, " ").trim();
  const normalized = normalizeArtistLookup(text);
  if (normalized.length < 3 || normalized.length > 80 || normalized.includes("@") || /https?:\/\//i.test(text)) return "INVALID";
  if (/^\d+$/.test(normalized)) return "INVALID";
  if (ORGANIZATION_WORDS.test(text) || ORGANIZATION_KOREAN.test(text)) return "ORGANIZATION";
  if (/[:"“”«»]/.test(text) || /\b(19|20)\d{2}\b/.test(text) || EXHIBITION_WORDS.test(text) || EXHIBITION_KOREAN.test(text)) return "EXHIBITION_TITLE";
  const words = normalized.split(" ").filter(Boolean);
  if (words.length > 5) return "EXHIBITION_TITLE";
  return "PERSON_LIKE";
}

export function normalizeCandidateName(label: string): string | null {
  return searchDemandQuery(label);
}

export function existingArtistKey(slug: string): string {
  return `existing:${slug}`;
}

export function candidateId(normalizedName: string): string {
  return `cand-${createHash("sha256").update(normalizedName).digest("hex").slice(0, 16)}`;
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function unique(values: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const text = value?.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

export function emptyCandidatePayload(labelClass: LabelClass = "PERSON_LIKE"): CandidatePayload {
  return {
    labels: [],
    provenance: [],
    existingArtistSlug: null,
    exhibitionCount: 0,
    unresolvedOccurrences: 0,
    sharedExistingArtists: [],
    sourceHints: [],
    reasons: [],
    outcomes: [],
    labelClass,
    identityKey: null,
    graphYield: null,
  };
}

/** Rebuilds a payload that may have been stored by an older version. Missing arrays become empty. */
export function coerceCandidatePayload(value: unknown): CandidatePayload {
  const base = emptyCandidatePayload();
  if (!value || typeof value !== "object") return base;
  const raw = value as Partial<Record<keyof CandidatePayload, unknown>>;
  const strings = (input: unknown): string[] => (Array.isArray(input) ? input.filter((item): item is string => typeof item === "string") : []);
  return {
    labels: strings(raw.labels),
    provenance: Array.isArray(raw.provenance) ? (raw.provenance as CandidateProvenance[]) : [],
    existingArtistSlug: typeof raw.existingArtistSlug === "string" ? raw.existingArtistSlug : null,
    exhibitionCount: typeof raw.exhibitionCount === "number" ? raw.exhibitionCount : 0,
    unresolvedOccurrences: typeof raw.unresolvedOccurrences === "number" ? raw.unresolvedOccurrences : 0,
    sharedExistingArtists: strings(raw.sharedExistingArtists),
    sourceHints: strings(raw.sourceHints),
    reasons: strings(raw.reasons),
    outcomes: strings(raw.outcomes),
    labelClass: raw.labelClass === "ORGANIZATION" || raw.labelClass === "EXHIBITION_TITLE" || raw.labelClass === "INVALID" || raw.labelClass === "ENTITY_TYPE_REVIEW" ? raw.labelClass : "PERSON_LIKE",
    identityKey: typeof raw.identityKey === "string" && raw.identityKey.trim() ? raw.identityKey.trim() : null,
    graphYield: graphYieldOf(raw.graphYield),
  };
}

function graphYieldOf(value: unknown): GraphYieldNote | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<GraphYieldNote>;
  if (typeof raw.verifiedFacts !== "number") return null;
  return {
    verifiedFacts: raw.verifiedFacts,
    published: raw.published === true,
    expanded: raw.expanded === true,
    noResultReason: typeof raw.noResultReason === "string" ? raw.noResultReason : null,
  };
}

/**
 * Test and operator check names are never research targets.
 * They are dropped from every stream, not merely ranked lower.
 */
const FIXTURE_LABELS = new Set([
  "ada painter",
  "canary painter",
  "pending check name",
  "zzzz no artist",
]);

export function isExpansionFixtureLabel(label: string): boolean {
  const key = normalizeArtistLookup(label);
  if (!key || isInternalCheckQuery(label)) return true;
  if (FIXTURE_LABELS.has(key)) return true;
  return /^canary painter(?: \d+)?$/.test(key);
}

/** Stream A: post-separation REAL_VISITOR searches with no result. The caller filters demand quality. */
export function demandObservations(
  demand: readonly { query: string; count: number; lastSearched: string | null }[],
  graph: ExpansionGraph,
  seenAt: string,
): CandidateObservation[] {
  const names = graph.artists.map((artist) => ({ slug: artist.slug, labels: artist.labels }));
  const out: CandidateObservation[] = [];
  for (const row of demand) {
    if (row.count <= 0 || isExpansionFixtureLabel(row.query)) continue;
    if (resolveArtistSlug(row.query, names)) continue;
    out.push({
      label: row.query,
      sourceType: "REAL_VISITOR_DEMAND",
      sourceContext: "USER_SEARCH",
      sourceUrl: null,
      seenAt: row.lastSearched ?? seenAt,
      demandCount: row.count,
    });
  }
  return out;
}

/** Stream B: names already on trusted exhibition records in ROB but not yet resolved to an artist. */
export function unresolvedObservations(graph: ExpansionGraph, seenAt: string): CandidateObservation[] {
  const names = graph.artists.map((artist) => ({ slug: artist.slug, labels: artist.labels }));
  const grouped = new Map<string, { label: string; rows: ExpansionGraph["unresolved"] }>();
  for (const row of graph.unresolved) {
    if (!mayRelinkUnresolvedName(row.exhibitionTitle) || isExpansionFixtureLabel(row.label)) continue;
    if (resolveArtistSlug(row.label, names)) continue;
    const key = normalizeCandidateName(row.label);
    if (!key) continue;
    const current = grouped.get(key) ?? { label: row.label, rows: [] };
    current.rows.push(row);
    grouped.set(key, current);
  }
  const out: CandidateObservation[] = [];
  for (const group of grouped.values()) {
    const shared = unique(group.rows.flatMap((row) => row.artistSlugs));
    const first = group.rows[0];
    if (!first) continue;
    out.push({
      label: group.label,
      sourceType: "UNRESOLVED_PARTICIPANT",
      sourceContext: "UNRESOLVED_PARTICIPANT",
      sourceUrl: first.sourceUrl,
      seenAt,
      unresolvedOccurrences: group.rows.length,
      sharedExistingArtists: shared,
      sourceHints: unique(group.rows.map((row) => row.sourceUrl)).filter((url) => classifyTrustedUrl(url) !== null),
      via: { exhibitionId: first.exhibitionId, exhibitionTitle: first.exhibitionTitle, artistSlug: shared[0] ?? null },
    });
  }
  return out;
}

/** Sparse existing artists. RICH_HISTORY artists are skipped unless a real visitor searched for them. */
export function sparseArtistObservations(
  graph: ExpansionGraph,
  demand: readonly { query: string; count: number }[],
  seenAt: string,
): CandidateObservation[] {
  const out: CandidateObservation[] = [];
  for (const artist of graph.artists) {
    const count = artist.exhibitionIds.length;
    const density: HistoryDensity = densityForCount(count);
    const demandCount = demand.reduce((sum, row) => (artist.labels.some((label) => aliasLookupEqual(label, row.query)) ? sum + row.count : sum), 0);
    if (density === "RICH_HISTORY" && demandCount === 0) continue;
    const shared = unique(
      graph.exhibitions
        .filter((exhibition) => exhibition.artistSlugs.includes(artist.slug))
        .flatMap((exhibition) => exhibition.artistSlugs.filter((slug) => slug !== artist.slug)),
    );
    out.push({
      label: artist.labels[0] ?? artist.slug,
      sourceType: "SPARSE_EXISTING_ARTIST",
      sourceContext: "GRAPH_FRONTIER",
      sourceUrl: null,
      seenAt,
      demandCount,
      existingArtistSlug: artist.slug,
      exhibitionCount: count,
      sharedExistingArtists: shared,
    });
  }
  return out;
}

/**
 * Stream C: explicit participants from a verified group exhibition that one
 * research job published. Unknown names return to the queue as candidates.
 * They never become ArtistEntity here, and no workflow is started here.
 */
export function rosterObservations(input: {
  facts: readonly Pick<CrawlFact, "title" | "participants" | "provenance" | "pilotRecordId">[];
  viaArtistSlug: string | null;
  existingSlugs: readonly string[];
  seenAt: string;
  limit: number;
}): CandidateObservation[] {
  const out: CandidateObservation[] = [];
  const seen = new Set<string>();
  for (const fact of input.facts) {
    const resolved = unique(fact.participants.filter((person) => person.identity === "EXACT" && person.slug).map((person) => person.slug));
    const shared = unique([...resolved, input.viaArtistSlug]).filter((slug) => input.existingSlugs.includes(slug) || slug === input.viaArtistSlug);
    for (const person of fact.participants) {
      if (out.length >= input.limit) return out;
      if (person.evidence !== "EXPLICIT_PARTICIPANT" || isExpansionFixtureLabel(person.label)) continue;
      if (person.identity === "EXACT" && person.slug) continue;
      const key = normalizeCandidateName(person.label);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({
        label: person.label,
        sourceType: "GROUP_ROSTER",
        sourceContext: "UNRESOLVED_PARTICIPANT",
        sourceUrl: fact.provenance.sourceUrl,
        seenAt: input.seenAt,
        unresolvedOccurrences: 1,
        sharedExistingArtists: shared,
        sourceHints: classifyTrustedUrl(fact.provenance.sourceUrl) ? [fact.provenance.sourceUrl] : [],
        via: { artistSlug: input.viaArtistSlug, exhibitionId: fact.pilotRecordId, exhibitionTitle: fact.title, institution: fact.provenance.sourceName },
      });
    }
  }
  return out;
}

/** Parses one trusted gallery roster index. Only hosts in TRUSTED_SOURCES count. */
export function parseTrustedGalleryRoster(html: string, indexUrl: string): { name: string; nativeName: string | null; url: string }[] {
  const roster = rosterByIndex(indexUrl);
  if (!roster) return [];
  const seen = new Set<string>();
  const out: { name: string; nativeName: string | null; url: string }[] = [];
  for (const row of parseArtistRoster(html, roster)) {
    if (!row.profileUrl || seen.has(row.profileUrl) || !classifyTrustedUrl(row.profileUrl)) continue;
    seen.add(row.profileUrl);
    out.push({ name: row.displayName, nativeName: row.nativeNameCandidate, url: row.profileUrl });
  }
  return out;
}

/**
 * Stream E: museum roster rows an existing trusted adapter already parsed.
 * A URL outside the trusted crawler list is dropped. This does not trust the host.
 */
export function museumRosterObservations(input: {
  rows: readonly { name: string; url: string }[];
  sourceName: string;
  graph: ExpansionGraph;
  seenAt: string;
}): CandidateObservation[] {
  const names = input.graph.artists.map((artist) => ({ slug: artist.slug, labels: artist.labels }));
  const out: CandidateObservation[] = [];
  for (const row of input.rows) {
    if (!classifyTrustedUrl(row.url) || isExpansionFixtureLabel(row.name)) continue;
    if (resolveArtistSlug(row.name, names)) continue;
    out.push({
      label: row.name,
      sourceType: "MUSEUM_ROSTER",
      sourceContext: "DAILY_EXPANSION",
      sourceUrl: row.url,
      seenAt: input.seenAt,
      sourceHints: [row.url],
      via: { institution: input.sourceName },
    });
  }
  return out;
}

function observationFromRoster(row: ArtistRosterEntry, seenAt: string): CandidateObservation {
  return {
    label: row.displayName,
    nativeLabel: row.nativeNameCandidate,
    sourceType: "GALLERY_ROSTER",
    sourceContext: "DAILY_EXPANSION",
    sourceUrl: row.profileUrl,
    seenAt,
    sourceHints: row.profileUrl ? [row.profileUrl] : [],
    via: { institution: row.sourceName },
    rosterAdapter: row.adapter,
    rosterIndexUrl: row.indexUrl,
    rawLabel: row.rawLabel,
    rosterQualifier: row.rosterQualifier,
  };
}

/**
 * Stream D: representing-gallery artist lists ROB already trusts.
 * Existing artists, estates, collectives, and duplicate labels are not new identities.
 */
export function galleryRosterObservations(input: {
  html: string;
  indexUrl: string;
  sourceName: string;
  graph: ExpansionGraph;
  seenAt: string;
}): CandidateObservation[] {
  const roster = rosterByIndex(input.indexUrl);
  if (!roster) return [];
  const names = input.graph.artists.map((artist) => ({ slug: artist.slug, labels: artist.labels }));
  const classified = classifyRosterEntries(parseArtistRoster(input.html, roster), names);
  return classified.candidates
    .filter((row) => !isExpansionFixtureLabel(row.displayName) && !(row.nativeNameCandidate && isExpansionFixtureLabel(row.nativeNameCandidate)))
    .map((row) => observationFromRoster(row, input.seenAt));
}

export type MergeResult = {
  rows: CandidateRecord[];
  inserted: number;
  updated: number;
  skipped: number;
  observed: number;
};

function observationKey(observation: CandidateObservation): string | null {
  if (observation.sourceType === "SPARSE_EXISTING_ARTIST") {
    return observation.existingArtistSlug ? existingArtistKey(observation.existingArtistSlug) : null;
  }
  return normalizeCandidateName(observation.label);
}

function observationWeight(observation: CandidateObservation): number {
  return (observation.demandCount ?? 0) * 3
    + (observation.unresolvedOccurrences ?? 0) * 4
    + (observation.sharedExistingArtists?.length ?? 0) * 2
    + (observation.sourceHints?.length ?? 0) * 2
    + (observation.sourceType === "SPARSE_EXISTING_ARTIST" ? 1 : 0);
}

function provenanceOf(observation: CandidateObservation): CandidateProvenance {
  return {
    sourceType: observation.sourceType,
    sourceContext: observation.sourceContext,
    sourceUrl: observation.sourceUrl,
    seenAt: observation.seenAt,
    viaArtistSlug: observation.via?.artistSlug ?? null,
    viaExhibitionId: observation.via?.exhibitionId ?? null,
    viaExhibitionTitle: observation.via?.exhibitionTitle ?? null,
    viaInstitution: observation.via?.institution ?? null,
    rosterAdapter: observation.rosterAdapter ?? null,
    rosterIndexUrl: observation.rosterIndexUrl ?? null,
    rawLabel: observation.rawLabel ?? null,
    rosterQualifier: observation.rosterQualifier ?? null,
  };
}

function sameProvenance(left: CandidateProvenance, right: CandidateProvenance): boolean {
  return left.sourceType === right.sourceType
    && left.sourceUrl === right.sourceUrl
    && (left.viaExhibitionId ?? null) === (right.viaExhibitionId ?? null)
    && (left.viaArtistSlug ?? null) === (right.viaArtistSlug ?? null);
}

function newRecord(key: string, observation: CandidateObservation, now: string): CandidateRecord {
  const labelClass = observation.sourceType === "SPARSE_EXISTING_ARTIST"
    ? "PERSON_LIKE"
    : observation.rosterQualifier
      ? "ENTITY_TYPE_REVIEW"
      : classifyCandidateLabel(observation.label);
  const payload = emptyCandidatePayload(labelClass);
  payload.labels = unique([observation.label, observation.nativeLabel]);
  payload.provenance = [provenanceOf(observation)];
  payload.existingArtistSlug = observation.existingArtistSlug ?? null;
  payload.exhibitionCount = observation.exhibitionCount ?? 0;
  payload.unresolvedOccurrences = observation.unresolvedOccurrences ?? 0;
  payload.sharedExistingArtists = unique(observation.sharedExistingArtists ?? []);
  payload.sourceHints = unique(observation.sourceHints ?? []);
  return {
    id: candidateId(key),
    displayName: observation.label.trim(),
    nativeNameCandidate: observation.nativeLabel?.trim() || (/[가-힣]/.test(observation.label) ? observation.label.trim() : null),
    normalizedName: key,
    sourceType: observation.sourceType,
    sourceUrl: observation.sourceUrl,
    sourceHost: hostOf(observation.sourceUrl),
    sourceContext: observation.sourceContext,
    discoveredAt: observation.seenAt,
    lastSeenAt: observation.seenAt,
    status: labelClass === "PERSON_LIKE" ? "NEW" : "NOT_ARTIST",
    identityCandidateId: null,
    resolvedArtistId: null,
    researchJobId: null,
    demandCount: observation.demandCount ?? 0,
    graphAdjacencyScore: 0,
    trustedSourceScore: 0,
    bridgePotentialScore: 0,
    attemptCount: 0,
    lastAttemptAt: null,
    nextEligibleAt: null,
    failureCode: labelClass === "PERSON_LIKE" ? null : "NOT_ARTIST_LABEL",
    priorityScore: 0,
    payload,
    createdAt: now,
    updatedAt: now,
  };
}

function updateRecord(existing: CandidateRecord, observation: CandidateObservation, now: string): { row: CandidateRecord; changed: boolean } {
  const provenance = provenanceOf(observation);
  const payload: CandidatePayload = { ...existing.payload };
  let changed = false;
  const labels = unique([...payload.labels, observation.label, observation.nativeLabel]);
  if (labels.length !== payload.labels.length) {
    payload.labels = labels;
    changed = true;
  }
  if (!payload.provenance.some((item) => sameProvenance(item, provenance))) {
    payload.provenance = [...payload.provenance, provenance].slice(-20);
    changed = true;
  }
  const shared = unique([...payload.sharedExistingArtists, ...(observation.sharedExistingArtists ?? [])]);
  if (shared.length !== payload.sharedExistingArtists.length) {
    payload.sharedExistingArtists = shared;
    changed = true;
  }
  const hints = unique([...payload.sourceHints, ...(observation.sourceHints ?? [])]);
  if (hints.length !== payload.sourceHints.length) {
    payload.sourceHints = hints;
    changed = true;
  }
  if (observation.unresolvedOccurrences != null && observation.unresolvedOccurrences !== payload.unresolvedOccurrences) {
    payload.unresolvedOccurrences = observation.unresolvedOccurrences;
    changed = true;
  }
  if (observation.exhibitionCount != null && observation.exhibitionCount !== payload.exhibitionCount) {
    payload.exhibitionCount = observation.exhibitionCount;
    changed = true;
  }
  const demandCount = observation.demandCount != null ? Math.max(existing.demandCount, observation.demandCount) : existing.demandCount;
  if (demandCount !== existing.demandCount) changed = true;
  const nativeName = existing.nativeNameCandidate ?? observation.nativeLabel?.trim() ?? null;
  if (nativeName !== existing.nativeNameCandidate) changed = true;
  const sourceUrl = existing.sourceUrl ?? observation.sourceUrl;
  if (sourceUrl !== existing.sourceUrl) changed = true;
  const lastSeenAt = observation.seenAt > existing.lastSeenAt ? observation.seenAt : existing.lastSeenAt;
  if (lastSeenAt !== existing.lastSeenAt) changed = true;
  if (!changed) return { row: existing, changed: false };
  return {
    row: {
      ...existing,
      demandCount,
      nativeNameCandidate: nativeName,
      sourceUrl,
      sourceHost: hostOf(sourceUrl),
      lastSeenAt,
      payload,
      updatedAt: now,
    },
    changed: true,
  };
}

/**
 * Merges observations into the candidate store. Observations are bounded by
 * `observationLimit`; row writes by `writeLimit`. Higher-weight observations
 * are kept when the budget truncates. Existing status is never downgraded.
 */
export function mergeObservations(input: {
  existing: readonly CandidateRecord[];
  observations: readonly CandidateObservation[];
  now: string;
  observationLimit: number;
  writeLimit: number;
}): MergeResult {
  const byKey = new Map<string, CandidateRecord>();
  for (const row of input.existing) byKey.set(row.normalizedName, row);
  const rosterStripe = new Map<CandidateObservation, number>();
  const rosterSeen = new Map<string, number>();
  for (const observation of input.observations) {
    if (observation.sourceType !== "GALLERY_ROSTER") continue;
    const institution = observation.via?.institution ?? "";
    const next = rosterSeen.get(institution) ?? 0;
    rosterStripe.set(observation, next);
    rosterSeen.set(institution, next + 1);
  }
  // Equal-weight gallery rows are striped by institution before the name
  // tie-break, so one roster cannot fill the write budget by itself.
  const observed = [...input.observations]
    .map((observation) => ({ observation, key: observationKey(observation), weight: observationWeight(observation) }))
    .filter((item): item is { observation: CandidateObservation; key: string; weight: number } => Boolean(item.key) && !isExpansionFixtureLabel(item.observation.label))
    .sort((left, right) => right.weight - left.weight
      || (rosterStripe.get(left.observation) ?? 0) - (rosterStripe.get(right.observation) ?? 0)
      || left.key.localeCompare(right.key))
    .slice(0, input.observationLimit);
  const changedKeys = new Set<string>();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  for (const { observation, key } of observed) {
    const current = byKey.get(key);
    if (!current) {
      if (changedKeys.size >= input.writeLimit) {
        skipped += 1;
        continue;
      }
      byKey.set(key, newRecord(key, observation, input.now));
      changedKeys.add(key);
      inserted += 1;
      continue;
    }
    const next = updateRecord(current, observation, input.now);
    if (!next.changed) continue;
    if (!changedKeys.has(key) && changedKeys.size >= input.writeLimit) {
      skipped += 1;
      continue;
    }
    byKey.set(key, next.row);
    if (!changedKeys.has(key)) updated += 1;
    changedKeys.add(key);
  }
  return {
    rows: [...byKey.values()],
    inserted,
    updated,
    skipped,
    observed: observed.length,
  };
}

/** Rows that must be written after a merge: the ones the merge changed. */
export function changedCandidates(before: readonly CandidateRecord[], after: readonly CandidateRecord[]): CandidateRecord[] {
  const previous = new Map(before.map((row) => [row.normalizedName, row]));
  return after.filter((row) => previous.get(row.normalizedName) !== row);
}

/**
 * Cheap identity dedupe before any crawling. A name candidate that already
 * matches a stored artist label or a verified alias is RESOLVED_EXISTING.
 * Sparse existing-artist candidates are keyed by slug and skip this check.
 */
export function resolveAgainstGraph(
  rows: readonly CandidateRecord[],
  graph: ExpansionGraph,
  artistIds: ReadonlyMap<string, string>,
  now: string,
): CandidateRecord[] {
  const names = graph.artists.map((artist) => ({ slug: artist.slug, labels: artist.labels }));
  return rows.map((row) => {
    if (row.sourceType === "SPARSE_EXISTING_ARTIST") return row;
    if (row.status === "RESOLVED_EXISTING" || row.status === "PUBLISHED") return row;
    const slug = [row.displayName, ...row.payload.labels].map((label) => resolveArtistSlug(label, names)).find(Boolean) ?? null;
    if (!slug) return row;
    return {
      ...row,
      status: "RESOLVED_EXISTING",
      resolvedArtistId: artistIds.get(slug) ?? row.resolvedArtistId,
      payload: { ...row.payload, existingArtistSlug: slug, reasons: [`resolved to existing artist ${slug} before research`] },
      updatedAt: now,
    };
  });
}

/** Two name candidates that share any label are one identity for scheduling. */
export function sameCandidateIdentity(left: CandidateRecord, right: CandidateRecord): boolean {
  if (left.normalizedName === right.normalizedName) return true;
  const leftLabels = [left.displayName, ...left.payload.labels];
  const rightLabels = [right.displayName, ...right.payload.labels];
  return leftLabels.some((a) => rightLabels.some((b) => aliasLookupEqual(a, b)));
}

/**
 * One research slot for two labels that each resolved to the same structured
 * identity. A shared key does not publish either label as an alias.
 * An unresolved or ambiguous label stays in its own slot.
 */
export function sameResearchTarget(left: CandidateRecord, right: CandidateRecord): boolean {
  const leftKey = left.payload.identityKey;
  const rightKey = right.payload.identityKey;
  if (leftKey && rightKey && leftKey === rightKey) return true;
  return sameCandidateIdentity(left, right);
}

export function applyIdentityResolution(
  rows: readonly CandidateRecord[],
  resolutions: ReadonlyMap<string, string | null>,
  now: string,
): CandidateRecord[] {
  return rows.map((row) => {
    if (!resolutions.has(row.normalizedName)) return row;
    const identityKey = resolutions.get(row.normalizedName);
    if (!identityKey || row.payload.identityKey === identityKey) return row;
    return {
      ...row,
      payload: { ...row.payload, identityKey },
      updatedAt: now,
    };
  });
}
