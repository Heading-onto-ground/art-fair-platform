import { describe, expect, it } from "vitest";
import { ARCHIVE_LIMITS, ARCHIVE_WINDOWS, exhibitionUrlsFromArchive, harvestExhibitionArchive, normalizeExhibitionUrl, observationsFromExhibitionFacts, selectUnseenExhibitionUrls } from "@/lib/history/exhibitionArchive";
import { mergeObservations, type ExpansionGraph } from "@/lib/history/expansionCandidates";
import { actionableFrontiers, exhibitionFrontiers } from "@/lib/history/exhibitionFrontier";
import { expansionPolicyFrom, ESTIMATED_FETCHES_PER_JOB } from "@/lib/history/expansionPolicy";
import { rankCandidates } from "@/lib/history/expansionRank";
import { runExpansion, type ExpansionDeps } from "@/lib/history/expansionScheduler";
import { aliasLookupEqual } from "@/lib/history/identity";
import { classifyTrustedUrl, crawlTrustedPage } from "@/lib/history/trustedCrawl";
import { expansionSnapshot } from "@/lib/history/expansionGraphValue";

const seenAt = "2026-11-12T00:00:00.000Z";
const now = new Date(seenAt);

function policy(overrides: Partial<ReturnType<typeof expansionPolicyFrom>> = {}) {
  return { ...expansionPolicyFrom({}), ...overrides, enabled: overrides.enabled ?? true };
}

function bridgeGraph(): ExpansionGraph {
  return {
    artists: [
      { slug: "park-seo-bo", labels: ["Park Seo-Bo"], exhibitionIds: ["e1"] },
      { slug: "lee-ufan", labels: ["Lee Ufan"], exhibitionIds: ["e1"] },
      { slug: "history-a", labels: ["History A"], exhibitionIds: ["e2", "e3", "e4", "e5"] },
      { slug: "history-b", labels: ["History B"], exhibitionIds: ["e2", "e3", "e4", "e5"] },
    ],
    exhibitions: [
      { id: "e1", title: "Bridge", year: 2019, space: "Kukje Gallery", artistSlugs: ["park-seo-bo", "lee-ufan"] },
      { id: "e2", title: "Inert Group", year: 2020, space: "Kukje Gallery", artistSlugs: ["history-a", "history-b"] },
      { id: "e3", title: "Solo A", year: 2018, space: "Kukje Gallery", artistSlugs: ["history-a"] },
      { id: "e4", title: "Solo B", year: 2017, space: "Kukje Gallery", artistSlugs: ["history-b"] },
      { id: "e5", title: "Solo C", year: 2016, space: "Kukje Gallery", artistSlugs: ["history-a"] },
    ],
    unresolved: [],
  };
}

const indexHtml = `
  <a href="https://www.kukjegallery.com/exhibitions/view?seq=300">Recent</a>
  <a href="https://www.kukjegallery.com/exhibitions/view?seq=300&utm_source=mail">Recent again</a>
  <a href="/exhibitions/view?seq=299">Earlier</a>
  <a href="https://www.kukjegallery.com/artists/view?seq=1">Roster</a>
  <a href="https://www.instagram.com/kukjegallery/">Instagram</a>
  <a href="https://shop.kukjegallery.com/exhibitions/view?seq=1">Shop</a>
  <a href="https://example.com/exhibitions/view?seq=8">Elsewhere</a>
`;

const explicitPage = `
  <span class="page-main-list-area__title">Seoul</span>
  <span class="page-main-list-artist__name-text"><a href="/artists/view?seq=1">Park Seo-Bo</a></span>
  <span class="page-main-list-artist__name-text"><a href="/artists/view?seq=2">Mina Cho</a></span>
  <span class="page-main-list-artist__name-text"><a>Canary Painter</a></span>
  <span class="page-main-list-artist__exhibition">Shared Room</span>
  <p class="page-main-list-time">September 1 – October 30, 2019</p>
  <footer><a href="/artists/view?seq=9">Footer Person</a></footer>
`;

const titleOnlyPage = `
  <span class="page-main-list-area__title">Seoul</span>
  <span class="page-main-list-artist__exhibition">Mina Cho, Nara Park, Other Person</span>
  <p class="page-main-list-time">September 1 – October 30, 2019</p>
`;

