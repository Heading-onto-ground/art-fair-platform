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
  reuseDecision,
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

  it("does not let the browser choose operator demand", () => {
    const route = readFileSync(resolve(__dirname, "../app/api/history/research/route.ts"), "utf8");
    expect(route).toContain("demandWriteClass");
    expect(route).not.toContain("body.operator");
    const css = readFileSync(resolve(__dirname, "../app/components/history/history.css"), "utf8");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain(".rh-enter");
  });
});
