import { componentMembership, type GrowthSnapshot } from "@/lib/history/growth";
import { densityForCount } from "@/lib/history/policy";
import { sameResearchTarget, type CandidateRecord, type ExpansionGraph } from "@/lib/history/expansionCandidates";
import { estimateBridge, type BridgeEstimate, type ResearchReason } from "@/lib/history/expansionGraphValue";
import { ESTIMATED_FETCHES_PER_JOB, type CandidateSourceType, type CandidateStatus } from "@/lib/history/expansionPolicy";

/**
 * Priority ranking for exhibition-first Daily Graph Expansion.
 *
 * The daily unit is one research action. Score prefers a verified shared
 * exhibition that can create Artist → Exhibition → Artist paths. Visitor
 * demand can raise a score. It cannot outrank a strong documented bridge,
 * and it cannot bypass provenance.
 * No market, fame, follower, auction, or celebrity signal exists in this file.
 */

/**
 * Weights audited from the previous ranker, then retuned so a shared
 * exhibition outranks roster-only and isolated demand. Demand stays capped.
 * One source family cannot fill the batch while a close alternative exists.
 */
export const GRAPH_RANK_WEIGHTS = {
  explicitParticipant: 26,
  sharedExhibitionFrontier: 22,
  perSharedArtist: 8,
  maxSharedArtists: 6,
  componentBridge: 32,
  trustedSourceHint: 4,
  maxTrustedHints: 3,
  visitorDemandType: 8,
  demandPerSearch: 3,
  demandCap: 12,
  galleryRoster: 12,
  museumRoster: 12,
  sparseEmpty: 18,
  sparseLowDensity: 28,
  sparseHistoryReady: 10,
  sparseRich: -30,
  sparseInsideLargest: 8,
  sparseIsolated: -8,
  sparseTrustedExhibition: 16,
  repeatOccurrence: 6,
  maxRepeat: 4,
  attemptPenalty: -10,
  maxAttempts: 3,
  ambiguousOutcome: -25,
  noTrustedOutcome: -8,
  sourceBlockedOutcome: -6,
  sourceFamilyCapShare: 0.6,
  sourceFamilyAlternativeRatio: 0.8,
} as const;

export type RankedCandidate = {
  rank: number;
  candidate: CandidateRecord;
  score: number;
  reasons: string[];
  researchReason: ResearchReason;
  bridge: BridgeEstimate;
  kind: "NEW_IDENTITY" | "SPARSE_EXISTING";
  estimatedFetches: number;
  expectedSourceFamilies: string[];
};

const TERMINAL_STATUSES: ReadonlySet<CandidateStatus> = new Set<CandidateStatus>([
  "RESEARCHING",
  "RESOLVED_EXISTING",
  "PUBLISHED",
  "NOT_ARTIST",
]);

export function eligibleForResearch(candidate: CandidateRecord, now: Date): boolean {
  if (TERMINAL_STATUSES.has(candidate.status)) return false;
  if (candidate.payload.labelClass !== "PERSON_LIKE") return false;
  if (candidate.status === "BLOCKED" && !candidate.nextEligibleAt) return false;
  if (candidate.nextEligibleAt && Date.parse(candidate.nextEligibleAt) > now.getTime()) return false;
  return true;
}

export function candidateKind(candidate: CandidateRecord): RankedCandidate["kind"] {
  return candidate.sourceType === "SPARSE_EXISTING_ARTIST" ? "SPARSE_EXISTING" : "NEW_IDENTITY";
}

function demandPoints(count: number): number {
  if (count <= 0) return 0;
  return Math.min(count, GRAPH_RANK_WEIGHTS.demandCap) * GRAPH_RANK_WEIGHTS.demandPerSearch;
}