describe("trusted exhibition archive supply", () => {
  it("uses only exhibition adapters that are already trusted", () => {
    expect(ARCHIVE_WINDOWS.map((window) => window.institution)).toEqual(["Kukje Gallery", "Gallery Hyundai"]);
    for (const window of ARCHIVE_WINDOWS) {
      expect(classifyTrustedUrl(window.indexUrl)?.host).toBeTruthy();
    }
    expect(normalizeExhibitionUrl("https://www.tate.org.uk/whats-on/tate-modern/exhibition/test")).toBeNull();
    expect(normalizeExhibitionUrl("https://example.com/exhibitions/view?seq=1")).toBeNull();
  });

  it("keeps exhibition URLs, drops duplicates, and ignores roster and external links", () => {
    const urls = exhibitionUrlsFromArchive(indexHtml, "https://www.kukjegallery.com/exhibitions/past");
    expect(urls).toEqual([
      "https://kukjegallery.com/exhibitions/view?seq=300",
      "https://kukjegallery.com/exhibitions/view?seq=299",
    ]);
    const hyundai = exhibitionUrlsFromArchive(`
      <a href="/exhibition/view/20000000505">Recent</a>
      <a href="/exhibition/view/2">Old</a>
      <a href="/exhibition/view/' + e.exbiSn">Template</a>
      <a href="https://www.instagram.com/galleryhyundai">Instagram</a>
    `, "https://www.galleryhyundai.com/exhibition/archive");
    expect(hyundai).toEqual([
      "https://galleryhyundai.com/exhibition/view/20000000505",
      "https://galleryhyundai.com/exhibition/view/2",
    ]);
    expect(selectUnseenExhibitionUrls(hyundai, new Set(["https://galleryhyundai.com/exhibition/view/20000000505"]), 3)).toEqual([
      "https://galleryhyundai.com/exhibition/view/2",
    ]);
  });

  it("skips an exhibition page already represented in ROB", async () => {
    const graph = bridgeGraph();
    const known = graph.exhibitions[0];
    if (known) known.sourceUrls = ["https://www.kukjegallery.com/exhibitions/view?seq=300&utm=1"];
    const calls: string[] = [];
    const harvest = await harvestExhibitionArchive({
      graph,
      seenAt,
      limit: 20,
      fetchDocument: async (url) => {
        calls.push(url);
        if (url.includes("/exhibitions/past")) return { html: indexHtml, requests: 1 };
        return { html: explicitPage, requests: 1 };
      },
    });
    expect(calls.some((url) => url.includes("seq=300"))).toBe(false);
    expect(harvest.note.knownSkipped).toBeGreaterThan(0);
    expect(harvest.note.inspectedExhibitionUrls).not.toContain("https://kukjegallery.com/exhibitions/view?seq=300");
  });

  it("queues an explicit unresolved participant and drops title, roster, footer, and fixture names", async () => {
    const graph = bridgeGraph();
    const before = graph.artists.length;
    const harvest = await harvestExhibitionArchive({
      graph,
      seenAt,
      limit: 20,
      fetchDocument: async (url) => {
        if (url.includes("galleryhyundai.com")) return { html: "<html></html>", requests: 1 };
        if (url.includes("/exhibitions/past")) return { html: `<a href="/exhibitions/view?seq=300">Show</a><a href="/exhibitions/view?seq=299">Title</a>`, requests: 1 };
        if (url.endsWith("seq=300")) return { html: explicitPage, requests: 1 };
        return { html: titleOnlyPage, requests: 1 };
      },
    });
    expect(graph.artists).toHaveLength(before);
    expect(harvest.observations.map((row) => row.label)).toEqual(["Mina Cho"]);
    expect(harvest.observations[0]?.sourceType).toBe("TRUSTED_EXHIBITION_ARCHIVE");
    expect(harvest.observations[0]?.sharedExistingArtists).toContain("park-seo-bo");
    expect(harvest.observations[0]?.existingArtistSlug).toBeUndefined();
    expect(harvest.note.existingMatches).toContain("park-seo-bo");
    expect(harvest.pages.some((page) => page.participants.some((person) => person.evidence === "TITLE_ONLY" && person.label.includes("Mina Cho")))).toBe(true);
    expect(JSON.stringify(harvest.observations)).not.toMatch(/Footer Person|Canary Painter/);
  });

  it("bounds child observations and archive fetches", async () => {
    const names = Array.from({ length: 25 }, (_, index) => `<span class="page-main-list-artist__name-text"><a>Bridge Person ${index + 1}</a></span>`).join("");
    const html = `<span class="page-main-list-area__title">Seoul</span>${names}<span class="page-main-list-artist__exhibition">Group</span><p class="page-main-list-time">September 1 – October 30, 2019</p>`;
    const facts = crawlTrustedPage({
      url: "https://www.kukjegallery.com/exhibitions/view?seq=300",
      retrievedAt: seenAt,
      html,
      artists: [],
      snapshot: expansionSnapshot(bridgeGraph()),
      snapshotReady: true,
    });
    expect(observationsFromExhibitionFacts(facts, bridgeGraph(), seenAt, 20)).toHaveLength(20);
    const links = Array.from({ length: 10 }, (_, index) => `<a href="/exhibitions/view?seq=${300 - index}">Show</a>`).join("");
    const hyundaiLinks = Array.from({ length: 10 }, (_, index) => `<a href="/exhibition/view/${20000000000 + index}">Show</a>`).join("");
    const calls: string[] = [];
    const harvest = await harvestExhibitionArchive({
      graph: bridgeGraph(),
      seenAt,
      limit: 20,
      fetchDocument: async (url) => {
        calls.push(url);
        if (url.includes("kukjegallery.com/exhibitions/past")) return { html: links, requests: 1 };
        if (url.includes("galleryhyundai.com/exhibition/archive")) return { html: hyundaiLinks, requests: 1 };
        return { html: "<html></html>", requests: 1 };
      },
    });
    expect(calls.length).toBeLessThanOrEqual(ARCHIVE_LIMITS.maxRequests);
    expect(calls.length).toBe(ARCHIVE_LIMITS.maxRequests);
    expect(harvest.requests).toBeLessThanOrEqual(ARCHIVE_LIMITS.maxRequests);
    expect(ARCHIVE_LIMITS.maxRequests + 9 * ESTIMATED_FETCHES_PER_JOB).toBeLessThanOrEqual(120);
  });

  it("does not treat an inert group exhibition as actionable", () => {
    const graph = bridgeGraph();
    const display = exhibitionFrontiers(graph);
    const actionable = actionableFrontiers(graph);
    expect(display.some((row) => row.title === "Inert Group")).toBe(true);
    expect(actionable.some((row) => row.title === "Inert Group")).toBe(false);
    graph.unresolved.push({ label: "Mina Cho", exhibitionId: "e2", exhibitionTitle: "Inert Group", artistSlugs: ["history-a", "history-b"], sourceUrl: null });
    expect(actionableFrontiers(graph).some((row) => row.title === "Inert Group")).toBe(true);
  });

  it("ranks archive supply with the same weights as an explicit participant", () => {
    const graph = bridgeGraph();
    const shared = ["park-seo-bo", "lee-ufan"];
    const sourceUrl = "https://kukjegallery.com/exhibitions/view?seq=300";
    const merged = mergeObservations({
      existing: [],
      observations: [
        { label: "Mina Cho", sourceType: "TRUSTED_EXHIBITION_ARCHIVE", sourceContext: "GRAPH_FRONTIER", sourceUrl, seenAt, unresolvedOccurrences: 1, sharedExistingArtists: shared, sourceHints: [sourceUrl], via: { institution: "Kukje Gallery", exhibitionTitle: "Shared Room" } },
        { label: "Nara Park", sourceType: "UNRESOLVED_PARTICIPANT", sourceContext: "UNRESOLVED_PARTICIPANT", sourceUrl, seenAt, unresolvedOccurrences: 1, sharedExistingArtists: shared, sourceHints: [sourceUrl] },
        { label: "History A", sourceType: "SPARSE_EXISTING_ARTIST", sourceContext: "GRAPH_FRONTIER", sourceUrl: null, seenAt, existingArtistSlug: "history-a", exhibitionCount: 4 },
      ],
      now: seenAt,
      observationLimit: 100,
      writeLimit: 50,
    });
    const ranked = rankCandidates({ candidates: merged.rows, graph, now });
    const again = rankCandidates({ candidates: merged.rows, graph, now });
    const mina = ranked.find((row) => row.candidate.displayName === "Mina Cho");
    const nara = ranked.find((row) => row.candidate.displayName === "Nara Park");
    expect(mina?.researchReason).toBe("SHARED_EXHIBITION_FRONTIER");
    expect(mina?.score).toBe(nara?.score);
    expect(mina?.score).toBeGreaterThan(ranked.find((row) => row.candidate.displayName === "History A")?.score ?? 0);
    expect(again.map((row) => row.candidate.normalizedName)).toEqual(ranked.map((row) => row.candidate.normalizedName));
  });

  it("queues archive participants for a later run and keeps the fetch budget", async () => {
    const calls: string[] = [];
    const graph: ExpansionGraph = { artists: [], exhibitions: [], unresolved: [] };
    const box = harness({
      graph,
      demand: Array.from({ length: 5 }, (_, index) => ({ query: `Supply Painter ${index + 1}`, count: 1, lastSearched: seenAt })),
      fetchArchive: async (url) => {
        calls.push(url);
        if (url.includes("galleryhyundai.com")) return { html: "<html></html>", requests: 1 };
        if (url.includes("/exhibitions/past")) return { html: `<a href="/exhibitions/view?seq=300">Show</a>`, requests: 1 };
        return { html: explicitPage, requests: 1 };
      },
    });
    const run = await runExpansion({ mode: "SCHEDULED", policy: policy({ dailyFetchLimit: 16 }) }, box.deps);
    expect(run.status).toBe("COMPLETED");
    expect(calls.length).toBe(3);
    expect(run.jobsStarted).toBe(1);
    expect(run.estimatedFetches).toBe(3 + ESTIMATED_FETCHES_PER_JOB);
    expect(run.estimatedFetches).toBeLessThanOrEqual(16);
    expect(run.summary.selected.map((row) => row.displayName)).not.toContain("Mina Cho");
    const queued = box.candidates().find((row) => row.displayName === "Mina Cho");
    expect(queued?.sourceType).toBe("TRUSTED_EXHIBITION_ARCHIVE");
    expect(queued?.status).toBe("QUEUED");
    expect(queued?.researchJobId).toBeNull();
    expect(box.candidates().some((row) => row.displayName === "Canary Painter")).toBe(false);
  });

  it("does not fetch archives while the kill switch is off or the run is a dry ranking", async () => {
    const calls: string[] = [];
    const fetchArchive = async () => {
      calls.push("fetched");
      return { html: null, requests: 1 };
    };
    const disabled = await runExpansion({ mode: "SCHEDULED", policy: policy({ enabled: false }) }, harness({ fetchArchive }).deps);
    const dry = await runExpansion({ mode: "DRY_RUN", policy: policy({ enabled: true }) }, harness({ fetchArchive }).deps);
    expect(disabled.status).toBe("DISABLED");
    expect(dry.status).toBe("COMPLETED");
    expect(calls).toEqual([]);
  });
});

