import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  mergeObservations,
  rosterObservations,
  unresolvedObservations,
  type CandidateObservation,
  type CandidateRecord,
  type ExpansionGraph,
} from "@/lib/history/expansionCandidates";
import { candidateAfterJob, protectCandidateWrite } from "@/lib/history/expansionFeedback";
import { exhibitionFrontiers } from "@/lib/history/exhibitionFrontier";
import { graphDelta, graphHealth } from "@/lib/history/expansionGraphValue";
import { AUTONOMOUS_DEMAND_QUALITY, EXPANSION_DEFAULTS, cooldownDays } from "@/lib/history/expansionPolicy";
import { GRAPH_RANK_WEIGHTS, eligibleForResearch, rankCandidates, selectDailyBatch } from "@/lib/history/expansionRank";
import { mayCreateParticipation } from "@/lib/history/identity";
import { blankJob } from "@/lib/history/researchAdvance";
import { classifyTrustedUrl } from "@/lib/history/trustedCrawl";

const now = new Date("2026-11-09T02:00:00.000Z");
const stamp = now.toISOString();

function observation(label: string, overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    label,
    sourceType: "REAL_VISITOR_DEMAND",
    sourceContext: "USER_SEARCH",
    sourceUrl: null,
    seenAt: stamp,
    demandCount: 0,
    ...overrides,
  };
}

function bridgeGraph(): ExpansionGraph {
  return {
    artists: [
      { slug: "lee-ufan", labels: ["Lee Ufan"], exhibitionIds: ["ex-group", "ex-sparse"] },
      { slug: "park-seo-bo", labels: ["Park Seo-Bo"], exhibitionIds: ["ex-group"] },
      { slug: "chung-sang-hwa", labels: ["Chung Sang-Hwa"], exhibitionIds: ["ex-group"] },
      { slug: "park-hyun-ki", labels: ["Park Hyun-Ki"], exhibitionIds: ["ex-sparse"] },
      { slug: "artist-1", labels: ["Artist One"], exhibitionIds: ["ex-a"] },
      { slug: "artist-2", labels: ["Artist Two"], exhibitionIds: ["ex-a"] },
      { slug: "artist-5", labels: ["Artist Five"], exhibitionIds: ["ex-c"] },
    ],
    exhibitions: [
      { id: "ex-group", title: "Group 2023", year: 2023, space: "Kukje Gallery", artistSlugs: ["lee-ufan", "park-seo-bo", "chung-sang-hwa"] },
      { id: "ex-sparse", title: "Early Video", year: 1979, space: "Gallery Hyundai", artistSlugs: ["park-hyun-ki", "lee-ufan"] },
      { id: "ex-a", title: "Component A", year: 2018, space: "Gallery Hyundai", artistSlugs: ["artist-1", "artist-2"] },
      { id: "ex-c", title: "Component C", year: 2019, space: "Arario Gallery", artistSlugs: ["artist-5"] },
    ],
    unresolved: [
      {
        label: "Artist X",
        exhibitionId: "ex-group",
        exhibitionTitle: "Group 2023",
        artistSlugs: ["lee-ufan", "park-seo-bo", "chung-sang-hwa"],
        sourceUrl: "https://www.kukjegallery.com/exhibitions/group-2023",
      },
      {
        label: "Bridge Y",
        exhibitionId: "ex-a",
        exhibitionTitle: "Component A",
        artistSlugs: ["artist-1", "artist-2"],
        sourceUrl: "https://www.galleryhyundai.com/exhibitions/component-a",
      },
      {
        label: "Bridge Y",
        exhibitionId: "ex-c",
        exhibitionTitle: "Component C",
        artistSlugs: ["artist-5"],
        sourceUrl: "https://www.arariogallery.com/exhibitions/component-c",
      },
    ],
  };
}

