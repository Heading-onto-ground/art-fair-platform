import { componentMembership, type GrowthSnapshot } from "@/lib/history/growth";
import { densityForCount } from "@/lib/history/policy";
import { sameResearchTarget, type CandidateRecord, type ExpansionGraph } from "@/lib/history/expansionCandidates";
import { ESTIMATED_FETCHES_PER_JOB, type CandidateStatus } from "@/lib/history/expansionPolicy";

/**
 * Priority ranking for Global Artist Expansion V1.
 *
 * Allowed signals are factual or product-utility signals only: real visitor
 * demand, unresolved participant occurrences, graph adjacency, bridge
 * potential, trusted source hints, density, and previous outcomes.
 * No market, fame, follower, or auction signal exists in this file.
 */

export type RankedCandidate = {
  rank: number;
  candidate: CandidateRecord;
  score: number;
  reasons: string[];
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
  return Math.min(count, 12) * 3;
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
}): { score: number; reasons: string[] } {
  const { candidate } = input;
  const payload = candidate.payload;
  let score = 0;
  const reasons: string[] = [];
  const add = (points: number, reason: string) => {
    if (points === 0) return;
    score += points;
    reasons.push(`${points > 0 ? "+" : ""}${points} ${reason}`);
  };

  if (candidate.sourceType === "SPARSE_EXISTING_ARTIST") {
    const density = densityForCount(payload.exhibitionCount);
    const member = payload.existingArtistSlug ? input.membership.get(payload.existingArtistSlug) : undefined;
    if (density === "EMPTY") add(24, "existing artist with no public exhibition");
    else if (density === "LOW_DENSITY") add(30, "existing artist with sparse history");
    else if (density === "HISTORY_READY") add(12, "history-ready artist with room to grow");
    else add(-30, "rich history already");
    if (member && member.size > 1 && input.largestComponent > 1 && member.size === input.largestComponent) add(10, "inside the largest component");
    if (member && member.size <= 1) add(-8, "isolated until a shared exhibition exists");
  } else {
    if (candidate.sourceType === "UNRESOLVED_PARTICIPANT" || candidate.sourceType === "GROUP_ROSTER") {
      add(22, "explicit participant on a recorded exhibition");
      const extra = Math.max(0, payload.unresolvedOccurrences - 1);
      if (extra > 0) add(Math.min(extra, 4) * 8, `same label appears ${payload.unresolvedOccurrences} times`);
    }
    if (candidate.sourceType === "REAL_VISITOR_DEMAND") add(10, "real visitor search did not find this artist");
    if (candidate.sourceType === "GALLERY_ROSTER") add(14, "listed on a trusted representing-gallery roster");
    if (candidate.sourceType === "MUSEUM_ROSTER") add(14, "listed on a trusted museum roster");
  }

  const demand = demandPoints(candidate.demandCount);
  if (demand > 0) add(demand, `visitor missing-search demand ${candidate.demandCount}`);

  const shared = payload.sharedExistingArtists.filter((slug) => input.membership.has(slug));
  if (shared.length > 0) add(Math.min(shared.length, 5) * 6, `shares a verified exhibition with ${shared.length} ROB artist${shared.length === 1 ? "" : "s"}`);
  const components = new Set(shared.map((slug) => input.membership.get(slug)?.id).filter((id): id is number => id != null));
  if (components.size >= 2) add(28, `could connect ${components.size} graph components`);

  const hints = Math.min(payload.sourceHints.length, 3);
  if (hints > 0) add(hints * 6, `${payload.sourceHints.length} trusted source hint${payload.sourceHints.length === 1 ? "" : "s"}`);

  if (candidate.attemptCount > 0) add(-10 * Math.min(candidate.attemptCount, 3), `${candidate.attemptCount} previous attempt${candidate.attemptCount === 1 ? "" : "s"}`);
  const outcomes = payload.outcomes;
  if (outcomes.includes("IDENTITY_AMBIGUOUS")) add(-25, "ambiguous identity on a previous run");
  if (outcomes.includes("NO_TRUSTED_SOURCE")) add(-8, "no trusted source on a previous run");
  if (outcomes.includes("SOURCE_BLOCKED")) add(-6, "official source was blocked on a previous run");

  return { score, reasons };
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
  newSlots: number;
  sparseSlots: number;
  fetchBudgetLimit: number;
};

/**
 * Bounded daily batch. The research limit is the hard cap; the fetch budget
 * can only lower it. Slots are split between new identities and sparse
 * existing artists; an empty pool gives its slots to the other pool.
 * A second spelling of an already selected identity is skipped.
 */
export function selectDailyBatch(input: {
  ranked: readonly RankedCandidate[];
  researchLimit: number;
  sparseShare: number;
  fetchLimit: number;
}): BatchSelection {
  const fetchBudgetLimit = Math.max(0, Math.floor(input.fetchLimit / ESTIMATED_FETCHES_PER_JOB));
  const limit = Math.max(0, Math.min(Math.trunc(input.researchLimit), fetchBudgetLimit));
  const sparseSlots = Math.min(limit, Math.round(limit * input.sparseShare));
  const newSlots = limit - sparseSlots;
  const selected: RankedCandidate[] = [];
  const skippedDuplicateIdentity: RankedCandidate[] = [];
  const take = (kind: RankedCandidate["kind"], slots: number) => {
    let used = 0;
    for (const row of input.ranked) {
      if (used >= slots) break;
      if (row.kind !== kind || selected.includes(row)) continue;
      if (selected.some((chosen) => sameResearchTarget(chosen.candidate, row.candidate))) {
        if (!skippedDuplicateIdentity.includes(row)) skippedDuplicateIdentity.push(row);
        continue;
      }
      selected.push(row);
      used += 1;
    }
    return used;
  };
  const usedNew = take("NEW_IDENTITY", newSlots);
  const usedSparse = take("SPARSE_EXISTING", sparseSlots);
  const remaining = limit - usedNew - usedSparse;
  if (remaining > 0) {
    const filledNew = take("NEW_IDENTITY", remaining);
    if (remaining - filledNew > 0) take("SPARSE_EXISTING", remaining - filledNew);
  }
  selected.sort((left, right) => left.rank - right.rank);
  return { selected, skippedDuplicateIdentity, limit, newSlots, sparseSlots, fetchBudgetLimit };
}
