import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { DiscoveryEntity } from "@/lib/history/sourceDiscovery";
import { advanceResearchJob, blankJob, type ResearchDeps } from "@/lib/history/researchAdvance";
import {
  discoveryEvents,
  mayPublishCrawledFact,
  normalizeResearchQuery,
  projectResearchJob,
  researchStepDisposition,
  reuseDecision,
  settleWorkflowClaims,
  withEvents,
  workflowClaimAvailable,
  workflowOwned,
  type ResearchJobRecord,
} from "@/lib/history/researchJob";
import type { CrawlFact } from "@/lib/history/trustedCrawl";

const now = new Date("2026-11-02T12:00:00.000Z");

function painter(label: string, id: string): DiscoveryEntity {
  return {
    id,
    label,
    description: "painter",
    aliases: [label],
    instanceOf: ["Q5"],
    occupations: ["Q1028181"],
    officialWebsites: ["https://www.kukjegallery.com/artists/view?seq=999"],
    collectionIds: [],
  };
}

const chronology = `
  <h2>Ada Painter</h2>
  <h4 class="biography__title">Selected Solo Exhibitions</h4>
  <ul><li><span class="biography__text">2019<br /> <em>First Light, </em>Kukje Gallery, Seoul, Korea</span></li></ul>
  <h4 class="biography__title">Selected Press</h4>
  <p><em>A review, </em>Artforum, New York, USA</p>
`;

function deps(overrides: Partial<ResearchDeps> = {}): ResearchDeps & { published: CrawlFact[] } {
  const published: CrawlFact[] = [];
  const base: ResearchDeps = {
    now: () => now,
    findKnown: async () => null,
    lookupIdentity: async () => ({ entities: [painter("Ada Painter", "Q1")], institutions: [], error: null }),
    loadInstitutions: async () => [],
    fetchDocument: async () => ({ html: chronology, requests: 1, host: "kukjegallery.com" }),
    loadSnapshot: async () => ({ artists: [], exhibitions: [], unresolved: [] }),
    publish: async (_job, fact) => {
      published.push(fact);
      return { ok: true, artistId: "artist-1", artistSlug: "ada-painter" };
    },
  };
  return { published, ...base, ...overrides };
}

async function run(job: ResearchJobRecord, research: ResearchDeps) {
  let current = job;
  for (let step = 0; step < 8 && current.stage !== "DONE"; step += 1) {
    current = await advanceResearchJob(current, research);
  }
  return current;
}

