import { aliasLookupEqual } from "@/lib/history/identity";
import { rosterObservations, type CandidateObservation, type CandidateRecord } from "@/lib/history/expansionCandidates";
import { nextEligibleAfter, type CandidateStatus } from "@/lib/history/expansionPolicy";
import type { ResearchJobRecord } from "@/lib/history/researchJob";

/**
 * States written by a finished ResearchJob. A scheduler snapshot taken before
 * that write must not put the candidate back to RESEARCHING.
 */
export const TERMINAL_CANDIDATE_STATES: ReadonlySet<CandidateStatus> = new Set([
  "PUBLISHED",
  "RESOLVED_EXISTING",
  "COOLDOWN",
  "NEEDS_REVIEW",
  "NO_TRUSTED_SOURCE",
  "IDENTITY_AMBIGUOUS",
  "NOT_ARTIST",
  "BLOCKED",
]);

const STALE_PRE_TERMINAL: ReadonlySet<CandidateStatus> = new Set(["NEW", "QUEUED", "RESEARCHING"]);

/**
 * Compare-and-set for candidate rows. A terminal state from the same
 * ResearchJob wins over an older RESEARCHING/QUEUED snapshot. A different
 * job id may still start a new attempt.
 */
export function protectCandidateWrite(current: CandidateRecord | null, incoming: CandidateRecord): CandidateRecord {
  if (!current || !TERMINAL_CANDIDATE_STATES.has(current.status)) return incoming;
  const sameOrUnassignedJob = !incoming.researchJobId || incoming.researchJobId === current.researchJobId;
  if (sameOrUnassignedJob && STALE_PRE_TERMINAL.has(incoming.status)) return current;
  return incoming;
}

/**
 * Publication feedback into candidate state.
 *
 * The research engine owns every publication decision. This module only
 * records what happened to the candidate that started the job, puts the
 * candidate on cooldown when the outcome was terminal, and returns unknown
 * co-participants to the bounded candidate queue.
 */

export type CandidateOutcome = {
  status: CandidateStatus;
  failureCode: string | null;
  cooldown: boolean;
  published: boolean;
  expanded: boolean;
};

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

export function outcomeForJob(job: ResearchJobRecord, candidate: Pick<CandidateRecord, "sourceType">): CandidateOutcome {
  if (job.stage !== "DONE") return { status: "RESEARCHING", failureCode: null, cooldown: false, published: false, expanded: false };
  const sparse = candidate.sourceType === "SPARSE_EXISTING_ARTIST";
  if (job.verifiedFactCount > 0 && job.resolvedArtistId) {
    return { status: "PUBLISHED", failureCode: null, cooldown: false, published: !sparse, expanded: sparse };
  }
  if (job.identityStatus === "KNOWN" && job.resolvedArtistId && (job.status === "HISTORY_READY" || job.status === "PARTIAL_RESULT")) {
    return { status: "RESOLVED_EXISTING", failureCode: null, cooldown: false, published: false, expanded: false };
  }
  const code = job.failureCode;
  if (job.status === "NOT_FOUND") return { status: "COOLDOWN", failureCode: code ?? "IDENTITY_NOT_FOUND", cooldown: true, published: false, expanded: false };
  if (job.status === "SOURCE_BLOCKED") return { status: "BLOCKED", failureCode: code ?? "SOURCE_BLOCKED", cooldown: true, published: false, expanded: false };
  if (code === "NO_TRUSTED_SOURCE") return { status: "NO_TRUSTED_SOURCE", failureCode: code, cooldown: true, published: false, expanded: false };
  if (code === "IDENTITY_AMBIGUOUS") return { status: "IDENTITY_AMBIGUOUS", failureCode: code, cooldown: true, published: false, expanded: false };
  return { status: "NEEDS_REVIEW", failureCode: code ?? "PUBLICATION_REVIEW", cooldown: true, published: false, expanded: false };
}

