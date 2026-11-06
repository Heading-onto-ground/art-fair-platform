import { createHash } from "node:crypto";
import { searchDemandQuery } from "@/lib/history/identity";
import { slugifyName } from "@/lib/history/policy";
import { mayCreateParticipation } from "@/lib/history/identity";
import { spaceDecisionFor, type CrawlFact } from "@/lib/history/trustedCrawl";
import type { DiscoveryEntity, DiscoveryInstitution } from "@/lib/history/sourceDiscovery";
import type { HistoryLocale } from "@/lib/history/locale";

/**
 * Search-triggered Discovery job model.
 *
 * ResearchJob in PostgreSQL is the product record. A durable workflow may
 * advance it after the request returns; the browser only reads that record.
 * workflowRunId is execution infrastructure and is not part of the public view.
 * A partial unique index in prisma/sql/add-research-jobs.sql keeps one
 * unfinished job per normalized query once that migration is applied.
 */

export const RESEARCH_LIMITS = {
  maxSourcesChecked: 4,
  maxPagesFetched: 3,
  maxIdentityCandidates: 5,
  maxInstitutions: 8,
  maxSteps: 12,
  recursiveDepth: 0,
  stepBudgetMs: 12_000,
} as const;

export const RESEARCH_STATUSES = [
  "RESEARCHING",
  "PARTIAL_RESULT",
  "HISTORY_READY",
  "NEEDS_REVIEW",
  "SOURCE_BLOCKED",
  "NOT_FOUND",
] as const;

export type ResearchStatus = (typeof RESEARCH_STATUSES)[number];

export const RESEARCH_STAGES = ["IDENTITY", "SOURCES", "FETCH", "PUBLISH", "DONE"] as const;
export type ResearchStage = (typeof RESEARCH_STAGES)[number];

export type ResearchSource = {
  url: string;
  name: string;
  fetchable: boolean;
  checked: boolean;
  blocked: string | null;
};

export type ResearchFactView = {
  pilotRecordId: string;
  title: string;
  year: number | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  sourceName: string;
  sourceUrl: string;
  curator: string | null;
};

export type ResearchPayload = {
  expand: boolean;
  stepCount: number;
  emitted: string[];
  latinName: string | null;
  nativeName: string | null;
  labels: string[];
  proposedSlug: string | null;
  identity: DiscoveryEntity | null;
  institutions: DiscoveryInstitution[];
  sources: ResearchSource[];
  verified: ResearchFactView[];
  queued: CrawlFact[];
  publishedIds: string[];
  workflowRunId?: string | null;
  /** USER_SEARCH (default) or DAILY_EXPANSION. Internal provenance; not part of the public view. */
  origin?: "USER_SEARCH" | "DAILY_EXPANSION";
  /** ArtistResearchCandidate id when the job was started by the expansion scheduler. */
  candidateId?: string | null;
};

export function isAutonomousJob(job: Pick<ResearchJobRecord, "demandQuality" | "payload">): boolean {
  return job.payload.origin === "DAILY_EXPANSION" || job.demandQuality === "AUTONOMOUS_EXPANSION";
}

/** Visitor funnel events stay off autonomous jobs. Expansion events are recorded separately. */
export function signalsToRecord(job: Pick<ResearchJobRecord, "demandQuality" | "payload">, names: readonly string[]): string[] {
  if (isAutonomousJob(job)) return [];
  return [...names];
}

/**
 * Aliases stored on a new ArtistEntity. The search query is not an alias.
 * A label is stored only when the resolved identity record already carries it.
 */
export function publishableAliasLabels(job: Pick<ResearchJobRecord, "payload">): string[] {
  const identity = job.payload.identity;
  const canonical = (job.payload.latinName || identity?.label || "").trim().toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of [identity?.label, ...(identity?.aliases ?? []), job.payload.latinName, job.payload.nativeName]) {
    const text = label?.trim();
    const key = text?.toLowerCase();
    if (!text || !key || key === canonical || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= 8) break;
  }
  return out;
}

