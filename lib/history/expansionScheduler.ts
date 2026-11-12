import { randomUUID } from "node:crypto";
import {
  changedCandidates,
  demandObservations,
  galleryRosterObservations,
  mergeObservations,
  normalizeCandidateName,
  resolveAgainstGraph,
  sparseArtistObservations,
  unresolvedObservations,
  type CandidateObservation,
  type CandidateRecord,
  type ExpansionGraph,
} from "@/lib/history/expansionCandidates";
import { candidateAfterJob, childObservationsForJob, protectCandidateWrite, resolveSiblingCandidates } from "@/lib/history/expansionFeedback";
import {
  AUTONOMOUS_DEMAND_QUALITY,
  ESTIMATED_FETCHES_PER_JOB,
  circuitBreakerReason,
  runDayKey,
  type BreakerSignals,
  type ExpansionEvent,
  type ExpansionPolicy,
} from "@/lib/history/expansionPolicy";
import { graphHealth, sourceFamilyDistribution } from "@/lib/history/expansionGraphValue";
import { rankCandidates, selectDailyBatch, type RankedCandidate } from "@/lib/history/expansionRank";
import { aliasLookupEqual } from "@/lib/history/identity";
import { blankJob, type KnownArtist } from "@/lib/history/researchAdvance";
import { acceptedCandidateSourceUrl, jobIsOpen, workflowOwned, type CandidateSourceHint, type ResearchJobRecord } from "@/lib/history/researchJob";
import { rosterStreamName, TRUSTED_ARTIST_ROSTERS } from "@/lib/history/artistRosters";
import { harvestExhibitionArchive, type ArchiveRunNote } from "@/lib/history/exhibitionArchive";

/**
 * Daily bounded scheduler for exhibition-first graph expansion.
 *
 * One run selects at most dailyResearchLimit research actions. The unit is
 * an investigation, not a new artist. The scheduler collects candidates,
 * ranks them for verified bridge value, creates or reuses ResearchJobs,
 * starts durable Workflows, records the run, and returns. A scheduled run
 * may also read a small trusted exhibition-archive window. That read only
 * queues explicit participants. Publication stays on the research gates.
 * Visitor Discovery uses the same research engine.
 */

export type ExpansionMode = "DRY_RUN" | "SCHEDULED" | "MANUAL";

export type ExpansionDeps = {
  now: () => Date;
  loadGraph: () => Promise<ExpansionGraph>;
  /** REAL_VISITOR post-separation missing searches only. */
  loadDemand: () => Promise<{ query: string; count: number; lastSearched: string | null }[]>;
  loadCandidates: () => Promise<CandidateRecord[]>;
  saveCandidates: (rows: CandidateRecord[]) => Promise<void>;
  /** Artist slug → ArtistEntity id, for RESOLVED_EXISTING rows. */
  artistIds: () => Promise<Map<string, string>>;
  /** Optional trusted roster index fetch. One request per roster per run. */
  fetchRoster?: (url: string) => Promise<string | null>;
  /** Optional exhibition-archive fetch. Used only by a scheduled run, and only after the kill switch. */
  fetchArchive?: (url: string) => Promise<{ html: string | null; requests: number }>;
  seenArchiveUrls?: () => Promise<string[]>;
  jobsStartedToday: (dayKey: string) => Promise<number>;
  openVisitorJobs: () => Promise<number>;
  listJobsForQuery: (normalizedQuery: string) => Promise<ResearchJobRecord[]>;
  readJob: (id: string) => Promise<ResearchJobRecord | null>;
  findKnown: (label: string) => Promise<KnownArtist | null>;
  insertJob: (job: ResearchJobRecord) => Promise<ResearchJobRecord>;
  /** Claims the job and starts the durable workflow. Returns null when another owner already claimed it. */
  startWorkflow: (jobId: string) => Promise<string | null>;
  breakerSignals: () => Promise<BreakerSignals>;
  recordRun: (run: ExpansionRunRecord) => Promise<void>;
  emit: (event: ExpansionEvent, path: string | null) => Promise<void>;
};

