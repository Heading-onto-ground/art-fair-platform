/**
 * Global Artist Expansion V1 policy.
 *
 * One place for budgets, cooldowns, and the kill switch. Routes and the
 * scheduler read this module; business numbers are not repeated elsewhere.
 * Environment variables override the defaults. Values are clamped so a typo
 * cannot start hundreds of workflows.
 */

export const EXPANSION_KILL_SWITCH = "ROB_EXPANSION_ENABLED";

export const EXPANSION_ENV = {
  enabled: EXPANSION_KILL_SWITCH,
  dailyCandidateLimit: "ROB_DAILY_CANDIDATE_LIMIT",
  dailyCandidateWriteLimit: "ROB_DAILY_CANDIDATE_WRITE_LIMIT",
  dailyResearchLimit: "ROB_DAILY_RESEARCH_LIMIT",
  dailyFetchLimit: "ROB_DAILY_FETCH_LIMIT",
  maxSourcesPerArtist: "ROB_MAX_SOURCES_PER_ARTIST",
  sparseShare: "ROB_EXPANSION_SPARSE_SHARE",
  maxChildCandidates: "ROB_EXPANSION_MAX_CHILD_CANDIDATES",
} as const;

export const EXPANSION_DEFAULTS = {
  enabled: false,
  /** Candidate observations considered per run. */
  dailyCandidateLimit: 100,
  /** Candidate rows inserted or updated per run. */
  dailyCandidateWriteLimit: 50,
  /** Autonomous ResearchJobs started per run. Visitor jobs are not counted. */
  dailyResearchLimit: 10,
  /** Estimated HTTP fetches the run may schedule. */
  dailyFetchLimit: 120,
  maxSourcesPerArtist: 4,
  /**
   * Historical sparse mix. Daily selection is score order and does not
   * reserve this share ahead of a higher-scoring exhibition bridge.
   */
  sparseShare: 0.3,
  /** New identity candidates one researched artist may add to the queue. */
  maxChildCandidates: 20,
} as const;

export const EXPANSION_HARD_MAX = {
  dailyCandidateLimit: 500,
  dailyCandidateWriteLimit: 200,
  dailyResearchLimit: 50,
  dailyFetchLimit: 1000,
  maxSourcesPerArtist: 8,
  maxChildCandidates: 50,
} as const;

/** Wikidata search + detail + institutions, roster index, and the page budget. Used for the fetch estimate. */
export const ESTIMATED_FETCHES_PER_JOB = 8;

/** An authorized operator batch never exceeds this many jobs in one request. */
export const MANUAL_BATCH_MAX = 10;

export type ExpansionPolicy = {
  enabled: boolean;
  dailyCandidateLimit: number;
  dailyCandidateWriteLimit: number;
  dailyResearchLimit: number;
  dailyFetchLimit: number;
  maxSourcesPerArtist: number;
  sparseShare: number;
  maxChildCandidates: number;
};

export const CANDIDATE_STATUSES = [
  "NEW",
  "QUEUED",
  "RESEARCHING",
  "RESOLVED_EXISTING",
  "PUBLISHED",
  "NEEDS_REVIEW",
  "NO_TRUSTED_SOURCE",
  "IDENTITY_AMBIGUOUS",
  "NOT_ARTIST",
  "BLOCKED",
  "COOLDOWN",
] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const CANDIDATE_SOURCE_TYPES = [
  "REAL_VISITOR_DEMAND",
  "UNRESOLVED_PARTICIPANT",
  "GROUP_ROSTER",
  "GALLERY_ROSTER",
  "MUSEUM_ROSTER",
  "IDENTITY_DISCOVERY",
  "SPARSE_EXISTING_ARTIST",
  "TRUSTED_EXHIBITION_ARCHIVE",
] as const;

export type CandidateSourceType = (typeof CANDIDATE_SOURCE_TYPES)[number];

export const CANDIDATE_CONTEXTS = ["USER_SEARCH", "DAILY_EXPANSION", "GRAPH_FRONTIER", "UNRESOLVED_PARTICIPANT"] as const;

export type CandidateContext = (typeof CANDIDATE_CONTEXTS)[number];

/** ResearchJob.demandQuality for autonomous jobs. Never a visitor class. */
export const AUTONOMOUS_DEMAND_QUALITY = "AUTONOMOUS_EXPANSION";