export type ResearchJobRecord = {
  id: string;
  query: string;
  normalizedQuery: string;
  locale: HistoryLocale;
  status: ResearchStatus;
  stage: ResearchStage;
  demandQuality: string;
  requestedAt: string;
  startedAt: string | null;
  updatedAt: string;
  completedAt: string | null;
  resolvedArtistId: string | null;
  resolvedArtistSlug: string | null;
  identityStatus: string | null;
  sourcesFound: number;
  sourcesChecked: number;
  verifiedFactCount: number;
  reviewFactCount: number;
  blockedSourceCount: number;
  failureCode: string | null;
  failureDetail: string | null;
  resultArtistSlug: string | null;
  payload: ResearchPayload;
};

export type ResearchStepState = "done" | "current" | "waiting";

export type ResearchPublicView = {
  id: string;
  query: string;
  locale: HistoryLocale;
  status: ResearchStatus;
  stage: ResearchStage;
  steps: { id: string; label: string; state: ResearchStepState }[];
  sourcesFound: number;
  sourcesChecked: number;
  verifiedFactCount: number;
  reviewFactCount: number;
  blockedSourceCount: number;
  updatedAt: string;
  resultHref: string | null;
  headline: string;
  detail: string;
  facts: ResearchFactView[];
  failureCode: string | null;
};

export function emptyPayload(expand = false): ResearchPayload {
  return {
    expand,
    stepCount: 0,
    emitted: [],
    latinName: null,
    nativeName: null,
    labels: [],
    proposedSlug: null,
    identity: null,
    institutions: [],
    sources: [],
    verified: [],
    queued: [],
    publishedIds: [],
    workflowRunId: null,
  };
}

export function normalizeResearchQuery(query: string): string | null {
  return searchDemandQuery(query);
}

export function researchSlugBase(latinName: string | null, normalizedQuery: string): string {
  const latin = latinName ? slugifyName(latinName) : "";
  if (latin && latin !== "artist") return latin;
  const hash = createHash("sha256").update(normalizedQuery).digest("hex").slice(0, 8);
  return `artist-${hash}`;
}

export function jobIsOpen(job: Pick<ResearchJobRecord, "stage" | "status">): boolean {
  return job.stage !== "DONE" && (job.status === "RESEARCHING" || job.status === "PARTIAL_RESULT");
}

export function reuseDecision(jobs: Pick<ResearchJobRecord, "id" | "stage" | "status" | "updatedAt">[]): "create" | { id: string } {
  const open = jobs.find((job) => jobIsOpen(job));
  if (open) return { id: open.id };
  const finished = [...jobs].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  if (finished) return { id: finished.id };
  return "create";
}

export function mayPublishCrawledFact(fact: CrawlFact): boolean {
  if (fact.decision !== "AUTO_IMPORT" || fact.alreadyRecorded || !fact.title) return false;
  if (fact.duplicate === "REVIEW") return false;
  if (spaceDecisionFor(fact.venue) === "REVIEW") return false;
  const explicit = fact.participants.filter((person) => mayCreateParticipation(person.evidence) && person.identity === "EXACT" && person.slug);
  return explicit.length > 0;
}

export function factView(fact: CrawlFact): ResearchFactView | null {
  if (!fact.title) return null;
  return {
    pilotRecordId: fact.pilotRecordId,
    title: fact.title,
    year: fact.startYear,
    venue: fact.venue,
    city: fact.city,
    country: fact.country,
    sourceName: fact.provenance.sourceName,
    sourceUrl: fact.provenance.sourceUrl,
    curator: fact.curators[0]?.rawName ?? null,
  };
}

const STEP_IDS = ["identity", "sources", "exhibitions", "places", "connections"] as const;