export type SelectedCandidateView = {
  rank: number;
  candidateId: string;
  displayName: string;
  normalizedName: string;
  kind: RankedCandidate["kind"];
  sourceType: string;
  sourceInstitution: string | null;
  sourceFamily: string | null;
  score: number;
  reasons: string[];
  expectedSourceFamilies: string[];
  demandCount: number;
  researchReason: string;
  potentialPaths: number;
  connectsComponents: boolean;
  existingArtistLinks: number;
  action: "STARTED" | "REUSED_OPEN_JOB" | "RESOLVED_EXISTING" | "APPLIED_FINISHED_JOB" | "DRY_RUN" | "START_FAILED" | "SKIPPED_BUDGET";
  jobId: string | null;
};

export type ExpansionRunRecord = {
  id: string;
  runKey: string;
  mode: ExpansionMode;
  status: "COMPLETED" | "DISABLED" | "PAUSED" | "FAILED";
  startedAt: string;
  completedAt: string | null;
  candidatesObserved: number;
  candidatesInserted: number;
  candidatesUpdated: number;
  jobsStarted: number;
  jobsReused: number;
  estimatedFetches: number;
  failureCount: number;
  summary: {
    pausedReason: string | null;
    researchLimit: number;
    limitApplied: number;
    jobsStartedBefore: number;
    openVisitorJobs: number;
    reconciled: number;
    childCandidates: number;
    ranking: SelectedCandidateView[];
    selected: SelectedCandidateView[];
    skippedDuplicateIdentity: string[];
    streams: Record<string, number>;
    errors: string[];
    dailyUnit: "RESEARCH_ACTION";
    graphBefore: ReturnType<typeof graphHealth> | null;
    sourceFamilies: { family: string; investigations: number }[];
    archive: ArchiveRunNote | null;
  };
};

export type ExpansionRunResult = ExpansionRunRecord;

function view(row: RankedCandidate, action: SelectedCandidateView["action"], jobId: string | null): SelectedCandidateView {
  return {
    rank: row.rank,
    candidateId: row.candidate.id,
    displayName: row.candidate.displayName,
    normalizedName: row.candidate.normalizedName,
    kind: row.kind,
    sourceType: row.candidate.sourceType,
    sourceInstitution: row.candidate.payload.provenance.find((item) => item.viaInstitution)?.viaInstitution ?? null,
    sourceFamily: row.candidate.sourceHost,
    score: row.score,
    reasons: row.reasons,
    expectedSourceFamilies: row.expectedSourceFamilies,
    demandCount: row.candidate.demandCount,
    researchReason: row.researchReason,
    potentialPaths: row.bridge.potentialPaths,
    connectsComponents: row.bridge.connectsComponents,
    existingArtistLinks: row.bridge.existingArtistLinks,
    action,
    jobId,
  };
}

