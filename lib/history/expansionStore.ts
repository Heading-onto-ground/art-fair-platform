import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma as untypedPrisma } from "@/lib/prisma";
import { countsAsFrontierDemand, DEMAND_SEPARATION_AT } from "@/lib/history/demandQuality";
import {
  coerceCandidatePayload,
  mergeObservations,
  normalizeCandidateName,
  type CandidateRecord,
  type ExpansionGraph,
} from "@/lib/history/expansionCandidates";
import { candidateAfterJob, childObservationsForJob, feedbackEvent, resolveSiblingCandidates } from "@/lib/history/expansionFeedback";
import {
  AUTONOMOUS_DEMAND_QUALITY,
  CANDIDATE_STATUSES,
  CIRCUIT_BREAKER,
  circuitBreakerReason,
  expansionPolicy,
  type BreakerSignals,
  type CandidateContext,
  type CandidateSourceType,
  type CandidateStatus,
  type ExpansionEvent,
  type ExpansionPolicy,
} from "@/lib/history/expansionPolicy";
import { runExpansion, type ExpansionDeps, type ExpansionMode, type ExpansionRunRecord } from "@/lib/history/expansionScheduler";
import { publicExhibitionWhere } from "@/lib/history/queries";
import { isAutonomousJob, type ResearchJobRecord } from "@/lib/history/researchJob";
import { findKnownArtist, listJobsForQuery, insertResearchJob, readResearchJob } from "@/lib/history/researchStore";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { fetchTrustedDocument } from "@/lib/history/trustedCrawl";

const prisma = untypedPrisma as PrismaClient;

type CandidateRow = {
  id: string;
  displayName: string;
  nativeNameCandidate: string | null;
  normalizedName: string;
  sourceType: string;
  sourceUrl: string | null;
  sourceHost: string | null;
  sourceContext: string;
  discoveredAt: Date;
  lastSeenAt: Date;
  status: string;
  identityCandidateId: string | null;
  resolvedArtistId: string | null;
  researchJobId: string | null;
  demandCount: number;
  graphAdjacencyScore: number;
  trustedSourceScore: number;
  bridgePotentialScore: number;
  attemptCount: number;
  lastAttemptAt: Date | null;
  nextEligibleAt: Date | null;
  failureCode: string | null;
  priorityScore: number;
  payload: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
};