export function researchChecklist(job: Pick<ResearchJobRecord, "stage" | "identityStatus" | "sourcesFound" | "verifiedFactCount" | "payload">, locale: HistoryLocale): ResearchPublicView["steps"] {
  const labels = locale === "ko"
    ? ["작가 신원 확인", "공식 출처 발견", "전시 기록 확인 중", "장소 확인", "접점 확인"]
    : ["Identity confirmed", "Official sources found", "Checking exhibitions", "Places", "Connections"];
  const identityDone = job.identityStatus === "RESOLVED" || job.identityStatus === "KNOWN";
  const sourcesDone = job.sourcesFound > 0 && job.stage !== "IDENTITY" && job.stage !== "SOURCES";
  const factsDone = job.verifiedFactCount > 0;
  const placesDone = job.payload.verified.some((fact) => Boolean(fact.venue));
  const connectionsDone = false;
  const done = [identityDone, sourcesDone, factsDone, placesDone, connectionsDone];
  let currentSet = false;
  return STEP_IDS.map((id, index) => {
    const label = id === "exhibitions" && done[index]
      ? (locale === "ko" ? "전시 기록 확인" : "Exhibition records")
      : labels[index] ?? id;
    if (done[index]) return { id, label, state: "done" as const };
    if (!currentSet && job.stage !== "DONE") {
      currentSet = true;
      return { id, label, state: "current" as const };
    }
    return { id, label, state: "waiting" as const };
  });
}

export function researchHeadline(job: Pick<ResearchJobRecord, "query" | "status" | "verifiedFactCount" | "stage">, locale: HistoryLocale): { headline: string; detail: string } {
  const name = job.query.trim();
  if (locale === "ko") {
    if (job.status === "HISTORY_READY") return { headline: name, detail: "공식 기록 확인 완료" };
    if (job.status === "NEEDS_REVIEW") return { headline: "공식 출처는 찾았지만 일부 기록을 더 확인해야 합니다.", detail: "신원이나 참여 여부가 분명하지 않은 기록은 공개 이력에 넣지 않습니다." };
    if (job.status === "SOURCE_BLOCKED") return { headline: "일부 공식 출처에 현재 접근할 수 없습니다.", detail: "확인하지 못한 기록은 만들지 않습니다." };
    if (job.status === "NOT_FOUND") return { headline: "이 이름으로 확인할 수 있는 작가 신원을 찾지 못했습니다.", detail: "같은 이름의 다른 사람으로 기록을 만들지 않습니다." };
    if (job.verifiedFactCount > 0 && job.stage !== "DONE") return { headline: `${name}의 기록이 나타나고 있습니다.`, detail: "현재 기록은 일부입니다. ROB가 다른 공식 기록을 확인하고 있습니다." };
    if (job.stage === "DONE" && job.verifiedFactCount > 0) return { headline: `${name}의 확인된 기록은 여기까지입니다.`, detail: "현재 기록은 일부입니다." };
    if (job.stage === "DONE") return { headline: `${name}의 확인된 기록은 여기까지입니다.`, detail: "검토 중인 후보는 공개 이력과 섞지 않습니다." };
    return { headline: `ROB가 ${name}의 기록을 찾고 있습니다.`, detail: "확인된 사실만 이 화면에 나타납니다." };
  }
  if (job.status === "HISTORY_READY") return { headline: name, detail: "Official record check complete." };
  if (job.status === "NEEDS_REVIEW") return { headline: "Official sources were found, but some records still need review.", detail: "Uncertain identity or participation stays out of public history." };
  if (job.status === "SOURCE_BLOCKED") return { headline: "Some official sources cannot be reached right now.", detail: "ROB does not fill the gap with an unverified record." };
  if (job.status === "NOT_FOUND") return { headline: "ROB could not resolve an artist identity for this name.", detail: "No artist record is created from the search text alone." };
    if (job.verifiedFactCount > 0 && job.stage !== "DONE") return { headline: `Documented records for ${name} are appearing.`, detail: "Coverage is partial. ROB is checking other official records." };
  if (job.stage === "DONE" && job.verifiedFactCount > 0) return { headline: `This is the verified record for ${name} so far.`, detail: "Coverage is partial." };
  if (job.stage === "DONE") return { headline: `This is the verified record for ${name} so far.`, detail: "Records still in review are kept separate." };
  return { headline: `ROB is checking documented records for ${name}.`, detail: "Only verified facts appear here." };
}