function localeFor(label: string): "ko" | "en" {
  return /[가-힣]/.test(label) ? "ko" : "en";
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Trusted profile and exhibition URLs already stored on the candidate. Untrusted URLs are dropped. */
export function candidateSourceHints(candidate: CandidateRecord): CandidateSourceHint[] {
  const seen = new Set<string>();
  const out: CandidateSourceHint[] = [];
  const add = (url: string | null | undefined, hint: Omit<CandidateSourceHint, "url" | "host"> & { host?: string | null }) => {
    const text = url?.trim();
    if (!text || !acceptedCandidateSourceUrl(text) || seen.has(text)) return;
    seen.add(text);
    out.push({ ...hint, url: text, host: hint.host ?? hostOf(text) });
  };
  const provenance = candidate.payload.provenance[0];
  add(candidate.sourceUrl, {
    name: provenance?.viaInstitution ?? null,
    sourceType: candidate.sourceType,
    institution: provenance?.viaInstitution ?? null,
    sourceFamily: candidate.sourceHost,
    rosterIndexUrl: provenance?.rosterIndexUrl ?? null,
    profileUrl: candidate.sourceUrl,
    qualifier: provenance?.rosterQualifier ?? null,
  });
  for (const item of candidate.payload.provenance) {
    add(item.sourceUrl, {
      name: item.viaInstitution ?? null,
      sourceType: item.sourceType,
      institution: item.viaInstitution ?? null,
      sourceFamily: hostOf(item.sourceUrl ?? ""),
      rosterIndexUrl: item.rosterIndexUrl ?? null,
      profileUrl: item.sourceUrl,
      qualifier: item.rosterQualifier ?? null,
    });
  }
  for (const url of candidate.payload.sourceHints) {
    add(url, {
      name: provenance?.viaInstitution ?? null,
      sourceType: candidate.sourceType,
      institution: provenance?.viaInstitution ?? null,
      sourceFamily: hostOf(url),
      rosterIndexUrl: provenance?.rosterIndexUrl ?? null,
      profileUrl: url,
      qualifier: provenance?.rosterQualifier ?? null,
    });
  }
  return out;
}

export function autonomousJob(candidate: CandidateRecord, now: Date): ResearchJobRecord | null {
  const query = candidate.displayName;
  const normalized = normalizeCandidateName(query);
  if (!normalized) return null;
  const job = blankJob({
    id: randomUUID(),
    query,
    normalizedQuery: normalized,
    locale: localeFor(query),
    demandQuality: AUTONOMOUS_DEMAND_QUALITY,
    expand: candidate.sourceType === "SPARSE_EXISTING_ARTIST",
    now,
  });
  const candidateSources = candidateSourceHints(candidate);
  return {
    ...job,
    payload: {
      ...job.payload,
      origin: "DAILY_EXPANSION",
      candidateId: candidate.id,
      ...(candidateSources.length > 0 ? { candidateSources } : {}),
    },
  };
}

function blankRun(mode: ExpansionMode, now: Date, policy: ExpansionPolicy): ExpansionRunRecord {
  const day = runDayKey(now);
  return {
    id: randomUUID(),
    runKey: mode === "SCHEDULED" ? day : `${day}#${mode.toLowerCase()}-${now.getTime()}`,
    mode,
    status: "COMPLETED",
    startedAt: now.toISOString(),
    completedAt: null,
    candidatesObserved: 0,
    candidatesInserted: 0,
    candidatesUpdated: 0,
    jobsStarted: 0,
    jobsReused: 0,
    estimatedFetches: 0,
    failureCount: 0,
    summary: {
      pausedReason: null,
      researchLimit: policy.dailyResearchLimit,
      limitApplied: 0,
      jobsStartedBefore: 0,
      openVisitorJobs: 0,
      reconciled: 0,
      childCandidates: 0,
      ranking: [],
      selected: [],
      skippedDuplicateIdentity: [],
      streams: {},
      errors: [],
      dailyUnit: "RESEARCH_ACTION",
      graphBefore: null,
      sourceFamilies: [],
      archive: null,
    },
  };
}

/**
 * Candidates marked RESEARCHING whose job already finished: apply the
 * outcome now. This also covers a feedback hook that failed earlier, so a
 * rerun with unchanged data updates candidate state and starts nothing new.
 */
async function reconcile(rows: CandidateRecord[], graph: ExpansionGraph, deps: ExpansionDeps, policy: ExpansionPolicy, now: Date): Promise<{ rows: CandidateRecord[]; children: CandidateObservation[]; reconciled: number }> {
  let current = [...rows];
  const children: CandidateObservation[] = [];
  let reconciled = 0;
  const existingSlugs = graph.artists.map((artist) => artist.slug);
  for (const row of rows) {
    if (row.status !== "RESEARCHING" || !row.researchJobId) continue;
    const job = await deps.readJob(row.researchJobId);
    if (!job) continue;
    const next = candidateAfterJob(row, job, now);
    if (next.status === row.status && job.stage !== "DONE") continue;
    reconciled += 1;
    current = current.map((item) => (item.id === row.id ? next : item));
    current = resolveSiblingCandidates(current, job, row.id, now);
    if (job.stage === "DONE") children.push(...childObservationsForJob(job, existingSlugs, policy.maxChildCandidates, now));
  }
  return { rows: current, children, reconciled };
}

export async function runExpansion(input: { mode: ExpansionMode; limit?: number; policy: ExpansionPolicy; onlyLabels?: readonly string[] }, deps: ExpansionDeps): Promise<ExpansionRunResult> {
  const now = deps.now();
  const run = blankRun(input.mode, now, input.policy);
  const finish = async (status: ExpansionRunRecord["status"]) => {
    run.status = status;
    run.completedAt = deps.now().toISOString();
    if (input.mode !== "DRY_RUN") await deps.recordRun(run);
    return run;
  };

  if (input.mode === "SCHEDULED" && !input.policy.enabled) {
    run.summary.pausedReason = "ROB_EXPANSION_ENABLED=false";
    return finish("DISABLED");
  }

  if (input.mode !== "DRY_RUN") {
    const signals = await deps.breakerSignals();
    const reason = circuitBreakerReason(signals);
    if (reason) {
      run.summary.pausedReason = reason;
      await deps.emit("EXPANSION_PAUSED", reason);
      return finish("PAUSED");
    }
    await deps.emit("EXPANSION_DAILY_STARTED", run.runKey);
  }

  const stamp = now.toISOString();
  const [graph, demand, stored, artistIds] = await Promise.all([deps.loadGraph(), deps.loadDemand(), deps.loadCandidates(), deps.artistIds()]);

  const reconciledState = await reconcile(stored, graph, deps, input.policy, now);
  run.summary.reconciled = reconciledState.reconciled;

  let archiveObservations: CandidateObservation[] = [];
  if (input.mode === "SCHEDULED" && deps.fetchArchive) {
    try {
      const remembered = deps.seenArchiveUrls ? await deps.seenArchiveUrls() : [];
      const candidateUrls = stored.flatMap((row) => [row.sourceUrl, ...row.payload.sourceHints, ...row.payload.provenance.map((item) => item.sourceUrl)]);
      const harvest = await harvestExhibitionArchive({
        graph,
        knownUrls: [...remembered, ...candidateUrls.filter((url): url is string => Boolean(url))],
        seenAt: stamp,
        limit: input.policy.maxChildCandidates,
        fetchDocument: deps.fetchArchive,
      });
      archiveObservations = harvest.observations;
      run.summary.archive = harvest.note;
      run.estimatedFetches += harvest.requests;
      run.summary.errors.push(...harvest.errors);
    } catch (error) {
      run.summary.errors.push(`archive: ${error instanceof Error ? error.message : "fetch failed"}`);
    }
  }

  const observations: CandidateObservation[] = [];
  const streams: Record<string, number> = {};
  const push = (name: string, rows: CandidateObservation[]) => {
    streams[name] = rows.length;
    observations.push(...rows);
  };
  push("REAL_VISITOR_DEMAND", demandObservations(demand, graph, stamp));
  push("UNRESOLVED_PARTICIPANT", unresolvedObservations(graph, stamp));
  push("SPARSE_EXISTING_ARTIST", sparseArtistObservations(graph, demand, stamp));
  push("GROUP_ROSTER", reconciledState.children);
  push("TRUSTED_EXHIBITION_ARCHIVE", archiveObservations);
  if (deps.fetchRoster) {
    for (const roster of TRUSTED_ARTIST_ROSTERS) {
      if (!roster.enabled) continue;
      try {
        const html = await deps.fetchRoster(roster.indexUrl);
        if (!html) {
          run.summary.errors.push(`roster ${roster.sourceName}: SOURCE_UNAVAILABLE`);
          continue;
        }
        push(rosterStreamName(roster.adapter), galleryRosterObservations({ html, indexUrl: roster.indexUrl, sourceName: roster.sourceName, graph, seenAt: stamp }));
      } catch (error) {
        run.summary.errors.push(`roster ${roster.sourceName}: ${error instanceof Error ? error.message : "fetch failed"}`);
      }
    }
  }
  run.summary.streams = streams;
  run.summary.childCandidates = reconciledState.children.length;

  const merged = mergeObservations({
    existing: reconciledState.rows,
    observations,
    now: stamp,
    observationLimit: input.policy.dailyCandidateLimit,
    writeLimit: input.policy.dailyCandidateWriteLimit,
  });
  run.candidatesObserved = merged.observed;
  run.candidatesInserted = merged.inserted;
  run.candidatesUpdated = merged.updated;

  const resolved = resolveAgainstGraph(merged.rows, graph, artistIds, stamp);
  const ranked = rankCandidates({ candidates: resolved, graph, now });
  // Names found on a roster during this run wait for a later day. They are stored, not researched now.
  const storedKeys = new Set(stored.map((row) => row.normalizedName));
  const freshChildKeys = new Set(
    reconciledState.children.map((child) => normalizeCandidateName(child.label)).filter((key): key is string => Boolean(key)),
  );
  const freshArchiveKeys = new Set(
    archiveObservations.map((row) => normalizeCandidateName(row.label)).filter((key): key is string => Boolean(key)),
  );
  const requestedLabels = input.mode === "SCHEDULED" ? [] : (input.onlyLabels ?? []).map((label) => label.trim()).filter(Boolean);
  const eligible = ranked.filter((row) => {
    const key = row.candidate.normalizedName;
    const queuedForLater = (freshChildKeys.has(key) || freshArchiveKeys.has(key)) && !storedKeys.has(key);
    return !queuedForLater;
  });
  const selectable = requestedLabels.length === 0
    ? eligible
    : eligible.filter((row) => requestedLabels.some((label) => aliasLookupEqual(label, row.candidate.displayName)));

  const [startedBefore, openVisitor] = await Promise.all([deps.jobsStartedToday(runDayKey(now)), deps.openVisitorJobs()]);
  run.summary.jobsStartedBefore = startedBefore;
  run.summary.openVisitorJobs = openVisitor;
  const requested = input.limit != null && Number.isFinite(input.limit) ? Math.max(0, Math.trunc(input.limit)) : input.policy.dailyResearchLimit;
  // Visitor research keeps priority. Earlier starts today consume the daily cap, not the size of this request.
  // An archive pass is one research action and its HTTP requests count against the same fetch budget.
  const dailyRoom = Math.max(0, input.policy.dailyResearchLimit - startedBefore - openVisitor);
  const archiveRequests = run.summary.archive?.requests ?? 0;
  const archiveSlot = archiveRequests > 0 ? 1 : 0;
  const remaining = Math.max(0, Math.min(requested, dailyRoom) - archiveSlot);
  const fetchRemaining = Math.max(0, input.policy.dailyFetchLimit - startedBefore * ESTIMATED_FETCHES_PER_JOB - archiveRequests);
  const batch = selectDailyBatch({ ranked: selectable, researchLimit: remaining, sparseShare: input.policy.sparseShare, fetchLimit: fetchRemaining });
  run.summary.limitApplied = batch.limit;
  run.summary.graphBefore = graphHealth(graph);
  run.summary.dailyUnit = "RESEARCH_ACTION";
  run.summary.sourceFamilies = sourceFamilyDistribution(batch.selected.map((row) => ({
    sourceFamily: row.candidate.sourceHost,
    sourceType: row.candidate.sourceType,
  })));
  run.summary.ranking = ranked.slice(0, 30).map((row) => view(row, "DRY_RUN", null));
  run.summary.skippedDuplicateIdentity = batch.skippedDuplicateIdentity.map((row) => row.candidate.displayName);

  let rows = resolved;
  const selectedViews: SelectedCandidateView[] = [];

  if (input.mode === "DRY_RUN") {
    run.summary.selected = batch.selected.map((row) => view(row, "DRY_RUN", null));
    run.estimatedFetches = batch.selected.length * ESTIMATED_FETCHES_PER_JOB;
    return finish("COMPLETED");
  }

  const replace = (next: CandidateRecord) => {
    rows = rows.map((item) => (item.id === next.id ? next : item));
  };

  for (const row of batch.selected) {
    const candidate = rows.find((item) => item.id === row.candidate.id) ?? row.candidate;
    if (candidate.status === "RESOLVED_EXISTING" || candidate.status === "RESEARCHING") {
      selectedViews.push(view(row, candidate.status === "RESEARCHING" ? "REUSED_OPEN_JOB" : "RESOLVED_EXISTING", candidate.researchJobId));
      continue;
    }
    await deps.emit("EXPANSION_CANDIDATE_SELECTED", candidate.id);
    try {
      if (candidate.sourceType !== "SPARSE_EXISTING_ARTIST") {
        const known = await deps.findKnown(candidate.displayName);
        if (known) {
          replace({
            ...candidate,
            status: "RESOLVED_EXISTING",
            resolvedArtistId: known.id,
            payload: { ...candidate.payload, existingArtistSlug: known.slug, reasons: [`existing artist ${known.slug} matched before research`] },
            updatedAt: deps.now().toISOString(),
          });
          selectedViews.push(view(row, "RESOLVED_EXISTING", null));
          continue;
        }
      }
      const normalized = normalizeCandidateName(candidate.displayName);
      const existingJobs = normalized ? await deps.listJobsForQuery(normalized) : [];
      const open = existingJobs.find((job) => jobIsOpen(job));
      if (open) {
        if (!workflowOwned(open.payload.workflowRunId)) await deps.startWorkflow(open.id);
        replace(candidateAfterJob({ ...candidate, researchJobId: open.id }, open, deps.now()));
        run.jobsReused += 1;
        selectedViews.push(view(row, "REUSED_OPEN_JOB", open.id));
        continue;
      }
      const finished = existingJobs
        .filter((job) => job.stage === "DONE" && job.id !== candidate.researchJobId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
      if (finished && finished.failureCode == null && finished.verifiedFactCount > 0 && candidate.sourceType !== "SPARSE_EXISTING_ARTIST") {
        replace(candidateAfterJob(candidate, finished, deps.now()));
        rows = resolveSiblingCandidates(rows, finished, candidate.id, deps.now());
        selectedViews.push(view(row, "APPLIED_FINISHED_JOB", finished.id));
        continue;
      }
      const job = autonomousJob(candidate, deps.now());
      if (!job) {
        selectedViews.push(view(row, "SKIPPED_BUDGET", null));
        continue;
      }
      const inserted = await deps.insertJob(job);
      const researching = candidateAfterJob({ ...candidate, researchJobId: inserted.id }, inserted, deps.now());
      const owned = {
        ...researching,
        priorityScore: row.score,
        bridgePotentialScore: row.bridge.potentialPaths,
        payload: { ...researching.payload, reasons: row.reasons },
      };
      replace(owned);
      // Ownership is durable before the workflow can finish and write a terminal state.
      await deps.saveCandidates([owned]);
      const runId = await deps.startWorkflow(inserted.id);
      if (runId === null) {
        // Someone else owns this job (a visitor request landed first). The candidate follows that job.
        run.jobsReused += 1;
        selectedViews.push(view(row, "REUSED_OPEN_JOB", inserted.id));
        continue;
      }
      run.jobsStarted += 1;
      run.estimatedFetches += ESTIMATED_FETCHES_PER_JOB;
      await deps.emit("EXPANSION_RESEARCH_STARTED", inserted.id);
      selectedViews.push(view(row, "STARTED", inserted.id));
    } catch (error) {
      run.failureCount += 1;
      run.summary.errors.push(`${candidate.displayName}: ${error instanceof Error ? error.message : "start failed"}`);
      selectedViews.push(view(row, "START_FAILED", null));
    }
  }

  // Candidates that ranked but did not fit this run stay eligible for a future day and keep their reasons.
  for (const row of ranked) {
    if (batch.selected.includes(row)) continue;
    const candidate = rows.find((item) => item.id === row.candidate.id);
    if (!candidate) continue;
    const status = candidate.status === "NEW" ? "QUEUED" : candidate.status;
    const sameReasons = candidate.payload.reasons.join("|") === row.reasons.join("|");
    if (status === candidate.status && candidate.priorityScore === row.score && candidate.bridgePotentialScore === row.bridge.potentialPaths && sameReasons) continue;
    replace({
      ...candidate,
      status,
      priorityScore: row.score,
      bridgePotentialScore: row.bridge.potentialPaths,
      payload: { ...candidate.payload, reasons: row.reasons },
      updatedAt: stamp,
    });
  }

  run.summary.selected = selectedViews;
  const latest = await deps.loadCandidates();
  const latestByName = new Map(latest.map((row) => [row.normalizedName, row]));
  const toWrite = changedCandidates(stored, rows).flatMap((incoming) => {
    const current = latestByName.get(incoming.normalizedName) ?? null;
    const guarded = protectCandidateWrite(current, incoming);
    if (current && guarded === current) return [];
    return [guarded];
  });
  if (toWrite.length > 0) await deps.saveCandidates(toWrite);
  await deps.emit("EXPANSION_DAILY_COMPLETED", run.runKey);
  return finish(run.failureCount > 0 && run.jobsStarted === 0 && batch.selected.length > 0 ? "FAILED" : "COMPLETED");
}
