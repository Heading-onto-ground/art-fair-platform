import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyIdentityResolution,
  classifyCandidateLabel,
  demandObservations,
  isExpansionFixtureLabel,
  mergeObservations,
  museumRosterObservations,
  normalizeCandidateName,
  rosterObservations,
  sameCandidateIdentity,
  sparseArtistObservations,
  unresolvedObservations,
  type CandidateObservation,
  type CandidateRecord,
  type ExpansionGraph,
} from "@/lib/history/expansionCandidates";
import { candidateAfterJob, childObservationsForJob, resolveSiblingCandidates } from "@/lib/history/expansionFeedback";
import {
  AUTONOMOUS_DEMAND_QUALITY,
  CIRCUIT_BREAKER,
  COOLDOWN_DAYS,
  EXPANSION_DEFAULTS,
  blankCanonicalNameCount,
  circuitBreakerReason,
  resolvedIdentityCollisionCount,
  sameNameReviewCount,
  cooldownDays,
  expansionPolicyFrom,
  isVisitorOnlyEvent,
  nextEligibleAfter,
} from "@/lib/history/expansionPolicy";
import { eligibleForResearch, rankCandidates, selectDailyBatch } from "@/lib/history/expansionRank";
import { runExpansion, type ExpansionDeps, type ExpansionRunRecord } from "@/lib/history/expansionScheduler";
import { aliasLookupEqual } from "@/lib/history/identity";
import { blankJob } from "@/lib/history/researchAdvance";
import { isAutonomousJob, publishableAliasLabels, signalsToRecord, type ResearchJobRecord } from "@/lib/history/researchJob";
import { officialCandidateReview, reviewAllowsCrawl } from "@/lib/history/officialCandidateReview";
import { mayAutoTrustHost, reviewDiscoveredHost } from "@/lib/history/sourceDiscovery";
import type { CrawlFact } from "@/lib/history/trustedCrawl";

const now = new Date("2026-11-06T16:45:00.000Z");
const stamp = now.toISOString();

function graph(density: "sparse" | "rich" = "sparse"): ExpansionGraph {
  const exhibitionIds = (slug: string) =>
    density === "rich" ? Array.from({ length: 12 }, (_, index) => `${slug}-${index}`) : [slug === "lee-ufan" ? "ex-lee" : "ex-park"];
  return {
    artists: [
      { slug: "lee-ufan", labels: ["Lee Ufan", "이우환"], exhibitionIds: exhibitionIds("lee-ufan") },
      { slug: "park-seo-bo", labels: ["Park Seo-Bo", "박서보"], exhibitionIds: exhibitionIds("park-seo-bo") },
    ],
    exhibitions: [
      { id: "ex-lee", title: "From Point", year: 1976, space: "Tokyo Gallery", artistSlugs: ["lee-ufan"] },
      { id: "ex-park", title: "Ecriture", year: 1973, space: "Muramatsu", artistSlugs: ["park-seo-bo"] },
    ],
    unresolved: [],
  };
}

function observation(label: string, overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    label,
    sourceType: "REAL_VISITOR_DEMAND",
    sourceContext: "USER_SEARCH",
    sourceUrl: null,
    seenAt: stamp,
    demandCount: 1,
    ...overrides,
  };
}

function policy(overrides: Partial<ReturnType<typeof expansionPolicyFrom>> = {}) {
  return { ...expansionPolicyFrom({}), ...overrides, enabled: overrides.enabled ?? true };
}