export function projectResearchJob(job: ResearchJobRecord): ResearchPublicView {
  const copy = researchHeadline(job, job.locale);
  return {
    id: job.id,
    query: job.query,
    locale: job.locale,
    status: job.status,
    stage: job.stage,
    steps: researchChecklist(job, job.locale),
    sourcesFound: job.sourcesFound,
    sourcesChecked: job.sourcesChecked,
    verifiedFactCount: job.verifiedFactCount,
    reviewFactCount: job.reviewFactCount,
    blockedSourceCount: job.blockedSourceCount,
    updatedAt: job.updatedAt,
    resultHref: job.resultArtistSlug ? `/artists/${job.resultArtistSlug}` : null,
    headline: copy.headline,
    detail: copy.detail,
    facts: job.payload.verified.filter((fact) => job.payload.publishedIds.includes(fact.pilotRecordId)),
    failureCode: job.failureCode,
  };
}

export function discoveryEvents(before: ResearchJobRecord, after: ResearchJobRecord): string[] {
  const seen = new Set(before.payload.emitted);
  const next: string[] = [];
  const push = (name: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    next.push(name);
  };
  if (before.payload.stepCount === 0 && after.payload.stepCount > 0) push("DISCOVERY_STARTED");
  if (before.identityStatus !== "RESOLVED" && before.identityStatus !== "KNOWN" && (after.identityStatus === "RESOLVED" || after.identityStatus === "KNOWN")) {
    push("DISCOVERY_IDENTITY_RESOLVED");
  }
  if (before.sourcesFound === 0 && after.sourcesFound > 0) push("DISCOVERY_SOURCE_FOUND");
  if (before.verifiedFactCount === 0 && after.verifiedFactCount > 0) push("DISCOVERY_FIRST_FACT_VERIFIED");
  if (before.status !== "PARTIAL_RESULT" && after.status === "PARTIAL_RESULT") push("DISCOVERY_PARTIAL_RESULT");
  if (before.status !== "HISTORY_READY" && after.status === "HISTORY_READY") push("DISCOVERY_COMPLETED");
  if (before.status !== "NEEDS_REVIEW" && after.status === "NEEDS_REVIEW") push("DISCOVERY_NEEDS_REVIEW");
  if (before.status !== "SOURCE_BLOCKED" && after.status === "SOURCE_BLOCKED") push("DISCOVERY_SOURCE_BLOCKED");
  if (before.status !== "NOT_FOUND" && after.status === "NOT_FOUND") push("DISCOVERY_FAILED");
  return next;
}

const TRANSIENT_FAILURES = new Set(["SOURCE_RATE_LIMITED", "FETCH_FAILED"]);

export function researchStepDisposition(job: Pick<ResearchJobRecord, "stage" | "status" | "failureCode">): "retry" | "stop" | "continue" {
  if (job.stage === "DONE") return "stop";
  if (job.failureCode && TRANSIENT_FAILURES.has(job.failureCode) && job.status === "RESEARCHING") return "retry";
  return "continue";
}

export function workflowOwned(runId: string | null | undefined): boolean {
  return Boolean(runId);
}

/** Same predicate as the conditional UPDATE in claimResearchRun. */
export function workflowClaimAvailable(stage: string, workflowRunId: string | null | undefined): boolean {
  return stage !== "DONE" && (workflowRunId == null || workflowRunId === "");
}

/**
 * Serializes overlapping start attempts the way the row lock does:
 * the first empty claim writes "pending", and every later attempt loses.
 */
export function settleWorkflowClaims(attempts: number, stage = "IDENTITY"): number {
  let workflowRunId: string | null = null;
  let owners = 0;
  for (let index = 0; index < attempts; index += 1) {
    if (!workflowClaimAvailable(stage, workflowRunId)) continue;
    workflowRunId = "pending";
    owners += 1;
  }
  return owners;
}

export function withEvents(before: ResearchJobRecord, after: ResearchJobRecord): ResearchJobRecord {
  const emitted = discoveryEvents(before, after);
  if (emitted.length === 0) return after;
  return { ...after, payload: { ...after.payload, emitted: [...before.payload.emitted, ...emitted] } };
}