export const RESEARCH_ORIGINS = ["USER_SEARCH", "DAILY_EXPANSION"] as const;
export type ResearchOrigin = (typeof RESEARCH_ORIGINS)[number];

export const EXPANSION_EVENTS = [
  "EXPANSION_DAILY_STARTED",
  "EXPANSION_CANDIDATE_SELECTED",
  "EXPANSION_RESEARCH_STARTED",
  "EXPANSION_ARTIST_PUBLISHED",
  "EXPANSION_ARTIST_EXPANDED",
  "EXPANSION_NEEDS_REVIEW",
  "EXPANSION_DAILY_COMPLETED",
  "EXPANSION_PAUSED",
] as const;

export type ExpansionEvent = (typeof EXPANSION_EVENTS)[number];

/** Autonomous work never writes a visitor demand or Discovery funnel event. */
export const VISITOR_ONLY_EVENTS = new Set([
  "SEARCH_NO_RESULT",
  "DISCOVERY_OFFERED",
  "DISCOVERY_REQUESTED",
  "DISCOVERY_STARTED",
  "DISCOVERY_IDENTITY_RESOLVED",
  "DISCOVERY_SOURCE_FOUND",
  "DISCOVERY_FIRST_FACT_VERIFIED",
  "DISCOVERY_PARTIAL_RESULT",
  "DISCOVERY_COMPLETED",
  "DISCOVERY_NEEDS_REVIEW",
  "DISCOVERY_SOURCE_BLOCKED",
  "DISCOVERY_FAILED",
  "DISCOVERY_RESULT_OPENED",
]);

