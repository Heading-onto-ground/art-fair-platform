import { describe, expect, it } from "vitest";
import { nextExplorationDepth } from "@/lib/history/analytics";
import {
  buildGraphFrontier,
  duplicateDecision,
  normalizeFactTitle,
  previewCandidates,
  resolveVerifiedSpace,
  type FactualCandidate,
  type GrowthSnapshot,
} from "@/lib/history/growth";
import { buildDocumentedPaths, selectDiversePaths } from "@/lib/history/paths";

const candidate = (patch: Partial<FactualCandidate>): FactualCandidate => ({
  artistNames: ["Kim Guiline", "Park Seo-Bo"],
  title: "The Art of Dansaekhwa",
  startYear: 2014,
  startMonth: null,
  startDay: null,
  endYear: null,
  endMonth: null,
  endDay: null,
  datePrecision: "YEAR",
  space: "Kukje Gallery",
  city: "Seoul",
  country: "South Korea",
  curatorNames: [],
  sourceName: "Kukje Gallery",
  sourceUrl: "https://www.kukjegallery.com/exhibitions/view?seq=168",
  retrievedAt: "2026-10-12",
  evidenceShort: "Participated artists include Kim Guiline and Park Seo-Bo.",
  externalIds: [],
  pilotRecordId: "kukje-2014",
  ...patch,
});

const snapshot: GrowthSnapshot = {
  artists: [
    { slug: "park-seo-bo", labels: ["Park Seo-Bo"], exhibitionIds: ["show-1"] },
    { slug: "lee-ufan", labels: ["Lee Ufan"], exhibitionIds: ["show-1"] },
    { slug: "kim-guiline", labels: ["Kim Guiline", "김기린"], exhibitionIds: [] },
    { slug: "bowon-han", labels: ["Bowon Han"], exhibitionIds: ["solo"] },
  ],
  exhibitions: [
    {
      id: "show-1",
      title: "The Art of Dansaekhwa",
      year: 2014,
      space: "Kukje Gallery",
      city: "Seoul",
      artistSlugs: ["park-seo-bo", "lee-ufan"],
    },
    {
      id: "solo",
      title: "A Separate Show",
      year: 2026,
      space: "Other Room",
      city: "Seoul",
      artistSlugs: ["bowon-han"],
    },
  ],
  unresolved: [{ label: "Kim, Guirin", exhibitionTitle: "Das Koreanische Monochrom" }],
};

describe("growth ingestion", () => {
  it("treats punctuation as the same title and refuses an uncertain venue", () => {
    expect(normalizeFactTitle("The Art of Dansaekhwa!")).toBe("the art of dansaekhwa");
    expect(duplicateDecision(candidate({}), snapshot.exhibitions[0])).toBe("EXACT");
    expect(duplicateDecision(candidate({ space: "Another Gallery" }), snapshot.exhibitions[0])).toBe("REVIEW");
    expect(duplicateDecision(candidate({ title: "A Different Exhibition" }), snapshot.exhibitions[0])).toBe("NEW");
    expect(resolveVerifiedSpace("Hyundai Gallery")?.canonicalName).toBe("Gallery Hyundai");
    expect(resolveVerifiedSpace("Kukje Gallery Seoul")).toBeNull();
  });

  it("scores an enrichment that brings a new artist onto an existing exhibition", () => {
    const [preview] = previewCandidates([candidate({})], snapshot);
    expect(preview.decision).toBe("EXACT");
    expect(preview.resolved).toEqual(["kim-guiline", "park-seo-bo"]);
    expect(preview.value.newExhibition).toBe(false);
    expect(preview.value.newArtist).toBe(true);
    expect(preview.value.newArtistPairCount).toBeGreaterThan(0);
  });

  it("keeps comma spellings and builds a frontier without an importance rank", () => {
    const frontier = buildGraphFrontier({
      snapshot,
      demand: [
        { query: "kim, guirin", count: 2 },
        { query: "park seo-bo", count: 4 },
        { query: "someone new", count: 1 },
      ],
    });
    const guirin = frontier.find((row) => row.artist === "Kim, Guirin" && row.reason === "UNRESOLVED_PARTICIPANT");
    expect(guirin?.searchDemand).toBe(2);
    expect(frontier.some((row) => row.artist === "kim, guirin")).toBe(false);
    expect(frontier.some((row) => row.artist === "park seo-bo")).toBe(false);
    expect(frontier.some((row) => row.reason === "ISOLATED_ARTIST" && row.artist === "bowon-han")).toBe(true);
    expect(frontier.some((row) => row.reason === "SEARCHED_MISSING_ARTIST" && row.artist === "someone new" && row.searchDemand === 1)).toBe(true);
    expect(frontier.map((row) => row.artist)).not.toContain("importance");
  });
});

