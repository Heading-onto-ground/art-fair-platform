/**
 * Isolated Global Expansion canary.
 * Reads may use the configured database. This file never inserts artists,
 * candidates, jobs, or exhibitions, and it never calls publishResearchFact.
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local" });
import { advanceResearchJob, blankJob, type ResearchDeps } from "@/lib/history/researchAdvance";
import { runExpansion, type ExpansionDeps } from "@/lib/history/expansionScheduler";
import { expansionPolicyFrom } from "@/lib/history/expansionPolicy";
import type { ExpansionGraph } from "@/lib/history/expansionCandidates";
import { entitiesFromPayload, fetchWikidata, searchEntityIds } from "@/lib/history/wikidataIdentity";
import { fetchTrustedDocument, type CrawlFact } from "@/lib/history/trustedCrawl";
import type { ResearchJobRecord } from "@/lib/history/researchJob";

const now = new Date("2026-11-06T16:45:00.000Z");

function richGraph(): ExpansionGraph {
  return {
    artists: [
      { slug: "lee-ufan", labels: ["Lee Ufan", "이우환"], exhibitionIds: Array.from({ length: 12 }, (_, index) => `lee-${index}`) },
      { slug: "park-seo-bo", labels: ["Park Seo-Bo", "박서보"], exhibitionIds: Array.from({ length: 12 }, (_, index) => `park-${index}`) },
    ],
    exhibitions: [],
    unresolved: [{ label: "Ada Painter", exhibitionId: "ex-park", exhibitionTitle: "Ecriture", artistSlugs: ["park-seo-bo"], sourceUrl: "https://www.kukjegallery.com/exhibitions/ecriture" }],
  };
}

async function schedulerCanary() {
  const jobs: ResearchJobRecord[] = [];
  const started: string[] = [];
  const stored: import("@/lib/history/expansionCandidates").CandidateRecord[] = [];
  const demand = [
    { query: "KAWS", count: 12, lastSearched: now.toISOString() },
    { query: "카우스", count: 4, lastSearched: now.toISOString() },
    ...Array.from({ length: 12 }, (_, index) => ({ query: `Canary Painter ${index + 1}`, count: 1, lastSearched: now.toISOString() })),
  ];
  const deps: ExpansionDeps = {
    now: () => now,
    loadGraph: async () => richGraph(),
    loadDemand: async () => demand,
    loadCandidates: async () => stored,
    saveCandidates: async (rows) => {
      for (const row of rows) {
        const index = stored.findIndex((item) => item.normalizedName === row.normalizedName);
        if (index >= 0) stored[index] = row;
        else stored.push(row);
      }
    },
    artistIds: async () => new Map([["lee-ufan", "id-lee"], ["park-seo-bo", "id-park"]]),
    jobsStartedToday: async () => jobs.length,
    openVisitorJobs: async () => 0,
    listJobsForQuery: async (query) => jobs.filter((job) => job.normalizedQuery === query),
    readJob: async (id) => jobs.find((job) => job.id === id) ?? null,
    findKnown: async () => null,
    insertJob: async (job) => {
      jobs.push(job);
      return job;
    },
    startWorkflow: async (id) => {
      started.push(id);
      return `isolated-${id}`;
    },
    breakerSignals: async () => ({ consecutiveFailedRuns: 0, startFailureShare: 0, publicationsLastRun: 0, duplicateArtists: 0, databaseUnavailable: false }),
    recordRun: async () => undefined,
    emit: async () => undefined,
  };
  const policy = expansionPolicyFrom({ ROB_EXPANSION_ENABLED: "true", ROB_DAILY_RESEARCH_LIMIT: "10", ROB_EXPANSION_SPARSE_SHARE: "0" });
  const first = await runExpansion({ mode: "MANUAL", policy }, deps);
  const second = await runExpansion({ mode: "MANUAL", policy }, deps);
  return {
    firstStarted: first.jobsStarted,
    secondStarted: second.jobsStarted,
    workflowStarts: started.length,
    ranking: first.summary.ranking.slice(0, 20).map((row) => ({ name: row.displayName, score: row.score, reasons: row.reasons, families: row.expectedSourceFamilies })),
    selected: first.summary.selected.map((row) => row.displayName),
    kawsSelected: first.summary.selected.some((row) => row.normalizedName === "kaws"),
    koreanSelectedSeparately: first.summary.selected.some((row) => row.normalizedName === "카우스"),
    storedJobs: jobs.length,
    storedCandidates: stored.length,
  };
}

async function identityCanary(query: string) {
  const published: CrawlFact[] = [];
  const deps: ResearchDeps = {
    now: () => new Date(),
    findKnown: async () => null,
    lookupIdentity: async (value) => {
      const search = await fetchWikidata(`action=wbsearchentities&search=${encodeURIComponent(value)}&language=en&uselang=en&type=item&limit=5&format=json`);
      const ids = searchEntityIds(search, 5);
      if (ids.length === 0) return { entities: [], institutions: [], error: null };
      const detail = await fetchWikidata(`action=wbgetentities&ids=${ids.join("|")}&props=labels|aliases|descriptions|claims&languages=en|ko&format=json`);
      return { entities: entitiesFromPayload(detail).artists, institutions: [], error: null };
    },
    loadInstitutions: async () => [],
    fetchDocument: (url) => fetchTrustedDocument(url, { timeoutMs: 12_000 }),
    loadSnapshot: async () => ({ artists: [], exhibitions: [], unresolved: [] }),
    publish: async (_job, fact) => {
      published.push(fact);
      return { ok: true, artistId: "isolated-canary", artistSlug: "isolated-canary" };
    },
  };
  let job = blankJob({
    id: `canary-${query}`,
    query,
    normalizedQuery: query.toLowerCase(),
    locale: /[가-힣]/.test(query) ? "ko" : "en",
    demandQuality: "AUTONOMOUS_EXPANSION",
    expand: false,
    now: new Date(),
  });
  job.payload.origin = "DAILY_EXPANSION";
  for (let step = 0; step < 12 && job.stage !== "DONE"; step += 1) {
    job = await advanceResearchJob(job, deps);
  }
  return {
    query,
    status: job.status,
    stage: job.stage,
    failureCode: job.failureCode,
    identity: job.payload.identity ? { id: job.payload.identity.id, label: job.payload.identity.label, aliases: job.payload.identity.aliases } : null,
    sources: job.payload.sources.map((source) => ({ name: source.name, url: source.url, blocked: source.blocked })),
    verifiedFactCount: job.verifiedFactCount,
    reviewFactCount: job.reviewFactCount,
    publishedTitles: published.map((fact) => fact.title),
    koreanAliasVerified: Boolean(job.payload.nativeName?.includes("카우") || job.payload.identity?.aliases.some((alias) => alias === "카우스")),
  };
}

async function readonlyDryRun() {
  if (!process.env.DATABASE_URL) return { available: false, reason: "DATABASE_URL is not set" };
  const { loadExpansionGraph, loadRealVisitorDemand } = await import("@/lib/history/expansionStore");
  const { rankCandidates, selectDailyBatch } = await import("@/lib/history/expansionRank");
  const { demandObservations, mergeObservations, sparseArtistObservations, unresolvedObservations } = await import("@/lib/history/expansionCandidates");
  const seenAt = new Date().toISOString();
  const [graph, demand] = await Promise.all([loadExpansionGraph(), loadRealVisitorDemand()]);
  const observations = [
    ...demandObservations(demand, graph, seenAt),
    ...unresolvedObservations(graph, seenAt),
    ...sparseArtistObservations(graph, demand, seenAt),
  ];
  const merged = mergeObservations({ existing: [], observations, now: seenAt, observationLimit: 100, writeLimit: 50 });
  const ranked = rankCandidates({ candidates: merged.rows, graph, now: new Date() });
  const batch = selectDailyBatch({ ranked, researchLimit: 10, sparseShare: 0.3, fetchLimit: 120 });
  return {
    available: true,
    artists: graph.artists.length,
    unresolved: graph.unresolved.length,
    demand: demand.length,
    observed: merged.observed,
    top20: ranked.slice(0, 20).map((row) => ({ name: row.candidate.displayName, kind: row.kind, score: row.score, reasons: row.reasons, families: row.expectedSourceFamilies })),
    next10: batch.selected.map((row) => row.candidate.displayName),
    kaws: ranked.find((row) => row.candidate.normalizedName === "kaws" || row.candidate.normalizedName === "카우스") ?? null,
  };
}

async function main() {
  const scheduler = await schedulerCanary();
  let kaws: Awaited<ReturnType<typeof identityCanary>> | { error: string };
  let korean: Awaited<ReturnType<typeof identityCanary>> | { error: string };
  try {
    kaws = await identityCanary("KAWS");
  } catch (error) {
    kaws = { error: error instanceof Error ? error.message : "identity canary failed" };
  }
  try {
    korean = await identityCanary("카우스");
  } catch (error) {
    korean = { error: error instanceof Error ? error.message : "identity canary failed" };
  }
  let dry: Awaited<ReturnType<typeof readonlyDryRun>> | { available: false; reason: string };
  try {
    dry = await readonlyDryRun();
  } catch (error) {
    dry = { available: false, reason: error instanceof Error ? error.message : "dry run failed" };
  }
  console.log(JSON.stringify({ scheduler, kaws, korean, dry }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