function memory(input?: { demand?: { query: string; count: number; lastSearched: string | null }[]; graph?: ExpansionGraph; openVisitorJobs?: number }) {
  let candidates: CandidateRecord[] = [];
  const jobs: ResearchJobRecord[] = [];
  const started: string[] = [];
  const events: string[] = [];
  const runs: ExpansionRunRecord[] = [];
  const currentGraph = input?.graph ?? graph("rich");
  const deps: ExpansionDeps = {
    now: () => now,
    loadGraph: async () => currentGraph,
    loadDemand: async () => input?.demand ?? [],
    loadCandidates: async () => candidates,
    saveCandidates: async (rows) => {
      for (const row of rows) {
        const index = candidates.findIndex((item) => item.normalizedName === row.normalizedName);
        if (index >= 0) candidates[index] = row;
        else candidates.push(row);
      }
    },
    artistIds: async () => new Map(currentGraph.artists.map((artist) => [artist.slug, `id-${artist.slug}`])),
    jobsStartedToday: async () => jobs.filter((job) => job.demandQuality === AUTONOMOUS_DEMAND_QUALITY).length,
    openVisitorJobs: async () => input?.openVisitorJobs ?? 0,
    listJobsForQuery: async (query) => jobs.filter((job) => job.normalizedQuery === query),
    readJob: async (id) => jobs.find((job) => job.id === id) ?? null,
    findKnown: async (label) => {
      const artist = currentGraph.artists.find((item) => item.labels.some((name) => aliasLookupEqual(name, label)));
      if (!artist) return null;
      return {
        id: `id-${artist.slug}`,
        slug: artist.slug,
        canonicalName: artist.labels[0] ?? artist.slug,
        nativeName: artist.labels.find((name) => /[가-힣]/.test(name)) ?? null,
        exhibitionCount: artist.exhibitionIds.length,
      };
    },
    insertJob: async (job) => {
      jobs.push(job);
      return job;
    },
    startWorkflow: async (id) => {
      started.push(id);
      return `wf-${id}`;
    },
    breakerSignals: async () => ({ consecutiveFailedRuns: 0, startFailureShare: 0, publicationsLastRun: 0, duplicateResolvedIdentities: 0, databaseUnavailable: false }),
    recordRun: async (run) => {
      runs.push({ ...run, summary: { ...run.summary, selected: [...run.summary.selected], ranking: [...run.summary.ranking] } });
    },
    emit: async (event) => {
      events.push(event);
    },
  };
  return {
    deps,
    jobs,
    started,
    events,
    runs,
    candidates: () => candidates,
    setCandidates: (rows: CandidateRecord[]) => {
      candidates = rows;
    },
  };
}

function names(count: number, prefix: string): { query: string; count: number; lastSearched: string | null }[] {
  return Array.from({ length: count }, (_, index) => ({
    query: `${prefix} ${index + 1}`,
    count: 1,
    lastSearched: stamp,
  }));
}