function researchReasonFor(candidate: CandidateRecord, bridge: BridgeEstimate): ResearchReason {
  const shared = candidate.payload.sharedExistingArtists.length;
  const type: CandidateSourceType = candidate.sourceType;
  if (bridge.connectsComponents) return "GRAPH_BRIDGE_CANDIDATE";
  if ((type === "UNRESOLVED_PARTICIPANT" || type === "GROUP_ROSTER") && shared >= 2) return "SHARED_EXHIBITION_FRONTIER";
  if (type === "UNRESOLVED_PARTICIPANT" || type === "GROUP_ROSTER") return "UNRESOLVED_PARTICIPANT";
  if (type === "SPARSE_EXISTING_ARTIST") return "SPARSE_ARTIST";
  if (type === "MUSEUM_ROSTER") return "TRUSTED_INSTITUTION_FRONTIER";
  if (type === "GALLERY_ROSTER") return "TRUSTED_ROSTER";
  return "SEARCH_DEMAND";
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function expectedSourceFamilies(candidate: CandidateRecord): string[] {
  const hosts = candidate.payload.sourceHints.map(hostOf).filter((host): host is string => Boolean(host));
  const families = new Set<string>(hosts);
  if (candidate.sourceType === "SPARSE_EXISTING_ARTIST" || candidate.payload.sharedExistingArtists.length > 0) families.add("shared-exhibition source");
  if (families.size === 0) families.add("identity lookup → official site / representing gallery / museum");
  return [...families].sort();
}

export function scoreCandidate(input: {
  candidate: CandidateRecord;
  graph: ExpansionGraph;
  membership: ReadonlyMap<string, { id: number; size: number }>;
  largestComponent: number;
}): { score: number; reasons: string[]; bridge: BridgeEstimate; researchReason: ResearchReason } {
  const { candidate } = input;
  const weights = GRAPH_RANK_WEIGHTS;
  const payload = candidate.payload;
  const linked = estimateBridge(payload.sharedExistingArtists, input.membership);
  // An existing artist already has these paths. Counting them again would
  // rank a dense history above a participant who would create new paths.
  const bridge: BridgeEstimate = candidate.sourceType === "SPARSE_EXISTING_ARTIST"
    ? { ...linked, potentialPaths: 0 }
    : linked;
  const researchReason = researchReasonFor(candidate, bridge);
  let score = 0;
  const reasons: string[] = [`research reason ${researchReason}`];
  const add = (points: number, reason: string) => {
    if (points === 0) return;
    score += points;
    reasons.push(`${points > 0 ? "+" : ""}${points} ${reason}`);
  };

  if (candidate.sourceType === "SPARSE_EXISTING_ARTIST") {
    const density = densityForCount(payload.exhibitionCount);
    const member = payload.existingArtistSlug ? input.membership.get(payload.existingArtistSlug) : undefined;
    if (density === "EMPTY") add(weights.sparseEmpty, "existing artist with no public exhibition");
    else if (density === "LOW_DENSITY") add(weights.sparseLowDensity, "existing artist with sparse history");
    else if (density === "HISTORY_READY") add(weights.sparseHistoryReady, "history-ready artist with room to grow");
    else add(weights.sparseRich, "rich history already");
    if (linked.existingArtistLinks > 0) add(weights.sparseTrustedExhibition, "trusted exhibition already links this artist");
    if (member && member.size > 1 && input.largestComponent > 1 && member.size === input.largestComponent) add(weights.sparseInsideLargest, "inside the largest component");
    if (member && member.size <= 1) add(weights.sparseIsolated, "isolated until a shared exhibition exists");
  } else {
    if (candidate.sourceType === "UNRESOLVED_PARTICIPANT" || candidate.sourceType === "GROUP_ROSTER") {
      add(weights.explicitParticipant, "explicit participant on a recorded exhibition");
      if (bridge.existingArtistLinks >= 2) add(weights.sharedExhibitionFrontier, "shared exhibition can create documented artist paths");
      const extra = Math.max(0, payload.unresolvedOccurrences - 1);
      if (extra > 0) add(Math.min(extra, weights.maxRepeat) * weights.repeatOccurrence, `same label appears ${payload.unresolvedOccurrences} times`);
    }
    if (candidate.sourceType === "REAL_VISITOR_DEMAND") add(weights.visitorDemandType, "real visitor search did not find this artist");
    if (candidate.sourceType === "GALLERY_ROSTER") add(weights.galleryRoster, "listed on a trusted representing-gallery roster");
    if (candidate.sourceType === "MUSEUM_ROSTER") add(weights.museumRoster, "listed on a trusted museum roster");
  }

  const demand = demandPoints(candidate.demandCount);
  if (demand > 0) add(demand, `visitor missing-search demand ${candidate.demandCount}`);

  const shared = payload.sharedExistingArtists.filter((slug) => input.membership.has(slug));
  if (candidate.sourceType !== "SPARSE_EXISTING_ARTIST" && shared.length > 0) {
    add(Math.min(shared.length, weights.maxSharedArtists) * weights.perSharedArtist, `shares a verified exhibition with ${shared.length} ROB artist${shared.length === 1 ? "" : "s"}`);
  }
  if (bridge.connectsComponents) add(weights.componentBridge, `could connect ${bridge.componentCount} graph components`);

  const hints = Math.min(payload.sourceHints.length, weights.maxTrustedHints);
  if (hints > 0) add(hints * weights.trustedSourceHint, `${payload.sourceHints.length} trusted source hint${payload.sourceHints.length === 1 ? "" : "s"}`);

  if (candidate.attemptCount > 0) add(weights.attemptPenalty * Math.min(candidate.attemptCount, weights.maxAttempts), `${candidate.attemptCount} previous attempt${candidate.attemptCount === 1 ? "" : "s"}`);
  const outcomes = payload.outcomes;
  if (outcomes.includes("IDENTITY_AMBIGUOUS")) add(weights.ambiguousOutcome, "ambiguous identity on a previous run");
  if (outcomes.includes("NO_TRUSTED_SOURCE")) add(weights.noTrustedOutcome, "no trusted source on a previous run");
  if (outcomes.includes("SOURCE_BLOCKED")) add(weights.sourceBlockedOutcome, "official source was blocked on a previous run");

  return { score, reasons, bridge, researchReason };
}

export function rankCandidates(input: {
  candidates: readonly CandidateRecord[];
  graph: ExpansionGraph;
  now: Date;
}): RankedCandidate[] {
  const snapshot: GrowthSnapshot = {
    artists: input.graph.artists.map((artist) => ({ slug: artist.slug, labels: artist.labels, exhibitionIds: artist.exhibitionIds })),
    exhibitions: input.graph.exhibitions.map((exhibition) => ({ ...exhibition, city: null })),
    unresolved: input.graph.unresolved.map((row) => ({ label: row.label, exhibitionTitle: row.exhibitionTitle })),
  };
  const membership = componentMembership(snapshot);
  let largest = 0;
  for (const item of membership.values()) largest = Math.max(largest, item.size);
  const scored = input.candidates
    .filter((candidate) => eligibleForResearch(candidate, input.now))
    .map((candidate) => {
      const result = scoreCandidate({ candidate, graph: input.graph, membership, largestComponent: largest });
      return {
        rank: 0,
        candidate,
        score: result.score,
        reasons: result.reasons,
        researchReason: result.researchReason,
        bridge: result.bridge,
        kind: candidateKind(candidate),
        estimatedFetches: ESTIMATED_FETCHES_PER_JOB,
        expectedSourceFamilies: expectedSourceFamilies(candidate),
      };
    });
  scored.sort((left, right) =>
    right.score - left.score
    || right.candidate.demandCount - left.candidate.demandCount
    || left.candidate.lastSeenAt.localeCompare(right.candidate.lastSeenAt)
    || left.candidate.normalizedName.localeCompare(right.candidate.normalizedName));
  return scored.map((row, index) => ({ ...row, rank: index + 1 }));
}

export type BatchSelection = {
  selected: RankedCandidate[];
  skippedDuplicateIdentity: RankedCandidate[];
  limit: number;
  /** Actual sparse artists selected by score, not a reserved quota. */
  newSlots: number;
  sparseSlots: number;
  /** Operator setting. Selection does not reserve this share. */
  configuredSparseShare: number;
  fetchBudgetLimit: number;
};

/**
 * Bounded daily batch. The research limit is the hard cap; the fetch budget
 * can only lower it. Selection follows score. `sparseShare` is retained for
 * operators and is not a slot reservation: a lower-scoring sparse artist
 * does not displace a higher-scoring exhibition bridge.
 * One source family cannot fill the batch while a close-scoring alternative
 * from another family is still waiting. A second spelling of an already
 * selected identity is skipped. Fewer than the limit is acceptable.
 */
export function selectDailyBatch(input: {
  ranked: readonly RankedCandidate[];
  researchLimit: number;
  sparseShare: number;
  fetchLimit: number;
}): BatchSelection {
  const fetchBudgetLimit = Math.max(0, Math.floor(input.fetchLimit / ESTIMATED_FETCHES_PER_JOB));
  const limit = Math.max(0, Math.min(Math.trunc(input.researchLimit), fetchBudgetLimit));
  const familyCap = Math.max(1, Math.ceil(limit * GRAPH_RANK_WEIGHTS.sourceFamilyCapShare));
  const selected: RankedCandidate[] = [];
  const skippedDuplicateIdentity: RankedCandidate[] = [];
  const deferred: RankedCandidate[] = [];
  const familyCount = new Map<string, number>();
  const familyOf = (row: RankedCandidate) => row.candidate.sourceHost ?? row.candidate.sourceType;
  const blocked = (row: RankedCandidate) => selected.some((chosen) => sameResearchTarget(chosen.candidate, row.candidate));
  for (const row of input.ranked) {
    if (selected.length >= limit) break;
    if (blocked(row)) {
      if (!skippedDuplicateIdentity.includes(row)) skippedDuplicateIdentity.push(row);
      continue;
    }
    const family = familyOf(row);
    const count = familyCount.get(family) ?? 0;
    if (count >= familyCap) {
      const alternative = input.ranked.find((other) =>
        other !== row
        && !selected.includes(other)
        && !deferred.includes(other)
        && familyOf(other) !== family
        && !blocked(other)
        && other.score >= row.score * GRAPH_RANK_WEIGHTS.sourceFamilyAlternativeRatio);
      if (alternative) {
        deferred.push(row);
        continue;
      }
    }
    selected.push(row);
    familyCount.set(family, count + 1);
  }
  for (const row of deferred) {
    if (selected.length >= limit) break;
    if (blocked(row)) {
      if (!skippedDuplicateIdentity.includes(row)) skippedDuplicateIdentity.push(row);
      continue;
    }
    selected.push(row);
  }
  selected.sort((left, right) => left.rank - right.rank);
  const sparseSlots = selected.filter((row) => row.kind === "SPARSE_EXISTING").length;
  const newSlots = selected.length - sparseSlots;
  return {
    selected,
    skippedDuplicateIdentity,
    limit,
    newSlots,
    sparseSlots,
    configuredSparseShare: input.sparseShare,
    fetchBudgetLimit,
  };
}