describe("research jobs", () => {
  it("normalizes visitor queries and drops addresses", () => {
    expect(normalizeResearchQuery("  Lee   Ufan ")).toBe("lee ufan");
    expect(normalizeResearchQuery("ada@studio.com")).toBeNull();
    expect(normalizeResearchQuery("ab")).toBeNull();
  });

  it("reuses an open job and then a finished job", () => {
    const open = { id: "open", stage: "FETCH" as const, status: "RESEARCHING" as const, updatedAt: "2026-11-02T00:00:00.000Z" };
    const done = { id: "done", stage: "DONE" as const, status: "NOT_FOUND" as const, updatedAt: "2026-11-01T00:00:00.000Z" };
    expect(reuseDecision([done, open])).toEqual({ id: "open" });
    expect(reuseDecision([done])).toEqual({ id: "done" });
    expect(reuseDecision([])).toBe("create");
  });

  it("does not research a known artist with a public history", async () => {
    const research = deps({
      findKnown: async () => ({ id: "lee", slug: "lee-ufan", canonicalName: "Lee Ufan", nativeName: "이우환", exhibitionCount: 15 }),
    });
    const job = blankJob({ id: "job", query: "Lee Ufan", normalizedQuery: "lee ufan", locale: "en", demandQuality: "REAL_VISITOR", expand: false, now });
    const next = await advanceResearchJob(job, research);
    expect(next.resultArtistSlug).toBe("lee-ufan");
    expect(next.status).toBe("HISTORY_READY");
    expect(research.published).toHaveLength(0);
    expect(next.stage).toBe("DONE");
  });

  it("researches a known artist from a trusted candidate profile without Wikidata", async () => {
    const calls: string[] = [];
    const profile = "https://www.galleryhyundai.com/artist/view/20000000033";
    const research = deps({
      findKnown: async () => ({ id: "park", slug: "park-hyun-ki", canonicalName: "Park Hyun-Ki", nativeName: "박현기", exhibitionCount: 1 }),
      lookupIdentity: async () => {
        throw new Error("structured lookup");
      },
      fetchDocument: async (url) => {
        calls.push(url);
        return { html: "<html><title>Park Hyun-Ki</title></html>", requests: 1, host: "galleryhyundai.com" };
      },
    });
    const job = blankJob({ id: "park", query: "Park Hyun-Ki", normalizedQuery: "park hyun ki", locale: "en", demandQuality: "AUTONOMOUS_EXPANSION", expand: true, now });
    job.payload.origin = "DAILY_EXPANSION";
    job.payload.candidateSources = [{
      url: profile,
      name: "Gallery Hyundai",
      host: "galleryhyundai.com",
      sourceType: "SPARSE_EXISTING_ARTIST",
      institution: "Gallery Hyundai",
      sourceFamily: "galleryhyundai.com",
      rosterIndexUrl: "https://www.galleryhyundai.com/artist/list",
      profileUrl: profile,
      qualifier: null,
    }];
    const done = await run(job, research);
    expect(calls).toContain(profile);
    expect(done.identityStatus).toBe("KNOWN");
    expect(done.payload.identity).toBeNull();
    expect(done.resolvedArtistSlug).toBe("park-hyun-ki");
    expect(research.published).toHaveLength(0);
    expect(done.failureCode).toBe("NO_TRUSTED_SOURCE");
    expect(done.stage).toBe("DONE");
  });

  it("does not create an artist from a trusted profile when structured identity is missing", async () => {
    const calls: string[] = [];
    const research = deps({
      lookupIdentity: async () => ({ entities: [], institutions: [], error: null }),
      fetchDocument: async (url) => {
        calls.push(url);
        return { html: "<html></html>", requests: 1, host: "arariogallery.com" };
      },
    });
    const job = blankJob({ id: "ahn", query: "AHN Jisan", normalizedQuery: "ahn jisan", locale: "en", demandQuality: "AUTONOMOUS_EXPANSION", expand: false, now });
    job.payload.origin = "DAILY_EXPANSION";
    job.payload.candidateSources = [{
      url: "https://www.arariogallery.com/artists/241-ahn-jisan/",
      name: "Arario Gallery",
      host: "arariogallery.com",
      sourceType: "GALLERY_ROSTER",
      institution: "Arario Gallery",
      sourceFamily: "arariogallery.com",
      rosterIndexUrl: "https://www.arariogallery.com/artists/",
      profileUrl: "https://www.arariogallery.com/artists/241-ahn-jisan/",
      qualifier: null,
    }];
    const done = await run(job, research);
    expect(done.status).toBe("NOT_FOUND");
    expect(done.failureCode).toBe("IDENTITY_NOT_FOUND");
    expect(done.resolvedArtistId).toBeNull();
    expect(calls).toEqual([]);
    expect(research.published).toHaveLength(0);
  });

  it("never fetches an untrusted or arbitrary candidate URL", async () => {
    const calls: string[] = [];
    const research = deps({
      findKnown: async () => ({ id: "park", slug: "park-hyun-ki", canonicalName: "Park Hyun-Ki", nativeName: "박현기", exhibitionCount: 1 }),
      fetchDocument: async (url) => {
        calls.push(url);
        return { html: "<html></html>", requests: 1, host: "example" };
      },
    });
    const job = blankJob({ id: "blocked-hint", query: "Park Hyun-Ki", normalizedQuery: "park hyun ki", locale: "en", demandQuality: "AUTONOMOUS_EXPANSION", expand: true, now });
    job.payload.origin = "DAILY_EXPANSION";
    job.payload.candidateSources = [
      { url: "https://evil.example/crawl-me", name: "Evil", host: "evil.example", sourceType: "GALLERY_ROSTER", institution: null, sourceFamily: null, rosterIndexUrl: null, profileUrl: "https://evil.example/crawl-me", qualifier: null },
      { url: "https://www.galleryhyundai.com/private/notes", name: "Gallery Hyundai", host: "galleryhyundai.com", sourceType: "GALLERY_ROSTER", institution: "Gallery Hyundai", sourceFamily: "galleryhyundai.com", rosterIndexUrl: null, profileUrl: "https://www.galleryhyundai.com/private/notes", qualifier: null },
    ];
    const done = await run(job, research);
    expect(calls.some((url) => url.includes("evil.example"))).toBe(false);
    expect(calls.some((url) => url.includes("/private/notes"))).toBe(false);
    expect(done.failureCode).toBe("NO_TRUSTED_SOURCE");
    expect(research.published).toHaveLength(0);
  });

  it("does not create an artist when the identity is ambiguous or missing", async () => {
    const ambiguous = deps({
      lookupIdentity: async () => ({ entities: [painter("Kim", "Q1"), painter("Kim", "Q2")], institutions: [], error: null }),
    });
    const missing = deps({ lookupIdentity: async () => ({ entities: [], institutions: [], error: null }) });
    const ambiguousJob = await run(blankJob({ id: "a", query: "Kim", normalizedQuery: "kim", locale: "en", demandQuality: "REAL_VISITOR", expand: false, now }), ambiguous);
    const missingJob = await run(blankJob({ id: "b", query: "Nobody Known", normalizedQuery: "nobody known", locale: "ko", demandQuality: "REAL_VISITOR", expand: false, now }), missing);
    expect(ambiguousJob.status).toBe("NEEDS_REVIEW");
    expect(ambiguousJob.failureCode).toBe("IDENTITY_AMBIGUOUS");
    expect(missingJob.status).toBe("NOT_FOUND");
    expect(ambiguous.published).toHaveLength(0);
    expect(missing.published).toHaveLength(0);
  });

  it("publishes one verified chronology fact and does not publish it twice", async () => {
    const research = deps();
    const job = blankJob({ id: "ada", query: "Ada Painter", normalizedQuery: "ada painter", locale: "en", demandQuality: "REAL_VISITOR", expand: false, now });
    expect(job.payload.candidateSources).toBeUndefined();
    const done = await run(job, research);
    expect(done.identityStatus).toBe("RESOLVED");
    expect(done.sourcesFound).toBeGreaterThan(0);
    expect(done.verifiedFactCount).toBe(1);
    expect(done.resultArtistSlug).toBe("ada-painter");
    expect(research.published).toHaveLength(1);
    expect(mayPublishCrawledFact(research.published[0]!)).toBe(true);
    const again = await advanceResearchJob(done, research);
    expect(research.published).toHaveLength(1);
    expect(again.stage).toBe("DONE");
    const view = projectResearchJob(done);
    expect(JSON.stringify(view)).not.toMatch(/%/);
    expect(view.facts[0]?.title).toBe("First Light");
    expect(view.facts[0]?.sourceName).toBe("Kukje Gallery");
    expect(view.steps.filter((step) => step.state === "done").length).toBeGreaterThan(0);
  });

  it("keeps a blocked official source honest", async () => {
    const research = deps({ fetchDocument: async () => ({ blocked: "SOURCE_UNAVAILABLE", requests: 1, host: "kukjegallery.com" }) });
    const done = await run(blankJob({ id: "blocked", query: "Ada Painter", normalizedQuery: "ada painter", locale: "ko", demandQuality: "REAL_VISITOR", expand: false, now }), research);
    expect(done.status).toBe("SOURCE_BLOCKED");
    expect(done.failureCode).toBe("SOURCE_BLOCKED");
    expect(research.published).toHaveLength(0);
    expect(projectResearchJob(done).headline).toContain("접근할 수 없습니다");
  });

  it("emits each discovery event once", () => {
    const job = blankJob({ id: "e", query: "Ada Painter", normalizedQuery: "ada painter", locale: "en", demandQuality: "REAL_VISITOR", expand: false, now });
    const resolved = { ...job, identityStatus: "RESOLVED", payload: { ...job.payload, stepCount: 1, emitted: [] } };
    const first = discoveryEvents(job, resolved);
    const second = discoveryEvents({ ...resolved, payload: { ...resolved.payload, emitted: first } }, { ...resolved, payload: { ...resolved.payload, stepCount: 2, emitted: first } });
    expect(first).toContain("DISCOVERY_IDENTITY_RESOLVED");
    expect(second).not.toContain("DISCOVERY_IDENTITY_RESOLVED");
  });

  it("uses a trusted gallery roster when the personal site cannot be fetched", async () => {
    const roster = `
      <a href="/artists/view?seq=176"><span class="artists-main-list__name">Haegue Yang <span style="display:none;">양혜규</span></span></a>
      <a href="/artists/view?seq=10"><span class="artists-main-list__name">Other Artist</span></a>
    `;
    const page = chronology.replace("Ada Painter", "Haegue Yang").replace("First Light", "Star-Crossed Rendezvous");
    const calls: string[] = [];
    const research = deps({
      lookupIdentity: async () => ({
        entities: [{ ...painter("Haegue Yang", "Q1567689"), officialWebsites: ["http://www.heikejung.de/content.html"], aliases: ["Haegue Yang", "양혜규"] }],
        institutions: [],
        error: null,
      }),
      fetchDocument: async (url) => {
        calls.push(url);
        if (url.includes("/artists/view?seq=176")) return { html: page, requests: 1, host: "kukjegallery.com" };
        if (url.endsWith("/artists")) return { html: roster, requests: 1, host: "kukjegallery.com" };
        return { blocked: "LOW_AUTHORITY", requests: 0, host: "untrusted" };
      },
      publish: async (_job, fact) => {
        research.published.push(fact);
        return { ok: true, artistId: "artist-hy", artistSlug: "haegue-yang" };
      },
    });
    const done = await run(blankJob({ id: "hy", query: "Haegue Yang", normalizedQuery: "haegue yang", locale: "ko", demandQuality: "REAL_VISITOR", expand: false, now }), research);
    expect(calls.some((url) => url.endsWith("/artists"))).toBe(true);
    expect(calls.some((url) => url.includes("seq=176"))).toBe(true);
    expect(calls.some((url) => url.includes("heikejung"))).toBe(false);
    expect(done.verifiedFactCount).toBe(1);
    expect(done.resultArtistSlug).toBe("haegue-yang");
    expect(research.published).toHaveLength(1);
    expect(projectResearchJob(done).detail).toContain("현재 기록은 일부입니다.");
  });

  it("records a real partial result after the first published fact", async () => {
    const page = chronology.replace(
      "<ul><li><span class=\"biography__text\">2019<br /> <em>First Light, </em>Kukje Gallery, Seoul, Korea</span></li></ul>",
      "<ul><li><span class=\"biography__text\">2019<br /> <em>First Light, </em>Kukje Gallery, Seoul, Korea</span></li><li><span class=\"biography__text\">2020<br /> <em>Second Light, </em>Kukje Gallery, Seoul, Korea</span></li></ul>",
    );
    const research = deps({ fetchDocument: async () => ({ html: page, requests: 1, host: "kukjegallery.com" }) });
    let current = blankJob({ id: "partial", query: "Ada Painter", normalizedQuery: "ada painter", locale: "ko", demandQuality: "REAL_VISITOR", expand: false, now });
    let boundary = false;
    for (let step = 0; step < 8 && current.stage !== "DONE"; step += 1) {
      current = await advanceResearchJob(current, research);
      if (current.payload.publishedIds.length === 1 && current.status === "PARTIAL_RESULT" && current.stage !== "DONE" && current.verifiedFactCount >= 1) {
        boundary = true;
      }
    }
    expect(boundary).toBe(true);
    expect(current.payload.publishedIds).toHaveLength(2);
    expect(current.verifiedFactCount).toBe(2);
    expect(projectResearchJob(current).facts).toHaveLength(2);
    expect(projectResearchJob(current).detail).toContain("현재 기록은 일부입니다.");
  });

  it("retries transient source failures and stops permanent identity failures", () => {
    const job = blankJob({ id: "retry", query: "Ada Painter", normalizedQuery: "ada painter", locale: "en", demandQuality: "REAL_VISITOR", expand: false, now });
    expect(researchStepDisposition({ ...job, failureCode: "SOURCE_RATE_LIMITED" })).toBe("retry");
    expect(researchStepDisposition({ ...job, failureCode: "FETCH_FAILED" })).toBe("retry");
    expect(researchStepDisposition({ ...job, stage: "DONE", status: "NEEDS_REVIEW", failureCode: "IDENTITY_AMBIGUOUS" })).toBe("stop");
    expect(researchStepDisposition({ ...job, stage: "DONE", status: "NOT_FOUND", failureCode: "IDENTITY_NOT_FOUND" })).toBe("stop");
    expect(researchStepDisposition({ ...job, stage: "DONE", status: "SOURCE_BLOCKED", failureCode: "SOURCE_BLOCKED" })).toBe("stop");
    expect(workflowOwned(null)).toBe(false);
    expect(workflowOwned("pending")).toBe(true);
    expect(workflowOwned("wrun_1")).toBe(true);
    expect(workflowClaimAvailable("IDENTITY", null)).toBe(true);
    expect(workflowClaimAvailable("IDENTITY", "")).toBe(true);
    expect(workflowClaimAvailable("IDENTITY", "pending")).toBe(false);
    expect(workflowClaimAvailable("DONE", null)).toBe(false);
    expect(settleWorkflowClaims(2)).toBe(1);
    expect(settleWorkflowClaims(8, "PUBLISH")).toBe(1);
    expect(settleWorkflowClaims(3, "DONE")).toBe(0);
  });

  it("emits each discovery milestone once when a workflow step retries", () => {
    const before = blankJob({ id: "events", query: "Ada Painter", normalizedQuery: "ada painter", locale: "en", demandQuality: "REAL_VISITOR", expand: false, now });
    const progressed = withEvents(before, {
      ...before,
      status: "PARTIAL_RESULT",
      identityStatus: "RESOLVED",
      sourcesFound: 1,
      verifiedFactCount: 1,
      payload: { ...before.payload, stepCount: 1 },
    });
    const retried = withEvents(progressed, {
      ...progressed,
      status: "HISTORY_READY",
      payload: { ...progressed.payload, stepCount: 2 },
    });
    expect(progressed.payload.emitted).toEqual([
      "DISCOVERY_STARTED",
      "DISCOVERY_IDENTITY_RESOLVED",
      "DISCOVERY_SOURCE_FOUND",
      "DISCOVERY_FIRST_FACT_VERIFIED",
      "DISCOVERY_PARTIAL_RESULT",
    ]);
    expect(discoveryEvents(progressed, progressed)).toEqual([]);
    expect(retried.payload.emitted).toEqual([...progressed.payload.emitted, "DISCOVERY_COMPLETED"]);
  });

  it("does not let the browser choose operator demand", () => {
    const route = readFileSync(resolve(__dirname, "../app/api/history/research/route.ts"), "utf8");
    expect(route).toContain("demandWriteClass");
    expect(route).toContain("beginResearchWorkflow");
    expect(route).not.toContain("stepResearchJob");
    expect(route).not.toContain("body.operator");
    const status = readFileSync(resolve(__dirname, "../app/components/history/ResearchStatus.tsx"), "utf8");
    expect(status).not.toContain("/continue");
    expect(status).toContain("visibilitychange");
    const css = readFileSync(resolve(__dirname, "../app/components/history/history.css"), "utf8");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain(".rh-enter");
  });
});