function asCandidate(row: CandidateRow): CandidateRecord {
  return {
    id: row.id,
    displayName: row.displayName,
    nativeNameCandidate: row.nativeNameCandidate,
    normalizedName: row.normalizedName,
    sourceType: row.sourceType as CandidateSourceType,
    sourceUrl: row.sourceUrl,
    sourceHost: row.sourceHost,
    sourceContext: row.sourceContext as CandidateContext,
    discoveredAt: row.discoveredAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    status: (CANDIDATE_STATUSES as readonly string[]).includes(row.status) ? (row.status as CandidateStatus) : "NEW",
    identityCandidateId: row.identityCandidateId,
    resolvedArtistId: row.resolvedArtistId,
    researchJobId: row.researchJobId,
    demandCount: row.demandCount,
    graphAdjacencyScore: row.graphAdjacencyScore,
    trustedSourceScore: row.trustedSourceScore,
    bridgePotentialScore: row.bridgePotentialScore,
    attemptCount: row.attemptCount,
    lastAttemptAt: row.lastAttemptAt?.toISOString() ?? null,
    nextEligibleAt: row.nextEligibleAt?.toISOString() ?? null,
    failureCode: row.failureCode,
    priorityScore: row.priorityScore,
    payload: coerceCandidatePayload(row.payload),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function candidateData(row: CandidateRecord) {
  return {
    displayName: row.displayName,
    nativeNameCandidate: row.nativeNameCandidate,
    normalizedName: row.normalizedName,
    sourceType: row.sourceType,
    sourceUrl: row.sourceUrl,
    sourceHost: row.sourceHost,
    sourceContext: row.sourceContext,
    discoveredAt: new Date(row.discoveredAt),
    lastSeenAt: new Date(row.lastSeenAt),
    status: row.status,
    identityCandidateId: row.identityCandidateId,
    resolvedArtistId: row.resolvedArtistId,
    researchJobId: row.researchJobId,
    demandCount: row.demandCount,
    graphAdjacencyScore: row.payload.sharedExistingArtists.length,
    trustedSourceScore: row.payload.sourceHints.length,
    bridgePotentialScore: row.bridgePotentialScore,
    attemptCount: row.attemptCount,
    lastAttemptAt: row.lastAttemptAt ? new Date(row.lastAttemptAt) : null,
    nextEligibleAt: row.nextEligibleAt ? new Date(row.nextEligibleAt) : null,
    failureCode: row.failureCode,
    priorityScore: row.priorityScore,
    payload: row.payload as unknown as Prisma.InputJsonValue,
  };
}

export async function loadExpansionGraph(): Promise<ExpansionGraph> {
  const [exhibitions, unresolved] = await Promise.all([
    prisma.exhibition.findMany({
      where: publicExhibitionWhere,
      select: {
        id: true,
        title: true,
        space: { select: { name: true } },
        historyMeta: { select: { startYear: true } },
        historyArtists: {
          select: {
            artist: { select: { slug: true, canonicalName: true, nativeName: true, aliases: { select: { label: true } } } },
          },
        },
        historySources: { select: { source: { select: { url: true } } }, take: 1 },
      },
    }),
    prisma.historyUnresolvedName.findMany({
      where: { status: "UNRESOLVED_PARTICIPANT" },
      select: {
        label: true,
        exhibitionId: true,
        exhibition: {
          select: {
            title: true,
            historyArtists: { select: { artist: { select: { slug: true } } } },
            historySources: { select: { source: { select: { url: true } } }, take: 1 },
          },
        },
      },
    }),
  ]);
  const artists = new Map<string, ExpansionGraph["artists"][number]>();
  for (const exhibition of exhibitions) {
    for (const row of exhibition.historyArtists) {
      const current = artists.get(row.artist.slug) ?? {
        slug: row.artist.slug,
        labels: [row.artist.canonicalName, row.artist.nativeName, ...row.artist.aliases.map((alias) => alias.label)].filter((label): label is string => Boolean(label)),
        exhibitionIds: [],
      };
      if (!current.exhibitionIds.includes(exhibition.id)) current.exhibitionIds.push(exhibition.id);
      artists.set(row.artist.slug, current);
    }
  }
  return {
    artists: [...artists.values()],
    exhibitions: exhibitions.map((exhibition) => ({
      id: exhibition.id,
      title: exhibition.title,
      year: exhibition.historyMeta?.startYear ?? null,
      space: exhibition.space?.name ?? null,
      artistSlugs: exhibition.historyArtists.map((row) => row.artist.slug),
    })),
    unresolved: unresolved.map((row) => ({
      label: row.label,
      exhibitionId: row.exhibitionId,
      exhibitionTitle: row.exhibition.title,
      artistSlugs: row.exhibition.historyArtists.map((item) => item.artist.slug),
      sourceUrl: row.exhibition.historySources[0]?.source.url ?? null,
    })),
  };
}

export async function loadRealVisitorDemand(): Promise<{ query: string; count: number; lastSearched: string | null }[]> {
  const rows = await prisma.historySignal.groupBy({
    by: ["path"],
    where: { name: "SEARCH_NO_RESULT", createdAt: { gte: new Date(DEMAND_SEPARATION_AT) } },
    _count: { _all: true },
    _max: { createdAt: true },
  });
  return rows
    .filter((row) => row.path && countsAsFrontierDemand({ name: "SEARCH_NO_RESULT", createdAt: row._max.createdAt?.toISOString() ?? DEMAND_SEPARATION_AT, query: row.path }))
    .map((row) => ({ query: row.path as string, count: row._count._all, lastSearched: row._max.createdAt?.toISOString() ?? null }))
    .sort((left, right) => right.count - left.count || left.query.localeCompare(right.query));
}

export async function loadCandidates(): Promise<CandidateRecord[]> {
  const rows = await prisma.artistResearchCandidate.findMany({ orderBy: { priorityScore: "desc" } });
  return rows.map((row) => asCandidate(row as CandidateRow));
}

export async function saveCandidates(rows: readonly CandidateRecord[]): Promise<void> {
  for (const row of rows) {
    const data = candidateData(row);
    await prisma.artistResearchCandidate.upsert({
      where: { normalizedName: row.normalizedName },
      update: data,
      create: { id: row.id, ...data },
    });
  }
}

async function artistIds(): Promise<Map<string, string>> {
  const rows = await prisma.artistEntity.findMany({ select: { id: true, slug: true } });
  return new Map(rows.map((row) => [row.slug, row.id]));
}

function dayRange(dayKey: string): { gte: Date; lt: Date } {
  const start = new Date(`${dayKey}T00:00:00.000Z`);
  return { gte: start, lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

async function jobsStartedToday(dayKey: string): Promise<number> {
  return prisma.researchJob.count({ where: { demandQuality: AUTONOMOUS_DEMAND_QUALITY, requestedAt: dayRange(dayKey) } });
}

async function openVisitorJobs(): Promise<number> {
  return prisma.researchJob.count({ where: { demandQuality: { not: AUTONOMOUS_DEMAND_QUALITY }, stage: { not: "DONE" }, status: { in: ["RESEARCHING", "PARTIAL_RESULT"] } } });
}

async function emit(event: ExpansionEvent, path: string | null): Promise<void> {
  try {
    await prisma.historySignal.create({ data: { name: event, path } });
  } catch (error) {
    if (!isHistoryUnavailable(error)) console.error("expansion signal failed", error);
  }
}

async function recordRun(run: ExpansionRunRecord): Promise<void> {
  const data = {
    mode: run.mode,
    status: run.status,
    startedAt: new Date(run.startedAt),
    completedAt: run.completedAt ? new Date(run.completedAt) : null,
    candidatesObserved: run.candidatesObserved,
    candidatesInserted: run.candidatesInserted,
    candidatesUpdated: run.candidatesUpdated,
    jobsStarted: run.jobsStarted,
    jobsReused: run.jobsReused,
    estimatedFetches: run.estimatedFetches,
    failureCount: run.failureCount,
    summary: run.summary as unknown as Prisma.InputJsonValue,
  };
  await prisma.expansionRun.upsert({ where: { runKey: run.runKey }, update: data, create: { id: run.id, runKey: run.runKey, ...data } });
}

async function duplicateArtistCount(): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint | number }[]>`
    SELECT COUNT(*)::int AS count FROM (
      SELECT LOWER("canonicalName") AS name FROM "ArtistEntity" GROUP BY LOWER("canonicalName") HAVING COUNT(*) > 1
    ) duplicates
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function breakerSignals(): Promise<BreakerSignals> {
  try {
    const runs = await prisma.expansionRun.findMany({ where: { mode: { in: ["SCHEDULED", "MANUAL"] } }, orderBy: { startedAt: "desc" }, take: 5 });
    let consecutiveFailedRuns = 0;
    for (const run of runs) {
      if (run.status !== "FAILED") break;
      consecutiveFailedRuns += 1;
    }
    const last = runs.find((run) => run.status === "COMPLETED") ?? null;
    const lastSummary = (last?.summary ?? null) as { selected?: { action: string }[] } | null;
    const lastSelected = lastSummary?.selected ?? [];
    const failedStarts = lastSelected.filter((row) => row.action === "START_FAILED").length;
    const startFailureShare = lastSelected.length > 0 ? failedStarts / lastSelected.length : 0;
    const publicationsLastRun = last
      ? await prisma.researchJob.count({ where: { demandQuality: AUTONOMOUS_DEMAND_QUALITY, completedAt: { gte: last.startedAt }, verifiedFactCount: { gt: 0 } } })
      : 0;
    return {
      consecutiveFailedRuns,
      startFailureShare,
      publicationsLastRun,
      duplicateArtists: await duplicateArtistCount(),
      databaseUnavailable: false,
    };
  } catch (error) {
    if (isHistoryUnavailable(error)) return { consecutiveFailedRuns: 0, startFailureShare: 0, publicationsLastRun: 0, duplicateArtists: 0, databaseUnavailable: true };
    throw error;
  }
}

export function expansionDeps(input: { startWorkflow: ExpansionDeps["startWorkflow"]; fetchRoster?: boolean }): ExpansionDeps {
  return {
    now: () => new Date(),
    loadGraph: loadExpansionGraph,
    loadDemand: loadRealVisitorDemand,
    loadCandidates,
    saveCandidates,
    artistIds,
    fetchRoster: input.fetchRoster === false
      ? undefined
      : async (url) => {
        const page = await fetchTrustedDocument(url, { timeoutMs: 12_000 });
        return page.blocked ? null : page.html ?? null;
      },
    jobsStartedToday,
    openVisitorJobs,
    listJobsForQuery,
    readJob: readResearchJob,
    findKnown: findKnownArtist,
    insertJob: insertResearchJob,
    startWorkflow: input.startWorkflow,
    breakerSignals,
    recordRun,
    emit,
  };
}

export async function runExpansionWithStore(input: { mode: ExpansionMode; limit?: number; policy?: ExpansionPolicy; startWorkflow: ExpansionDeps["startWorkflow"]; fetchRoster?: boolean }) {
  return runExpansion({ mode: input.mode, limit: input.limit, policy: input.policy ?? expansionPolicy() }, expansionDeps({ startWorkflow: input.startWorkflow, fetchRoster: input.fetchRoster }));
}

/**
 * Research runtime hook. Called after any ResearchJob save. Visitor jobs
 * also feed the queue: a visitor job that publishes a group exhibition
 * returns unknown co-participants as candidates. Failures never break the job.
 */
export async function syncCandidatesWithJob(job: ResearchJobRecord): Promise<void> {
  try {
    const owner = job.payload.candidateId
      ? await prisma.artistResearchCandidate.findUnique({ where: { id: job.payload.candidateId } })
      : await prisma.artistResearchCandidate.findFirst({ where: { researchJobId: job.id } });
    const now = new Date();
    const changed: CandidateRecord[] = [];
    let ownerRecord: CandidateRecord | null = null;
    if (owner) {
      ownerRecord = candidateAfterJob(asCandidate(owner as CandidateRow), job, now);
      changed.push(ownerRecord);
    }
    if (job.stage !== "DONE") {
      if (changed.length > 0) await saveCandidates(changed);
      return;
    }
    const others = (await prisma.artistResearchCandidate.findMany({
      where: { status: { in: ["NEW", "QUEUED", "COOLDOWN", "NEEDS_REVIEW", "NO_TRUSTED_SOURCE", "IDENTITY_AMBIGUOUS", "BLOCKED"] } },
      take: 500,
    })).map((row) => asCandidate(row as CandidateRow));
    const siblings = resolveSiblingCandidates(others, job, owner?.id ?? null, now).filter((row, index) => row !== others[index]);
    changed.push(...siblings);
    const policy = expansionPolicy();
    const existingSlugs = (await prisma.artistEntity.findMany({ select: { slug: true } })).map((row) => row.slug);
    const children = childObservationsForJob(job, existingSlugs, policy.maxChildCandidates, now);
    if (children.length > 0) {
      const keys = children.map((child) => normalizeCandidateName(child.label)).filter((key): key is string => Boolean(key));
      const stored = await prisma.artistResearchCandidate.findMany({ where: { normalizedName: { in: keys } } });
      const merged = mergeObservations({
        existing: stored.map((row) => asCandidate(row as CandidateRow)),
        observations: children,
        now: now.toISOString(),
        observationLimit: policy.maxChildCandidates,
        writeLimit: policy.maxChildCandidates,
      });
      const before = new Map(stored.map((row) => [row.normalizedName, row.updatedAt.toISOString()]));
      changed.push(...merged.rows.filter((row) => before.get(row.normalizedName) !== row.updatedAt));
    }
    if (changed.length > 0) await saveCandidates(changed);
    if (ownerRecord && isAutonomousJob(job)) {
      const event = feedbackEvent({
        status: ownerRecord.status,
        failureCode: ownerRecord.failureCode,
        cooldown: Boolean(ownerRecord.nextEligibleAt),
        published: ownerRecord.status === "PUBLISHED" && ownerRecord.sourceType !== "SPARSE_EXISTING_ARTIST",
        expanded: ownerRecord.status === "PUBLISHED" && ownerRecord.sourceType === "SPARSE_EXISTING_ARTIST",
      });
      if (event) await emit(event, job.id);
    }
  } catch (error) {
    if (!isHistoryUnavailable(error)) console.error("expansion candidate sync failed", error);
  }
}

export type ExpansionHealth = {
  policy: ExpansionPolicy;
  paused: string | null;
  totalArtists: number;
  indexableArtists: number;
  candidates: Record<string, number>;
  candidateTotal: number;
  today: {
    dayKey: string;
    workflowStarts: number;
    published: number;
    expanded: number;
    needsReview: number;
    noTrustedSource: number;
    failedJobs: number;
    verifiedFacts: number;
    newExhibitions: number;
    newParticipations: number;
    newSharedPairs: number;
  };
  lastRun: ExpansionRunRecord | null;
  recentRuns: { runKey: string; mode: string; status: string; jobsStarted: number; candidatesObserved: number; startedAt: string }[];
  topMissingQueries: { query: string; count: number; lastSearched: string | null }[];
  nextCandidates: { displayName: string; status: string; priorityScore: number; sourceType: string; reasons: string[] }[];
  reviewCandidates: { displayName: string; status: string; failureCode: string | null; nextEligibleAt: string | null }[];
};

export async function loadExpansionHealth(now = new Date()): Promise<ExpansionHealth> {
  const dayKey = now.toISOString().slice(0, 10);
  const range = dayRange(dayKey);
  const [artists, grouped, runs, demand, next, review, jobsToday, exhibitionsToday, participationsToday, breaker] = await Promise.all([
    prisma.artistEntity.findMany({ select: { id: true, participations: { where: { exhibition: publicExhibitionWhere }, select: { id: true } } } }),
    prisma.artistResearchCandidate.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.expansionRun.findMany({ orderBy: { startedAt: "desc" }, take: 10 }),
    loadRealVisitorDemand(),
    prisma.artistResearchCandidate.findMany({ where: { status: { in: ["NEW", "QUEUED"] } }, orderBy: { priorityScore: "desc" }, take: 20 }),
    prisma.artistResearchCandidate.findMany({ where: { status: { in: ["NEEDS_REVIEW", "IDENTITY_AMBIGUOUS", "NO_TRUSTED_SOURCE", "BLOCKED"] } }, orderBy: { updatedAt: "desc" }, take: 20 }),
    prisma.researchJob.findMany({ where: { demandQuality: AUTONOMOUS_DEMAND_QUALITY, requestedAt: range } }),
    prisma.exhibition.findMany({ where: { createdAt: range, historyMeta: { origin: "ROB_RESEARCHED", publicationStatus: "PUBLIC" } }, select: { id: true, historyArtists: { select: { artistEntityId: true } } } }),
    prisma.historyParticipation.count({ where: { createdAt: range } }),
    breakerSignals(),
  ]);
  const candidates: Record<string, number> = {};
  let candidateTotal = 0;
  for (const row of grouped) {
    candidates[row.status] = row._count._all;
    candidateTotal += row._count._all;
  }
  const lastRunRow = runs[0] ?? null;
  const lastRun: ExpansionRunRecord | null = lastRunRow
    ? {
      id: lastRunRow.id,
      runKey: lastRunRow.runKey,
      mode: lastRunRow.mode as ExpansionMode,
      status: lastRunRow.status as ExpansionRunRecord["status"],
      startedAt: lastRunRow.startedAt.toISOString(),
      completedAt: lastRunRow.completedAt?.toISOString() ?? null,
      candidatesObserved: lastRunRow.candidatesObserved,
      candidatesInserted: lastRunRow.candidatesInserted,
      candidatesUpdated: lastRunRow.candidatesUpdated,
      jobsStarted: lastRunRow.jobsStarted,
      jobsReused: lastRunRow.jobsReused,
      estimatedFetches: lastRunRow.estimatedFetches,
      failureCount: lastRunRow.failureCount,
      summary: lastRunRow.summary as unknown as ExpansionRunRecord["summary"],
    }
    : null;
  const doneToday = jobsToday.filter((job) => job.stage === "DONE");
  const payloadOf = (job: (typeof jobsToday)[number]) => (job.payload ?? {}) as { expand?: boolean };
  let sharedPairs = 0;
  for (const exhibition of exhibitionsToday) {
    const n = new Set(exhibition.historyArtists.map((row) => row.artistEntityId)).size;
    sharedPairs += (n * (n - 1)) / 2;
  }
  return {
    policy: expansionPolicy(),
    paused: circuitBreakerReason(breaker),
    totalArtists: artists.length,
    indexableArtists: artists.filter((artist) => artist.participations.length >= 3).length,
    candidates,
    candidateTotal,
    today: {
      dayKey,
      workflowStarts: jobsToday.length,
      published: doneToday.filter((job) => job.verifiedFactCount > 0 && !payloadOf(job).expand).length,
      expanded: doneToday.filter((job) => job.verifiedFactCount > 0 && payloadOf(job).expand).length,
      needsReview: doneToday.filter((job) => job.status === "NEEDS_REVIEW" && job.failureCode !== "NO_TRUSTED_SOURCE").length,
      noTrustedSource: doneToday.filter((job) => job.failureCode === "NO_TRUSTED_SOURCE").length,
      failedJobs: doneToday.filter((job) => job.status === "NOT_FOUND" || job.status === "SOURCE_BLOCKED").length,
      verifiedFacts: doneToday.reduce((sum, job) => sum + job.verifiedFactCount, 0),
      newExhibitions: exhibitionsToday.length,
      newParticipations: participationsToday,
      newSharedPairs: sharedPairs,
    },
    lastRun,
    recentRuns: runs.map((run) => ({ runKey: run.runKey, mode: run.mode, status: run.status, jobsStarted: run.jobsStarted, candidatesObserved: run.candidatesObserved, startedAt: run.startedAt.toISOString() })),
    topMissingQueries: demand.slice(0, 20),
    nextCandidates: next.map((row) => {
      const payload = coerceCandidatePayload(row.payload);
      return { displayName: row.displayName, status: row.status, priorityScore: row.priorityScore, sourceType: row.sourceType, reasons: payload.reasons };
    }),
    reviewCandidates: review.map((row) => ({ displayName: row.displayName, status: row.status, failureCode: row.failureCode, nextEligibleAt: row.nextEligibleAt?.toISOString() ?? null })),
  };
}

export { CIRCUIT_BREAKER };