function rows(graph: ExpansionGraph, extra: CandidateObservation[] = []): CandidateRecord[] {
  return mergeObservations({
    existing: [],
    observations: [...unresolvedObservations(graph, stamp), ...extra],
    now: stamp,
    observationLimit: 50,
    writeLimit: 50,
  }).rows;
}

function byName(ranked: ReturnType<typeof rankCandidates>, name: string) {
  return ranked.find((row) => row.candidate.displayName === name);
}

describe("exhibition-first graph expansion", () => {
  it("ranks a shared-exhibition participant above roster-only fame and isolated demand", () => {
    const graph = bridgeGraph();
    const ranked = rankCandidates({
      candidates: rows(graph, [
        observation("Famous Roster", { sourceType: "GALLERY_ROSTER", sourceContext: "DAILY_EXPANSION", sourceUrl: "https://www.kukjegallery.com/artists/famous-roster", demandCount: 0 }),
        observation("KAWS", { demandCount: 30 }),
      observation("Quiet Painter", { sourceType: "IDENTITY_DISCOVERY", sourceContext: "DAILY_EXPANSION", demandCount: 0 }),
      observation("Park Hyun-Ki", {
        sourceType: "SPARSE_EXISTING_ARTIST",
        sourceContext: "GRAPH_FRONTIER",
        existingArtistSlug: "park-hyun-ki",
        exhibitionCount: 1,
        sharedExistingArtists: ["lee-ufan"],
      }),
    ]),
      graph,
      now,
    });
    const artistX = byName(ranked, "Artist X");
    const roster = byName(ranked, "Famous Roster");
    const kaws = byName(ranked, "KAWS");
    const park = byName(ranked, "Park Hyun-Ki");
    const quiet = byName(ranked, "Quiet Painter");
    expect(artistX?.researchReason).toBe("SHARED_EXHIBITION_FRONTIER");
    expect(artistX?.bridge.potentialPaths).toBe(3);
    expect(artistX?.score ?? 0).toBeGreaterThan(roster?.score ?? 0);
    expect(artistX?.score ?? 0).toBeGreaterThan(kaws?.score ?? 0);
    expect(kaws?.score ?? 0).toBeGreaterThan(quiet?.score ?? 0);
    expect(park?.researchReason).toBe("SPARSE_ARTIST");
    expect(park?.bridge.potentialPaths).toBe(0);
    expect(park?.bridge.existingArtistLinks).toBe(1);
    expect(park?.score ?? 0).toBeGreaterThan(quiet?.score ?? 0);
    expect(artistX?.score ?? 0).toBeGreaterThan(park?.score ?? 0);
    expect(park?.score ?? 0).toBeGreaterThan(roster?.score ?? 0);
    const again = rankCandidates({ candidates: rows(graph, [
      observation("Famous Roster", { sourceType: "GALLERY_ROSTER", sourceContext: "DAILY_EXPANSION", sourceUrl: "https://www.kukjegallery.com/artists/famous-roster", demandCount: 0 }),
      observation("KAWS", { demandCount: 30 }),
      observation("Quiet Painter", { sourceType: "IDENTITY_DISCOVERY", sourceContext: "DAILY_EXPANSION", demandCount: 0 }),
      observation("Park Hyun-Ki", {
        sourceType: "SPARSE_EXISTING_ARTIST",
        sourceContext: "GRAPH_FRONTIER",
        existingArtistSlug: "park-hyun-ki",
        exhibitionCount: 1,
        sharedExistingArtists: ["lee-ufan"],
      }),
    ]), graph, now });
    expect(again.map((row) => [row.candidate.normalizedName, row.score])).toEqual(ranked.map((row) => [row.candidate.normalizedName, row.score]));
  });

  it("gives a component bridge a higher score than the same number of links inside one component", () => {
    const graph = bridgeGraph();
    const ranked = rankCandidates({ candidates: rows(graph), graph, now });
    const bridge = byName(ranked, "Bridge Y");
    const single = ranked.find((row) => row.candidate.displayName === "Bridge Y" && row.bridge.existingArtistLinks === 2 && !row.bridge.connectsComponents);
    expect(bridge?.researchReason).toBe("GRAPH_BRIDGE_CANDIDATE");
    expect(bridge?.bridge.connectsComponents).toBe(true);
    expect(bridge?.bridge.existingArtistLinks).toBe(3);
    expect(single).toBeUndefined();
    const inside = byName(ranked, "Artist X");
    expect(inside?.bridge.connectsComponents).toBe(false);
    expect(bridge?.score ?? 0).toBeGreaterThan(inside?.score ?? 0);
  });

  it("does not let the sparse quota displace higher-scoring exhibition bridges", () => {
    const graph = bridgeGraph();
    const frontiers = Array.from({ length: 10 }, (_, index) => ({
      label: `Frontier Painter ${index + 1}`,
      exhibitionId: "ex-group",
      exhibitionTitle: "Group 2023",
      artistSlugs: ["lee-ufan", "park-seo-bo", "chung-sang-hwa"],
      sourceUrl: "https://www.kukjegallery.com/exhibitions/group-2023",
    }));
    const sparse = Array.from({ length: 10 }, (_, index) => observation(`Sparse Painter ${index + 1}`, {
      sourceType: "SPARSE_EXISTING_ARTIST",
      sourceContext: "GRAPH_FRONTIER",
      existingArtistSlug: `sparse-${index + 1}`,
      exhibitionCount: 1,
      demandCount: 0,
    }));
    const graphWithSparse: ExpansionGraph = {
      ...graph,
      artists: [
        ...graph.artists,
        ...sparse.map((row, index) => ({ slug: `sparse-${index + 1}`, labels: [row.label], exhibitionIds: [`solo-${index + 1}`] })),
      ],
      exhibitions: graph.exhibitions.concat(sparse.map((row, index) => ({ id: `solo-${index + 1}`, title: `Solo ${index + 1}`, year: 2001, space: null, artistSlugs: [`sparse-${index + 1}`] }))),
      unresolved: frontiers,
    };
    const ranked = rankCandidates({ candidates: rows(graphWithSparse, sparse), graph: graphWithSparse, now });
    const batch = selectDailyBatch({ ranked, researchLimit: 10, sparseShare: 0.3, fetchLimit: 120 });
    expect(batch.limit).toBe(10);
    expect(batch.configuredSparseShare).toBe(0.3);
    expect(batch.selected.every((row) => row.researchReason === "SHARED_EXHIBITION_FRONTIER" || row.researchReason === "GRAPH_BRIDGE_CANDIDATE")).toBe(true);
    expect(batch.sparseSlots).toBe(0);
    expect(batch.selected).toHaveLength(10);
  });

  it("keeps the daily research and fetch budgets", () => {
    expect(EXPANSION_DEFAULTS.dailyResearchLimit).toBe(10);
    expect(EXPANSION_DEFAULTS.dailyFetchLimit).toBe(120);
    expect(EXPANSION_DEFAULTS.maxChildCandidates).toBe(20);
    const graph = bridgeGraph();
    const ranked = rankCandidates({ candidates: rows(graph), graph, now });
    const tight = selectDailyBatch({ ranked, researchLimit: 10, sparseShare: 0.3, fetchLimit: 16 });
    expect(tight.limit).toBe(2);
    expect(tight.selected).toHaveLength(2);
    expect(tight.selected.reduce((sum, row) => sum + row.estimatedFetches, 0)).toBeLessThanOrEqual(16);
  });

  it("does not create an artist from an unresolved name or a non-explicit participant", () => {
    const graph = bridgeGraph();
    const merged = rows(graph);
    const artistX = merged.find((row) => row.displayName === "Artist X");
    expect(artistX?.resolvedArtistId).toBeNull();
    expect(artistX?.status).toBe("NEW");
    expect(mayCreateParticipation("EXPLICIT_PARTICIPANT")).toBe(true);
    expect(mayCreateParticipation("TITLE_ONLY")).toBe(false);
    expect(mayCreateParticipation("AMBIGUOUS")).toBe(false);
    expect(mayCreateParticipation("NOT_PARTICIPANT")).toBe(false);
    const participants = Array.from({ length: 20 }, (_, index) => ({
      label: `Child Painter ${index + 1}`,
      evidence: "EXPLICIT_PARTICIPANT" as const,
      identity: "UNRESOLVED" as const,
      slug: null,
    }));
    const children = rosterObservations({
      facts: [{
        pilotRecordId: "ex-group",
        title: "Group 2023",
        provenance: { sourceUrl: "https://www.kukjegallery.com/exhibitions/group-2023", sourceName: "Kukje Gallery" },
        participants,
      }] as unknown as Parameters<typeof rosterObservations>[0]["facts"],
      viaArtistSlug: "lee-ufan",
      existingSlugs: ["lee-ufan"],
      seenAt: stamp,
      limit: 5,
    });
    expect(children).toHaveLength(5);
    expect(children.every((row) => row.sourceType === "GROUP_ROSTER")).toBe(true);
  });

  it("holds an ambiguous identity out of publication and preserves cooldown", () => {
    const graph = bridgeGraph();
    const person = rows(graph, [observation("Nara Kim")])[0];
    expect(person).toBeTruthy();
    if (!person) return;
    const ambiguous = blankJob({ id: "job-amb", query: "Nara Kim", normalizedQuery: "nara kim", locale: "en", demandQuality: AUTONOMOUS_DEMAND_QUALITY, expand: false, now });
    ambiguous.stage = "DONE";
    ambiguous.status = "NEEDS_REVIEW";
    ambiguous.failureCode = "IDENTITY_AMBIGUOUS";
    ambiguous.completedAt = stamp;
    ambiguous.resolvedArtistId = null;
    const after = candidateAfterJob(person, ambiguous, now);
    expect(after.status).toBe("IDENTITY_AMBIGUOUS");
    expect(after.resolvedArtistId).toBeNull();
    expect(after.payload.graphYield?.published).toBe(false);
    expect(after.payload.graphYield?.noResultReason).toBe("IDENTITY_AMBIGUOUS");
    expect(eligibleForResearch(after, now)).toBe(false);
    expect(cooldownDays("IDENTITY_NOT_FOUND")).toBe(60);
    expect(cooldownDays("NO_TRUSTED_SOURCE")).toBe(30);
    const researching = { ...person, status: "RESEARCHING" as const, researchJobId: ambiguous.id };
    expect(protectCandidateWrite(after, researching)).toBe(after);
    expect(classifyTrustedUrl("https://example.com/artist")).toBeNull();
    expect(classifyTrustedUrl("https://www.kukjegallery.com/exhibitions/group-2023")?.sourceName).toBe("Kukje Gallery");
  });

  it("measures bridge paths only from shared exhibitions", () => {
    const before = graphHealth({
      artists: [
        { slug: "a", labels: ["A"], exhibitionIds: ["solo-a"] },
        { slug: "b", labels: ["B"], exhibitionIds: ["solo-b"] },
      ],
      exhibitions: [
        { id: "solo-a", title: "Solo A", year: 2020, space: null, artistSlugs: ["a"] },
        { id: "solo-b", title: "Solo B", year: 2021, space: null, artistSlugs: ["b"] },
      ],
      unresolved: [],
    });
    expect(before.bridgePathCount).toBe(0);
    expect(before.artistsDegreeAtLeast1).toBe(0);
    expect(before.connectedComponents).toBe(2);
    expect(before.isolatedArtists).toBe(2);
    const after = graphHealth({
      artists: [
        { slug: "a", labels: ["A"], exhibitionIds: ["solo-a", "shared"] },
        { slug: "b", labels: ["B"], exhibitionIds: ["solo-b", "shared"] },
      ],
      exhibitions: [
        { id: "solo-a", title: "Solo A", year: 2020, space: null, artistSlugs: ["a"] },
        { id: "solo-b", title: "Solo B", year: 2021, space: null, artistSlugs: ["b"] },
        { id: "shared", title: "Shared", year: 2024, space: "Kukje Gallery", artistSlugs: ["a", "b"] },
      ],
      unresolved: [{ label: "Artist X", exhibitionId: "shared", exhibitionTitle: "Shared", artistSlugs: ["a", "b"], sourceUrl: null }],
    });
    const delta = graphDelta(before, after);
    expect(delta.bridgePathCount).toBe(1);
    expect(delta.connectedComponents).toBe(-1);
    expect(after.artistsDegreeAtLeast1).toBe(2);
    expect(after.historyReady).toBe(0);
    expect(after.lowDensity).toBe(2);
    const frontiers = exhibitionFrontiers({
      artists: after.publicExhibitionCount ? [] : [],
      exhibitions: [],
      unresolved: [],
    });
    expect(frontiers).toEqual([]);
    const realFrontiers = exhibitionFrontiers(bridgeGraph());
    expect(realFrontiers.some((row) => row.exhibitionId === "ex-group" && row.unresolvedLabels.includes("Artist X"))).toBe(true);
  });

  it("stops one source family from filling the batch when a close alternative exists", () => {
    const graph: ExpansionGraph = { artists: [], exhibitions: [], unresolved: [] };
    const kukje = Array.from({ length: 10 }, (_, index) => observation(`Kukje Painter ${index + 1}`, {
      sourceType: "GALLERY_ROSTER",
      sourceContext: "DAILY_EXPANSION",
      sourceUrl: `https://www.kukjegallery.com/artists/kukje-${index + 1}`,
      demandCount: 1,
    }));
    const hyundai = Array.from({ length: 4 }, (_, index) => observation(`Hyundai Painter ${index + 1}`, {
      sourceType: "GALLERY_ROSTER",
      sourceContext: "DAILY_EXPANSION",
      sourceUrl: `https://www.galleryhyundai.com/artists/hyundai-${index + 1}`,
      demandCount: 0,
    }));
    const ranked = rankCandidates({
      candidates: mergeObservations({ existing: [], observations: [...kukje, ...hyundai], now: stamp, observationLimit: 20, writeLimit: 20 }).rows,
      graph,
      now,
    });
    const batch = selectDailyBatch({ ranked, researchLimit: 10, sparseShare: 0.3, fetchLimit: 120 });
    const kukjeCount = batch.selected.filter((row) => row.candidate.sourceHost === "kukjegallery.com").length;
    const hyundaiCount = batch.selected.filter((row) => row.candidate.sourceHost === "galleryhyundai.com").length;
    expect(batch.selected).toHaveLength(10);
    expect(kukjeCount).toBeLessThanOrEqual(6);
    expect(hyundaiCount).toBe(4);
  });

  it("does not rank by fame and does not treat Wikidata as exhibition provenance", () => {
    expect(Object.keys(GRAPH_RANK_WEIGHTS).join(" ")).not.toMatch(/fame|follower|auction|celebrity/);
    expect(GRAPH_RANK_WEIGHTS.explicitParticipant).toBeGreaterThan(GRAPH_RANK_WEIGHTS.galleryRoster);
    const documentedBridge = GRAPH_RANK_WEIGHTS.explicitParticipant + GRAPH_RANK_WEIGHTS.sharedExhibitionFrontier + GRAPH_RANK_WEIGHTS.componentBridge;
    const cappedDemand = GRAPH_RANK_WEIGHTS.visitorDemandType + GRAPH_RANK_WEIGHTS.demandPerSearch * GRAPH_RANK_WEIGHTS.demandCap;
    expect(documentedBridge).toBeGreaterThan(cappedDemand);
    const wikidata = readFileSync(resolve("lib/history/wikidataIdentity.ts"), "utf8");
    expect(wikidata).toMatch(/not exhibition provenance/i);
  });
});