export function isVisitorOnlyEvent(name: string): boolean {
  return VISITOR_ONLY_EVENTS.has(name);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Cooldown after a terminal research outcome, in days.
 * A published candidate is not researched again by this engine.
 * Transient fetch failures are retried by the Workflow, not here.
 */
export const COOLDOWN_DAYS: Record<string, number> = {
  IDENTITY_AMBIGUOUS: 30,
  IDENTITY_NOT_FOUND: 60,
  NOT_FOUND: 60,
  NO_TRUSTED_SOURCE: 30,
  SOURCE_BLOCKED: 7,
  STEP_LIMIT: 14,
  PUBLICATION_REVIEW: 30,
  PARTICIPATION_AMBIGUOUS: 30,
  DUPLICATE_REVIEW: 30,
  NOT_ARTIST: 180,
  DEFAULT: 30,
};

export function cooldownDays(code: string | null | undefined): number {
  if (!code) return COOLDOWN_DAYS.DEFAULT;
  return COOLDOWN_DAYS[code] ?? COOLDOWN_DAYS.DEFAULT;
}

export function nextEligibleAfter(code: string | null | undefined, now: Date): Date {
  return new Date(now.getTime() + cooldownDays(code) * DAY_MS);
}

export function parseBooleanFlag(value: string | undefined | null): boolean {
  if (!value) return false;
  const text = value.trim().toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "on";
}

function clampInt(value: string | undefined | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

function clampShare(value: string | undefined | null, fallback: number): number {
  const parsed = Number.parseFloat(String(value ?? "").trim());
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return fallback;
  return parsed;
}

export function expansionPolicyFrom(env: Record<string, string | undefined>): ExpansionPolicy {
  return {
    enabled: parseBooleanFlag(env[EXPANSION_ENV.enabled]),
    dailyCandidateLimit: clampInt(env[EXPANSION_ENV.dailyCandidateLimit], EXPANSION_DEFAULTS.dailyCandidateLimit, EXPANSION_HARD_MAX.dailyCandidateLimit),
    dailyCandidateWriteLimit: clampInt(env[EXPANSION_ENV.dailyCandidateWriteLimit], EXPANSION_DEFAULTS.dailyCandidateWriteLimit, EXPANSION_HARD_MAX.dailyCandidateWriteLimit),
    dailyResearchLimit: clampInt(env[EXPANSION_ENV.dailyResearchLimit], EXPANSION_DEFAULTS.dailyResearchLimit, EXPANSION_HARD_MAX.dailyResearchLimit),
    dailyFetchLimit: clampInt(env[EXPANSION_ENV.dailyFetchLimit], EXPANSION_DEFAULTS.dailyFetchLimit, EXPANSION_HARD_MAX.dailyFetchLimit),
    maxSourcesPerArtist: clampInt(env[EXPANSION_ENV.maxSourcesPerArtist], EXPANSION_DEFAULTS.maxSourcesPerArtist, EXPANSION_HARD_MAX.maxSourcesPerArtist),
    sparseShare: clampShare(env[EXPANSION_ENV.sparseShare], EXPANSION_DEFAULTS.sparseShare),
    maxChildCandidates: clampInt(env[EXPANSION_ENV.maxChildCandidates], EXPANSION_DEFAULTS.maxChildCandidates, EXPANSION_HARD_MAX.maxChildCandidates),
  };
}

export function expansionPolicy(): ExpansionPolicy {
  return expansionPolicyFrom(process.env);
}

/**
 * Circuit breaker. The scheduler pauses when the previous runs show a global
 * failure pattern. Visitor-triggered Discovery is not affected by this state.
 */
export const CIRCUIT_BREAKER = {
  /** Consecutive runs with FAILED status. */
  maxConsecutiveFailedRuns: 2,
  /** Share of jobs started yesterday that ended as FETCH_FAILED or workflow start failure. */
  maxStartFailureShare: 0.5,
  /** Autonomous publications per run beyond which a spike is suspected. */
  maxPublicationsPerRun: 40,
  /**
   * One structured identity key attached to more than one ArtistEntity.
   * Shared display names and blank names are data-quality warnings, not this signal.
   */
  maxDuplicateResolvedIdentities: 0,
} as const;

export type BreakerSignals = {
  consecutiveFailedRuns: number;
  startFailureShare: number;
  publicationsLastRun: number;
  duplicateResolvedIdentities: number;
  databaseUnavailable: boolean;
};

/** A research result that already names both a stable identity and the ArtistEntity it resolved to. */
export type ResolvedIdentityLink = {
  identityKey: string | null | undefined;
  artistId: string | null | undefined;
};

/**
 * Count identity keys that point at two or more ArtistEntity ids.
 * The same key repeating on one artist is not a collision. A blank key is ignored.
 */
export function resolvedIdentityCollisionCount(links: readonly ResolvedIdentityLink[]): number {
  const artistsByKey = new Map<string, Set<string>>();
  for (const link of links) {
    const identityKey = link.identityKey?.trim() ?? "";
    const artistId = link.artistId?.trim() ?? "";
    if (!identityKey || !artistId) continue;
    const artists = artistsByKey.get(identityKey) ?? new Set<string>();
    artists.add(artistId);
    artistsByKey.set(identityKey, artists);
  }
  let collisions = 0;
  for (const artists of artistsByKey.values()) if (artists.size > 1) collisions += 1;
  return collisions;
}

/** Rows whose canonical name is empty. This is a review warning, not an identity collision. */
export function blankCanonicalNameCount(names: readonly string[]): number {
  return names.filter((name) => name.trim() === "").length;
}

/**
 * Rows that share a non-blank canonical name with another row.
 * Same display name is not proof those rows are the same artist.
 */
export function sameNameReviewCount(names: readonly string[]): number {
  const counts = new Map<string, number>();
  for (const name of names) {
    const key = name.trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let rows = 0;
  for (const count of counts.values()) if (count > 1) rows += count;
  return rows;
}

export function circuitBreakerReason(signals: BreakerSignals): string | null {
  if (signals.databaseUnavailable) return "DATABASE_UNAVAILABLE";
  if (signals.consecutiveFailedRuns >= CIRCUIT_BREAKER.maxConsecutiveFailedRuns) return "REPEATED_RUN_FAILURE";
  if (signals.startFailureShare > CIRCUIT_BREAKER.maxStartFailureShare) return "WORKFLOW_START_FAILURES";
  if (signals.publicationsLastRun > CIRCUIT_BREAKER.maxPublicationsPerRun) return "PUBLICATION_SPIKE";
  if (signals.duplicateResolvedIdentities > CIRCUIT_BREAKER.maxDuplicateResolvedIdentities) return "DUPLICATE_RESOLVED_IDENTITY";
  return null;
}

/** UTC day key. Two runs on the same day share the research budget. */
export function runDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}