/** Candidate row after the job that owns it moved. Idempotent for the same job state. */
export function candidateAfterJob(candidate: CandidateRecord, job: ResearchJobRecord, now: Date): CandidateRecord {
  const outcome = outcomeForJob(job, candidate);
  const stamp = now.toISOString();
  const labels = unique([...candidate.payload.labels, ...job.payload.labels, job.payload.latinName, job.payload.nativeName]);
  const outcomes = outcome.failureCode && !candidate.payload.outcomes.includes(outcome.failureCode)
    ? [...candidate.payload.outcomes, outcome.failureCode].slice(-10)
    : candidate.payload.outcomes;
  // One attempt per terminal job. Re-applying the same finished job does not count again.
  const terminalAt = job.stage === "DONE" ? (job.completedAt ?? stamp) : null;
  const alreadyCounted = terminalAt !== null && candidate.researchJobId === job.id && candidate.lastAttemptAt === terminalAt;
  const attemptCount = terminalAt !== null && !alreadyCounted ? candidate.attemptCount + 1 : candidate.attemptCount;
  const nativeName = candidate.nativeNameCandidate ?? job.payload.nativeName ?? null;
  return {
    ...candidate,
    status: outcome.status,
    failureCode: outcome.failureCode,
    identityCandidateId: job.payload.identity?.id ?? candidate.identityCandidateId,
    resolvedArtistId: job.resolvedArtistId ?? candidate.resolvedArtistId,
    researchJobId: job.id,
    nativeNameCandidate: nativeName,
    attemptCount,
    lastAttemptAt: terminalAt ?? candidate.lastAttemptAt ?? job.startedAt ?? stamp,
    nextEligibleAt: outcome.status === "BLOCKED"
      ? nextEligibleAfter("SOURCE_BLOCKED", now).toISOString()
      : outcome.cooldown
        ? nextEligibleAfter(outcome.failureCode, now).toISOString()
        : null,
    payload: {
      ...candidate.payload,
      labels,
      outcomes,
      existingArtistSlug: job.resolvedArtistSlug ?? candidate.payload.existingArtistSlug,
      identityKey: job.payload.identity?.id ?? candidate.payload.identityKey,
    },
    updatedAt: stamp,
  };
}

/**
 * Other candidates that are the same identity under another spelling.
 * When a job resolved its identity, every eligible sibling whose label equals
 * one of the job labels is RESOLVED_EXISTING and never starts its own workflow.
 */
export function resolveSiblingCandidates(
  rows: readonly CandidateRecord[],
  job: ResearchJobRecord,
  ownerId: string | null,
  now: Date,
): CandidateRecord[] {
  const labels = unique([job.query, ...job.payload.labels, job.payload.latinName, job.payload.nativeName]);
  if (labels.length === 0) return [...rows];
  const identityKnown = Boolean(job.payload.identity?.id || job.resolvedArtistId);
  if (!identityKnown) return [...rows];
  const stamp = now.toISOString();
  return rows.map((row) => {
    if (row.id === ownerId || row.sourceType === "SPARSE_EXISTING_ARTIST") return row;
    if (row.status === "RESOLVED_EXISTING" || row.status === "PUBLISHED" || row.status === "NOT_ARTIST") return row;
    if (row.researchJobId && row.researchJobId !== job.id && row.status === "RESEARCHING") return row;
    const mine = [row.displayName, ...row.payload.labels];
    if (!mine.some((label) => labels.some((other) => aliasLookupEqual(label, other)))) return row;
    return {
      ...row,
      status: "RESOLVED_EXISTING",
      identityCandidateId: job.payload.identity?.id ?? row.identityCandidateId,
      resolvedArtistId: job.resolvedArtistId ?? row.resolvedArtistId,
      researchJobId: job.id,
      payload: {
        ...row.payload,
        existingArtistSlug: job.resolvedArtistSlug ?? row.payload.existingArtistSlug,
        reasons: [`same identity as research job ${job.id} (${job.query})`],
      },
      updatedAt: stamp,
    };
  });
}

/**
 * Unknown explicit participants of the exhibitions this job published.
 * Bounded by `limit`; the next daily queue decides whether any of them is
 * researched. No workflow starts from here.
 */
export function childObservationsForJob(job: ResearchJobRecord, existingSlugs: readonly string[], limit: number, now: Date): CandidateObservation[] {
  const facts = job.payload.queued.filter((fact) => job.payload.publishedIds.includes(fact.pilotRecordId));
  return rosterObservations({
    facts,
    viaArtistSlug: job.resolvedArtistSlug,
    existingSlugs,
    seenAt: now.toISOString(),
    limit: Math.max(0, limit),
  });
}

export function feedbackEvent(outcome: CandidateOutcome): "EXPANSION_ARTIST_PUBLISHED" | "EXPANSION_ARTIST_EXPANDED" | "EXPANSION_NEEDS_REVIEW" | null {
  if (outcome.published) return "EXPANSION_ARTIST_PUBLISHED";
  if (outcome.expanded) return "EXPANSION_ARTIST_EXPANDED";
  if (outcome.status === "NEEDS_REVIEW" || outcome.status === "IDENTITY_AMBIGUOUS" || outcome.status === "NO_TRUSTED_SOURCE") return "EXPANSION_NEEDS_REVIEW";
  return null;
}