function harness(input: {
  graph?: ExpansionGraph;
  demand?: { query: string; count: number; lastSearched: string | null }[];
  fetchArchive?: ExpansionDeps["fetchArchive"];
}) {
  const candidates: import("@/lib/history/expansionCandidates").CandidateRecord[] = [];
  const jobs: import("@/lib/history/researchJob").ResearchJobRecord[] = [];
  const currentGraph = input.graph ?? { artists: [], exhibitions: [], unresolved: [] };
  const deps: ExpansionDeps = {
    now: () => now,
    loadGraph: async () => currentGraph,
    loadDemand: async () => input.demand ?? [],
    loadCandidates: async () => candidates,
    saveCandidates: async (rows) => {
      for (const row of rows) {
        const index = candidates.findIndex((item) => item.normalizedName === row.normalizedName);
        if (index >= 0) candidates[index] = row;
        else candidates.push(row);
      }
    },
    artistIds: async () => new Map(),
    fetchArchive: input.fetchArchive,
    jobsStartedToday: async () => 0,
    openVisitorJobs: async () => 0,
    listJobsForQuery: async (query) => jobs.filter((job) => job.normalizedQuery === query),
    readJob: async (id) => jobs.find((job) => job.id === id) ?? null,
    findKnown: async (label) => {
      const artist = currentGraph.artists.find((item) => item.labels.some((name) => aliasLookupEqual(name, label)));
      if (!artist) return null;
      return { id: artist.slug, slug: artist.slug, canonicalName: artist.labels[0] ?? artist.slug, nativeName: null, exhibitionCount: artist.exhibitionIds.length };
    },
    insertJob: async (job) => {
      jobs.push(job);
      return job;
    },
    startWorkflow: async (id) => `wf-${id}`,
    breakerSignals: async () => ({ consecutiveFailedRuns: 0, startFailureShare: 0, publicationsLastRun: 0, duplicateResolvedIdentities: 0, databaseUnavailable: false }),
    recordRun: async () => undefined,
    emit: async () => undefined,
  };
  return { deps, candidates: () => candidates };
}