describe("path diversity", () => {
  it("does not fill the list with one repeated start when another start exists", () => {
    const routes = buildDocumentedPaths(
      [
        {
          id: "a",
          slug: "a",
          title: "Shared One",
          year: 2014,
          artists: [
            { slug: "chung-sang-hwa", name: "Chung Sang-Hwa" },
            { slug: "ha-chong-hyun", name: "Ha Chong-Hyun" },
            { slug: "kim-guiline", name: "Kim Guiline" },
          ],
        },
        {
          id: "b",
          slug: "b",
          title: "Shared Two",
          year: 2005,
          artists: [
            { slug: "ha-chong-hyun", name: "Ha Chong-Hyun" },
            { slug: "park-seo-bo", name: "Park Seo-Bo" },
            { slug: "lee-ufan", name: "Lee Ufan" },
          ],
        },
      ],
      20,
    );
    const picked = selectDiversePaths(routes, 4);
    const starts = new Set(picked.map((route) => route.artists[0]?.slug));
    expect(starts.size).toBeGreaterThan(1);
  });

  it("keeps a readable path when older exhibitions have long titles", () => {
    const paths = buildDocumentedPaths([
      {
        id: "long",
        slug: "long",
        title: "A very long exhibition title that exceeds forty two characters easily",
        year: 1992,
        artists: [
          { slug: "ha-chong-hyun", name: "Ha Chong-Hyun" },
          { slug: "park-seo-bo", name: "Park Seo-Bo" },
        ],
      },
      {
        id: "also-long",
        slug: "also-long",
        title: "Also long enough to exceed the forty two character limit now",
        year: 1994,
        artists: [
          { slug: "park-seo-bo", name: "Park Seo-Bo" },
          { slug: "lee-ufan", name: "Lee Ufan" },
        ],
      },
      {
        id: "one",
        slug: "one",
        title: "Short One",
        year: 2012,
        artists: [
          { slug: "ha-chong-hyun", name: "Ha Chong-Hyun" },
          { slug: "chung-sang-hwa", name: "Chung Sang-Hwa" },
        ],
      },
      {
        id: "two",
        slug: "two",
        title: "Short Two",
        year: 2023,
        artists: [
          { slug: "chung-sang-hwa", name: "Chung Sang-Hwa" },
          { slug: "yun-hyong-keun", name: "Yun Hyong-keun" },
        ],
      },
    ], 1);
    expect(paths).toHaveLength(1);
    expect(paths[0]?.exhibitions.every((show) => show.title.length <= 42)).toBe(true);
  });
});

describe("exploration depth", () => {
  it("counts a new artist and ignores a repeat", () => {
    const first = nextExplorationDepth([], "lee-ufan");
    const second = nextExplorationDepth(first.seen, "park-seo-bo");
    const repeat = nextExplorationDepth(second.seen, "lee-ufan");
    expect(first.depth).toBe(1);
    expect(second.depth).toBe(2);
    expect(repeat.depth).toBe(2);
  });
});
