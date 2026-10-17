import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { buildGraphFrontier, type GrowthSnapshot } from "@/lib/history/growth";
import {
  rankAutopilotFrontier,
  selectAutopilotBatch,
  summarizePublicGraph,
  watchFrontierPlacement,
} from "@/lib/history/frontierAutopilot";

const snapshot: GrowthSnapshot = {
  artists: [
    { slug: "park-seo-bo", labels: ["Park Seo-Bo"], exhibitionIds: ["shared"] },
    { slug: "lee-ufan", labels: ["Lee Ufan"], exhibitionIds: ["shared"] },
    { slug: "sparse-one", labels: ["Sparse One"], exhibitionIds: ["shared"] },
    { slug: "bowon-han", labels: ["Bowon Han"], exhibitionIds: ["solo"] },
    { slug: "youn-myeungro", labels: ["Youn Myeungro"], exhibitionIds: ["solo-youn"] },
  ],
  exhibitions: [
    { id: "shared", title: "Shared", year: 2005, space: "Kukje Gallery", city: "Seoul", artistSlugs: ["park-seo-bo", "lee-ufan", "sparse-one"] },
    { id: "solo", title: "Solo", year: 2010, space: null, city: null, artistSlugs: ["bowon-han"] },
    { id: "solo-youn", title: "Youn Solo", year: 2012, space: null, city: null, artistSlugs: ["youn-myeungro"] },
    { id: "named", title: "Named", year: 2014, space: null, city: null, artistSlugs: ["park-seo-bo", "lee-ufan"] },
  ],
  unresolved: [
    { label: "Kim, Guirin", exhibitionTitle: "Named" },
    { label: "Kim, Guirin", exhibitionTitle: "Shared" },
    { label: "Once Only", exhibitionTitle: "Named" },
  ],
};

describe("frontier autopilot ranking", () => {
  it("ranks from the graph and does not equate a comma spelling with another artist", () => {
    const rows = buildGraphFrontier({
      snapshot,
      demand: [
        { query: "Kim, Guirin", count: 2 },
        { query: "someone new", count: 4 },
      ],
    });
    const ranked = rankAutopilotFrontier({
      rows,
      snapshot,
      ambiguousArtists: ["Kim, Guirin"],
    });
    const again = rankAutopilotFrontier({ rows, snapshot, ambiguousArtists: ["Kim, Guirin"] });
    expect(ranked.map((row) => `${row.rank}:${row.artist}:${row.score}`)).toEqual(again.map((row) => `${row.rank}:${row.artist}:${row.score}`));
    expect(ranked.some((row) => row.artist === "kim-guiline")).toBe(false);
    const guirin = ranked.find((row) => row.artist === "Kim, Guirin");
    expect(guirin?.frontierType).toBe("UNRESOLVED_PARTICIPANT");
    expect(guirin?.explanation.some((line) => line.includes("ambiguous identity"))).toBe(true);
    expect(guirin?.explanation.some((line) => line.includes("appears 2 times"))).toBe(true);
    const sparse = ranked.find((row) => row.artist === "sparse-one");
    const isolated = ranked.find((row) => row.artist === "bowon-han");
    expect(sparse && isolated && sparse.score > isolated.score).toBe(true);
    expect(JSON.stringify(ranked)).not.toMatch(/fame|market value/i);
    const watched = watchFrontierPlacement(ranked);
    expect(watched.find((row) => row.name === "Youn Myeungro")?.frontierType).toBe("ISOLATED_ARTIST");
    expect(watched.find((row) => row.name === "Kim Hyung Dae")?.rank).toBeNull();
    expect(selectAutopilotBatch(ranked, 8).length).toBeGreaterThanOrEqual(5);
    expect(selectAutopilotBatch(ranked, 100).length).toBeLessThanOrEqual(10);
  });

  it("counts the public graph without a fame rank", () => {
    const counts = summarizePublicGraph(snapshot, 1);
    expect(counts.publicArtists).toBe(5);
    expect(counts.publicExhibitions).toBe(4);
    expect(counts.sharedExhibitions).toBe(2);
    expect(counts.largestConnectedComponent).toBe(3);
    expect(counts.isolatedPublicArtists).toBe(2);
    expect(counts.unresolvedParticipantLabels).toBe(2);
    expect(counts.directArtistPairs).toBe(3);
    expect(counts.documentedTwoHopPaths).toBe(1);
  });

  it("refuses a production write from the dry-run entry", () => {
    const entry = readFileSync(path.resolve("scripts/frontier-autopilot.ts"), "utf8");
    const runner = readFileSync(path.resolve("scripts/frontierAutopilotRun.ts"), "utf8");
    expect(entry).toContain("PRODUCTION_WRITE_DISABLED");
    expect(runner).not.toContain("import-growth-batch");
    expect(runner).toContain("imported: false");
  });
});