describe("global artist expansion", () => {
  it("normalizes spellings into one candidate and keeps provenance", () => {
    const merged = mergeObservations({
      existing: [],
      observations: [
        observation("KAWS", { demandCount: 4, sourceUrl: "https://www.kukjegallery.com/artists/view?seq=1" }),
        observation("kaws", { demandCount: 2 }),
        observation("카우스", { demandCount: 3 }),
      ],
      now: stamp,
      observationLimit: 100,
      writeLimit: 50,
    });
    expect(normalizeCandidateName("KAWS")).toBe(normalizeCandidateName("kaws"));
    expect(merged.inserted).toBe(2);
    const kaws = merged.rows.find((row) => row.displayName.toLowerCase() === "kaws");
    expect(kaws?.demandCount).toBe(4);
    expect(kaws?.payload.provenance).toHaveLength(2);
    expect(kaws?.payload.labels).not.toContain("카우스");
    expect(merged.rows.find((row) => row.normalizedName === "카우스")?.nativeNameCandidate).toBe("카우스");
  });

  it("does not treat a search spelling as a verified alias", () => {
    const job = blankJob({ id: "job-1", query: "카우스", normalizedQuery: "카우스", locale: "ko", demandQuality: AUTONOMOUS_DEMAND_QUALITY, expand: false, now });
    job.payload.identity = {
      id: "Q123",
      label: "KAWS",
      description: "artist",
      aliases: ["KAWS"],
      instanceOf: ["Q5"],
      occupations: ["Q1028181"],
      officialWebsites: [],
      collectionIds: [],
    };
    job.payload.latinName = "KAWS";
    job.payload.nativeName = null;
    job.payload.labels = ["카우스", "KAWS"];
    expect(publishableAliasLabels(job)).not.toContain("카우스");
    job.payload.identity.aliases = ["KAWS", "카우스"];
    job.payload.nativeName = "카우스";
    expect(publishableAliasLabels(job)).toContain("카우스");
  });

  it("ranks real visitor demand above an isolated name and skips fame signals", () => {
    const merged = mergeObservations({
      existing: [],
      observations: [
        observation("KAWS", { demandCount: 12, sourceHints: ["https://www.tate.org.uk/art/artists/kaws"], sharedExistingArtists: ["lee-ufan"] }),
        observation("Quiet Painter", { demandCount: 0, sourceType: "IDENTITY_DISCOVERY", sourceContext: "DAILY_EXPANSION" }),
      ],
      now: stamp,
      observationLimit: 10,
      writeLimit: 10,
    });
    const ranked = rankCandidates({ candidates: merged.rows, graph: graph(), now });
    expect(ranked[0]?.candidate.displayName).toBe("KAWS");
    expect(ranked[0]?.reasons.join(" ")).toMatch(/visitor missing-search demand 12/);
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });

  it("keeps an existing artist out of a second research pipeline", async () => {
    const base = graph("rich");
    const demand = [{ query: "Lee Ufan", count: 9, lastSearched: stamp }, { query: "이우환", count: 2, lastSearched: stamp }];
    base.unresolved.push({ label: "Lee Ufan", exhibitionId: "ex-park", exhibitionTitle: "Ecriture", artistSlugs: ["park-seo-bo"], sourceUrl: null });
    const harness = memory({ graph: base, demand });
    const run = await runExpansion({ mode: "MANUAL", policy: policy({ sparseShare: 0 }) }, harness.deps);
    expect(run.jobsStarted).toBe(1);
    expect(harness.jobs).toHaveLength(1);
    expect(harness.jobs[0]?.payload.expand).toBe(true);
    expect(harness.candidates().filter((row) => row.payload.existingArtistSlug === "lee-ufan")).toHaveLength(1);
    expect(demandObservations(demand, base, stamp)).toEqual([]);
    expect(unresolvedObservations(base, stamp).map((row) => row.label)).not.toContain("Lee Ufan");
  });

  it("links one identity that arrives under two labels to one research owner", () => {
    const merged = mergeObservations({
      existing: [],
      observations: [observation("KAWS", { demandCount: 2 }), observation("Brian Donnelly", { demandCount: 1 })],
      now: stamp,
      observationLimit: 10,
      writeLimit: 10,
    });
    const kaws = merged.rows.find((row) => row.displayName === "KAWS");
    const brian = merged.rows.find((row) => row.displayName === "Brian Donnelly");
    expect(kaws && brian).toBeTruthy();
    if (!kaws || !brian) return;
    kaws.payload.labels = ["KAWS", "Brian Donnelly"];
    expect(sameCandidateIdentity(kaws, brian)).toBe(true);
    const ranked = rankCandidates({ candidates: [kaws, brian], graph: graph(), now });
    const batch = selectDailyBatch({ ranked, researchLimit: 10, sparseShare: 0, fetchLimit: 120 });
    expect(batch.selected).toHaveLength(1);
    expect(batch.skippedDuplicateIdentity).toHaveLength(1);
    const job = blankJob({ id: "job-kaws", query: "KAWS", normalizedQuery: "kaws", locale: "en", demandQuality: AUTONOMOUS_DEMAND_QUALITY, expand: false, now });
    job.payload.labels = ["KAWS", "Brian Donnelly"];
    job.payload.latinName = "KAWS";
    job.resolvedArtistId = "artist-kaws";
    job.identityStatus = "RESOLVED";
    const siblings = resolveSiblingCandidates([kaws, brian], job, kaws.id, now);
    expect(siblings.find((row) => row.id === brian.id)?.status).toBe("RESOLVED_EXISTING");
    expect(siblings.find((row) => row.id === brian.id)?.researchJobId).toBe(job.id);
  });

  it("turns unknown group-roster names into candidates and does not research them in the same run", async () => {
    const fact = {
      pilotRecordId: "ex-group",
      title: "Group",
      provenance: { sourceUrl: "https://www.kukjegallery.com/exhibitions/group", sourceName: "Kukje Gallery" },
      participants: [
        { label: "Park Seo-Bo", evidence: "EXPLICIT_PARTICIPANT", identity: "EXACT", slug: "park-seo-bo" },
        { label: "Mina Cho", evidence: "EXPLICIT_PARTICIPANT", identity: "UNRESOLVED", slug: null },
        { label: "Some Critic", evidence: "NOT_PARTICIPANT", identity: "UNRESOLVED", slug: null },
      ],
    } as unknown as CrawlFact;
    const children = rosterObservations({ facts: [fact], viaArtistSlug: "park-seo-bo", existingSlugs: ["park-seo-bo"], seenAt: stamp, limit: 20 });
    expect(children.map((row) => row.label)).toEqual(["Mina Cho"]);
    const owner = mergeObservations({
      existing: [],
      observations: [observation("Roster Lead", { demandCount: 1 })],
      now: stamp,
      observationLimit: 5,
      writeLimit: 5,
    }).rows[0];
    expect(owner).toBeTruthy();
    if (!owner) return;
    const harness = memory({ demand: [] });
    const job = blankJob({ id: "job-roster", query: "Roster Lead", normalizedQuery: "roster lead", locale: "en", demandQuality: AUTONOMOUS_DEMAND_QUALITY, expand: false, now });
    job.stage = "DONE";
    job.status = "HISTORY_READY";
    job.verifiedFactCount = 1;
    job.resolvedArtistId = "id-park-seo-bo";
    job.resolvedArtistSlug = "park-seo-bo";
    job.completedAt = stamp;
    job.payload.publishedIds = ["ex-group"];
    job.payload.queued = [fact];
    job.payload.candidateId = owner.id;
    owner.status = "RESEARCHING";
    owner.researchJobId = job.id;
    harness.setCandidates([owner]);
    harness.jobs.push(job);
    const run = await runExpansion({ mode: "MANUAL", policy: policy({ dailyResearchLimit: 10 }) }, harness.deps);
    expect(run.jobsStarted).toBe(0);
    expect(harness.started).toEqual([]);
    expect(harness.candidates().some((row) => row.displayName === "Mina Cho" && row.status !== "PUBLISHED")).toBe(true);
    expect(harness.candidates().find((row) => row.displayName === "Mina Cho")?.status).not.toBe("RESEARCHING");
    expect(childObservationsForJob(job, ["park-seo-bo"], 20, now).map((row) => row.label)).toEqual(["Mina Cho"]);
  });

  it("holds organizations and blocked identities out of publication", () => {
    expect(classifyCandidateLabel("Kukje Gallery")).toBe("ORGANIZATION");
    expect(classifyCandidateLabel("Selected Exhibition 2019")).toBe("EXHIBITION_TITLE");
    const merged = mergeObservations({
      existing: [],
      observations: [observation("Kukje Gallery", { demandCount: 4 }), observation("Selected Exhibition 2019")],
      now: stamp,
      observationLimit: 10,
      writeLimit: 10,
    });
    expect(merged.rows.every((row) => row.status === "NOT_ARTIST")).toBe(true);
    expect(rankCandidates({ candidates: merged.rows, graph: graph(), now })).toEqual([]);
    const person = mergeObservations({
      existing: [],
      observations: [observation("Nara Kim")],
      now: stamp,
      observationLimit: 5,
      writeLimit: 5,
    }).rows[0];
    expect(person).toBeTruthy();
    if (!person) return;
    const ambiguous = blankJob({ id: "job-amb", query: "Nara Kim", normalizedQuery: "nara kim", locale: "en", demandQuality: AUTONOMOUS_DEMAND_QUALITY, expand: false, now });
    ambiguous.stage = "DONE";
    ambiguous.status = "NEEDS_REVIEW";
    ambiguous.failureCode = "IDENTITY_AMBIGUOUS";
    ambiguous.completedAt = stamp;
    const noSource = { ...ambiguous, id: "job-none", failureCode: "NO_TRUSTED_SOURCE", status: "NEEDS_REVIEW" as const };
    const blocked = { ...ambiguous, id: "job-block", failureCode: "SOURCE_BLOCKED", status: "SOURCE_BLOCKED" as const };
    const afterAmbiguous = candidateAfterJob(person, ambiguous, now);
    const afterNone = candidateAfterJob(person, noSource, now);
    const afterBlocked = candidateAfterJob(person, blocked, now);
    expect(afterAmbiguous.status).toBe("IDENTITY_AMBIGUOUS");
    expect(afterNone.status).toBe("NO_TRUSTED_SOURCE");
    expect(afterBlocked.status).toBe("BLOCKED");
    expect(cooldownDays("IDENTITY_AMBIGUOUS")).toBe(30);
    expect(cooldownDays("NOT_FOUND")).toBe(60);
    expect(cooldownDays("NO_TRUSTED_SOURCE")).toBe(30);
    expect(cooldownDays("SOURCE_BLOCKED")).toBe(7);
    expect(Date.parse(afterNone.nextEligibleAt ?? "") - now.getTime()).toBe(COOLDOWN_DAYS.NO_TRUSTED_SOURCE * 24 * 60 * 60 * 1000);
    expect(eligibleForResearch(afterBlocked, now)).toBe(false);
    expect(eligibleForResearch(afterBlocked, nextEligibleAfter("SOURCE_BLOCKED", now))).toBe(true);
    expect(afterAmbiguous.resolvedArtistId).toBeNull();
  });

  it("starts at most the daily research limit and leaves the rest queued", async () => {
    const harness = memory({ demand: names(25, "Painter") });
    const run = await runExpansion({ mode: "MANUAL", policy: policy({ dailyResearchLimit: 10, sparseShare: 0 }) }, harness.deps);
    expect(run.jobsStarted).toBe(10);
    expect(harness.started).toHaveLength(10);
    const queued = harness.candidates().filter((row) => row.status === "QUEUED");
    expect(queued.length).toBe(15);
    expect(harness.jobs.every((job) => job.demandQuality === AUTONOMOUS_DEMAND_QUALITY && job.payload.origin === "DAILY_EXPANSION")).toBe(true);
  });

  it("reserves sparse-artist slots without dropping the new-artist majority", async () => {
    const current = graph();
    current.artists.push(
      ...Array.from({ length: 10 }, (_, index) => ({
        slug: `sparse-${index + 1}`,
        labels: [`Sparse Painter ${index + 1}`],
        exhibitionIds: [`sparse-ex-${index + 1}`],
      })),
    );
    current.exhibitions.push(
      ...Array.from({ length: 10 }, (_, index) => ({
        id: `sparse-ex-${index + 1}`,
        title: `Sparse Show ${index + 1}`,
        year: 2001,
        space: null,
        artistSlugs: [`sparse-${index + 1}`],
      })),
    );
    const harness = memory({ graph: current, demand: names(20, "Incoming Painter") });
    const run = await runExpansion({ mode: "MANUAL", policy: policy({ dailyResearchLimit: 10, sparseShare: 0.3 }) }, harness.deps);
    const selected = run.summary.selected.filter((row) => row.action === "STARTED");
    expect(selected.filter((row) => row.kind === "NEW_IDENTITY")).toHaveLength(7);
    expect(selected.filter((row) => row.kind === "SPARSE_EXISTING")).toHaveLength(3);
    expect(sparseArtistObservations(graph("rich"), [], stamp).some((row) => row.existingArtistSlug === "lee-ufan")).toBe(false);
    expect(sparseArtistObservations(graph("sparse"), [], stamp).filter((row) => row.existingArtistSlug === "lee-ufan")).toHaveLength(1);
  });

  it("does not let the autonomous budget block a visitor request", async () => {
    const route = readFileSync(resolve("app/api/history/research/route.ts"), "utf8");
    expect(route).not.toMatch(/expansionPolicy|ROB_DAILY_RESEARCH_LIMIT|ROB_EXPANSION_ENABLED/);
    const harness = memory({ demand: names(12, "Waiting Painter"), openVisitorJobs: 4 });
    const run = await runExpansion({ mode: "MANUAL", policy: policy({ dailyResearchLimit: 10, sparseShare: 0 }) }, harness.deps);
    expect(run.jobsStarted).toBe(6);
    expect(run.summary.openVisitorJobs).toBe(4);
  });

  it("stops scheduled jobs when the kill switch or the circuit breaker is open", async () => {
    const harness = memory({ demand: names(3, "Paused Painter") });
    const disabled = await runExpansion({ mode: "SCHEDULED", policy: policy({ enabled: false }) }, harness.deps);
    expect(disabled.status).toBe("DISABLED");
    expect(harness.started).toEqual([]);
    harness.deps.breakerSignals = async () => ({ consecutiveFailedRuns: 0, startFailureShare: 0, publicationsLastRun: 0, duplicateResolvedIdentities: 1, databaseUnavailable: false });
    const paused = await runExpansion({ mode: "SCHEDULED", policy: policy({ enabled: true }) }, harness.deps);
    expect(paused.status).toBe("PAUSED");
    expect(paused.summary.pausedReason).toBe("DUPLICATE_RESOLVED_IDENTITY");
    expect(harness.started).toEqual([]);
    expect(circuitBreakerReason({ consecutiveFailedRuns: CIRCUIT_BREAKER.maxConsecutiveFailedRuns, startFailureShare: 0, publicationsLastRun: 0, duplicateResolvedIdentities: 0, databaseUnavailable: false })).toBe("REPEATED_RUN_FAILURE");
  });

  it("lets a manual batch name its artists and does not fill the rest from the queue", async () => {
    const harness = memory({ demand: names(3, "Queue Painter") });
    const run = await runExpansion({ mode: "MANUAL", policy: policy({ dailyResearchLimit: 10, sparseShare: 0 }), onlyLabels: ["Queue Painter 2"] }, harness.deps);
    expect(run.jobsStarted).toBe(1);
    expect(run.summary.selected.map((row) => row.displayName)).toEqual(["Queue Painter 2"]);
    const previewHarness = memory({ demand: names(3, "Queue Painter") });
    const preview = await runExpansion({ mode: "DRY_RUN", policy: policy({ dailyResearchLimit: 10, sparseShare: 0 }), onlyLabels: ["Queue Painter 2"] }, previewHarness.deps);
    expect(preview.summary.selected.map((row) => row.displayName)).toEqual(["Queue Painter 2"]);
    const scheduledHarness = memory({ demand: names(3, "Queue Painter") });
    const scheduled = await runExpansion({ mode: "SCHEDULED", policy: policy({ enabled: true, dailyResearchLimit: 10, sparseShare: 0 }), onlyLabels: ["Queue Painter 2"] }, scheduledHarness.deps);
    expect(scheduled.jobsStarted).toBe(3);
  });

  it("treats shared names as review warnings and only a split identity key as a collision", async () => {
    const closed = { consecutiveFailedRuns: 0, startFailureShare: 0, publicationsLastRun: 0, duplicateResolvedIdentities: 0, databaseUnavailable: false };
    expect(blankCanonicalNameCount(["", " ", "\t", "", ""])).toBe(5);
    expect(circuitBreakerReason(closed)).toBeNull();
    expect(sameNameReviewCount(["김도하", "김도하", "Lee Ufan"])).toBe(2);
    expect(circuitBreakerReason(closed)).toBeNull();
    expect(resolvedIdentityCollisionCount([
      { identityKey: "Q1", artistId: "artist-a" },
      { identityKey: "Q1", artistId: "artist-b" },
    ])).toBe(1);
    expect(circuitBreakerReason({ ...closed, duplicateResolvedIdentities: 1 })).toBe("DUPLICATE_RESOLVED_IDENTITY");
    expect(resolvedIdentityCollisionCount([
      { identityKey: "Q1", artistId: "artist-a" },
      { identityKey: "Q1", artistId: "artist-a" },
      { identityKey: "  ", artistId: "artist-b" },
      { identityKey: "Q2", artistId: null },
    ])).toBe(0);
    const harness = memory({ demand: names(1, "Real Demand Painter") });
    const run = await runExpansion({ mode: "SCHEDULED", policy: policy({ enabled: true, dailyResearchLimit: 10, sparseShare: 0 }) }, harness.deps);
    expect(run.status).toBe("COMPLETED");
    expect(run.summary.selected.map((row) => row.displayName)).toEqual(["Real Demand Painter 1"]);
    expect(run.summary.selected.some((row) => row.displayName.trim() === "" || row.displayName === "김도하")).toBe(false);
  });

  it("is idempotent when the same day runs again", async () => {
    const harness = memory({ demand: names(4, "Repeat Painter") });
    const first = await runExpansion({ mode: "SCHEDULED", policy: policy({ dailyResearchLimit: 10, sparseShare: 0 }) }, harness.deps);
    expect(first.jobsStarted).toBe(4);
    const startedOnce = [...harness.started];
    const second = await runExpansion({ mode: "SCHEDULED", policy: policy({ dailyResearchLimit: 10, sparseShare: 0 }) }, harness.deps);
    expect(second.jobsStarted).toBe(0);
    expect(harness.started).toEqual(startedOnce);
    expect(harness.jobs).toHaveLength(4);
    const finished = harness.jobs[0];
    expect(finished).toBeTruthy();
    if (!finished) return;
    finished.stage = "DONE";
    finished.status = "HISTORY_READY";
    finished.verifiedFactCount = 2;
    finished.resolvedArtistId = "id-new";
    finished.resolvedArtistSlug = "repeat-painter-1";
    finished.completedAt = stamp;
    harness.deps.jobsStartedToday = async () => 0;
    const third = await runExpansion({ mode: "MANUAL", policy: policy({ dailyResearchLimit: 10, sparseShare: 0 }) }, harness.deps);
    expect(third.jobsStarted).toBe(0);
    expect(harness.candidates().find((row) => row.researchJobId === finished.id)?.status).toBe("PUBLISHED");
    const owner = harness.candidates().find((row) => row.researchJobId === finished.id);
    expect(owner).toBeTruthy();
    if (!owner) return;
    const again = candidateAfterJob(owner, finished, now);
    expect(again.attemptCount).toBe(owner.attemptCount);
  });

  it("keeps autonomous analytics off the visitor funnel", () => {
    const job = blankJob({ id: "job-auto", query: "KAWS", normalizedQuery: "kaws", locale: "en", demandQuality: AUTONOMOUS_DEMAND_QUALITY, expand: false, now });
    job.payload.origin = "DAILY_EXPANSION";
    expect(isAutonomousJob(job)).toBe(true);
    expect(signalsToRecord(job, ["DISCOVERY_STARTED", "SEARCH_NO_RESULT", "DISCOVERY_COMPLETED"])).toEqual([]);
    expect(isVisitorOnlyEvent("SEARCH_NO_RESULT")).toBe(true);
    expect(isVisitorOnlyEvent("EXPANSION_ARTIST_PUBLISHED")).toBe(false);
    const visitor = blankJob({ id: "job-user", query: "KAWS", normalizedQuery: "kaws", locale: "en", demandQuality: "REAL_VISITOR", expand: false, now });
    expect(signalsToRecord(visitor, ["DISCOVERY_STARTED"])).toEqual(["DISCOVERY_STARTED"]);
  });

  it("drops fixture identities from every candidate stream", () => {
    const merged = mergeObservations({
      existing: [],
      observations: [
        observation("Ada Painter", { demandCount: 20 }),
        observation("Canary Painter 4", { demandCount: 9 }),
        observation("pending check name", { demandCount: 8 }),
        observation("zzzz no artist", { demandCount: 7 }),
        observation("KAWS", { demandCount: 3 }),
      ],
      now: stamp,
      observationLimit: 20,
      writeLimit: 20,
    });
    expect(merged.rows.map((row) => row.displayName)).toEqual(["KAWS"]);
    expect(isExpansionFixtureLabel("Ada Painter")).toBe(true);
    expect(demandObservations([{ query: "zzzz no artist", count: 4, lastSearched: stamp }], graph(), stamp)).toEqual([]);
  });

  it("shares one research slot when two labels independently resolve to one identity", () => {
    const merged = mergeObservations({
      existing: [],
      observations: [observation("KAWS", { demandCount: 12 }), observation("카우스", { demandCount: 4 })],
      now: stamp,
      observationLimit: 10,
      writeLimit: 10,
    });
    const unresolved = applyIdentityResolution(merged.rows, new Map([["kaws", "Q3194367"], ["카우스", null]]), stamp);
    const korean = unresolved.find((row) => row.normalizedName === "카우스");
    expect(korean?.payload.identityKey).toBeNull();
    expect(korean?.payload.labels).not.toContain("KAWS");
    const linked = applyIdentityResolution(merged.rows, new Map([["kaws", "Q3194367"], ["카우스", "Q3194367"]]), stamp);
    expect(linked.every((row) => row.payload.identityKey === "Q3194367")).toBe(true);
    expect(linked.find((row) => row.normalizedName === "카우스")?.payload.labels).not.toContain("KAWS");
    const ranked = rankCandidates({ candidates: linked, graph: graph("rich"), now });
    const batch = selectDailyBatch({ ranked, researchLimit: 10, sparseShare: 0, fetchLimit: 120 });
    expect(batch.selected).toHaveLength(1);
    expect(batch.skippedDuplicateIdentity).toHaveLength(1);
  });

  it("holds kawsone.com as an untrusted official candidate", () => {
    const review = officialCandidateReview("kawsone.com");
    expect(review?.trusted).toBe(false);
    expect(review?.decision).toBe("HOLD");
    expect(reviewDiscoveredHost("kawsone.com").state).not.toBe("TRUSTED_EXISTING");
    expect(reviewAllowsCrawl("kawsone.com")).toBe(false);
    expect(mayAutoTrustHost()).toBe(false);
  });

  it("drops museum names that are not on an already trusted host", () => {
    const rows = museumRosterObservations({
      rows: [
        { name: "Museum Painter", url: "https://www.tate.org.uk/art/artists/museum-painter" },
        { name: "Untrusted Painter", url: "https://example-museum.edu/artists/untrusted-painter" },
      ],
      sourceName: "Tate",
      graph: graph(),
      seenAt: stamp,
    });
    expect(rows.map((row) => row.label)).toEqual(["Museum Painter"]);
    expect(reviewDiscoveredHost("kukjegallery.com").state).toBe("TRUSTED_EXISTING");
    expect(reviewDiscoveredHost("wikipedia.org").state).toBe("REJECTED");
    expect(reviewDiscoveredHost("instagram.com").state).toBe("REJECTED");
    expect(reviewDiscoveredHost("example-museum.edu").state).toBe("OFFICIAL_CANDIDATE");
    expect(mayAutoTrustHost()).toBe(false);
  });

  it("ships a disabled-by-default budget and a separate history cron", () => {
    expect(EXPANSION_DEFAULTS.enabled).toBe(false);
    expect(EXPANSION_DEFAULTS.dailyResearchLimit).toBe(10);
    expect(expansionPolicyFrom({ ROB_EXPANSION_ENABLED: "true", ROB_DAILY_RESEARCH_LIMIT: "1000" }).dailyResearchLimit).toBe(50);
    const vercel = JSON.parse(readFileSync(resolve("vercel.json"), "utf8")) as { crons: { path: string; schedule: string }[] };
    expect(vercel.crons).toHaveLength(15);
    expect(vercel.crons.filter((cron) => cron.path === "/api/cron/history-expansion")).toEqual([{ path: "/api/cron/history-expansion", schedule: "45 16 * * *" }]);
    expect(vercel.crons.filter((cron) => cron.path === "/api/cron/crawl-opencalls")).toHaveLength(1);
    const cron = readFileSync(resolve("app/api/cron/history-expansion/route.ts"), "utf8");
    expect(cron).toContain("isCronAuthorized");
    expect(cron).toContain("allowDevWithoutSecret: false");
    expect(cron).toContain("policy.enabled");
    const admin = readFileSync(resolve("app/api/admin/history/expansion/route.ts"), "utf8");
    expect(admin).toContain('confirm !== "RUN"');
    expect(admin).toContain("requireAdminSession");
    expect(admin).not.toMatch(/body\.(url|host|sql|depth)/);
    const sql = readFileSync(resolve("prisma/sql/add-artist-research-candidates.sql"), "utf8");
    expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN)\b/i);
    const runtime = readFileSync(resolve("lib/history/researchRuntime.ts"), "utf8");
    expect(runtime).toContain("revalidateTag(PUBLIC_HISTORY_CACHE_TAG)");
    expect(runtime).not.toMatch(/search\.google|searchadvisor\.naver/i);
  });
});
