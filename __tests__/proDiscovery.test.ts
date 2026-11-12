import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { isFactualUseOk, isHistoryEvent, recordIsPublic } from "@/lib/history/policy";
import { isProDiscoveryEnabled } from "@/lib/pro/discoveryFlag";
import {
  buildDiscoveryGraph,
  DISCOVERY_CARD_KEYS,
  DISCOVERY_COPY,
  discoverArtists,
  discoveryHref,
  isPublicGraphExhibition,
  overlapsWindow,
  parseDiscoveryRequest,
  recentWindow,
  type DiscoveryEntityRow,
  type DiscoveryExhibition,
  type DiscoveryExhibitionRow,
} from "@/lib/pro/discoveryPolicy";

const NOW = new Date(Date.UTC(2026, 10, 12));
const kukje = { id: "space-kukje", name: "Kukje Gallery", city: "Seoul", country: "Korea", slug: "kukje" };
const busan = { id: "space-busan", name: "Busan Space", city: "Busan", country: null, slug: "busan-space" };

function artist(
  id: string,
  slug: string,
  canonicalName: string,
  nativeName: string | null = null,
  extras?: Partial<DiscoveryEntityRow>,
): DiscoveryEntityRow {
  return { id, slug, canonicalName, nativeName, profileId: null, aliases: [], ...extras };
}

function show(partial: Partial<DiscoveryExhibitionRow> & { id: string; artistIds?: string[] }): DiscoveryExhibitionRow {
  const { artistIds = [], ...rest } = partial;
  return {
    title: rest.id,
    isPublic: true,
    createdBy: null,
    startDate: null,
    endDate: null,
    city: null,
    country: null,
    space: null,
    slug: rest.id,
    datePrecision: "YEAR",
    startYear: 2024,
    startMonth: null,
    startDay: null,
    endYear: null,
    endMonth: null,
    endDay: null,
    publicationStatus: "PUBLIC",
    origin: "ROB_RESEARCHED",
    sourceClearance: "APPROVED",
    limitedFactualSource: false,
    confirmedProfileIds: [],
    ...rest,
    participantEntityIds: artistIds,
  };
}

function slugs(query: string, rows: DiscoveryExhibitionRow[], entities: DiscoveryEntityRow[], pageSize?: number) {
  const graph = buildDiscoveryGraph(rows, entities);
  const applied = parseDiscoveryRequest(new URLSearchParams(query));
  return discoverArtists(graph, applied, { now: NOW, pageSize });
}

const lee = artist("a", "lee-ufan", "Lee Ufan", "이우환");
const park = artist("b", "park-seo-bo", "Park Seo-Bo", "박서보");
const other = artist("c", "unrelated", "Unrelated Artist", "무관");
const entities = [lee, park, other];
const rows = [
  show({ id: "x", title: "Shared X", artistIds: ["a", "b"], city: "Seoul", country: "Korea", space: kukje, startYear: 2024 }),
  show({ id: "y", title: "Solo Y", artistIds: ["a"], city: "Seoul", country: "대한민국", space: kukje, startYear: 2025 }),
  show({
    id: "z",
    title: "Solo Z",
    artistIds: ["a"],
    city: "Seoul",
    space: kukje,
    startYear: 2026,
    origin: "ARTIST_SUBMITTED",
    sourceClearance: "NOT_APPLICABLE",
  }),
  show({ id: "w", title: "Busan W", artistIds: ["c"], city: "Busan", space: busan, startYear: 2010 }),
  show({
    id: "draft",
    title: "Hidden draft",
    artistIds: ["a", "c"],
    city: "Seoul",
    startYear: 2026,
    publicationStatus: "DRAFT",
    sourceClearance: "REVIEW_REQUIRED",
  }),
];

describe("gallery discovery foundation", () => {
  it("matches Artist World's public exhibition decision", () => {
    const samples = [
      { isPublic: true, createdBy: "profile", publicationStatus: null, origin: null, sourceClearance: null, limitedFactualSource: false },
      { isPublic: true, createdBy: null, publicationStatus: null, origin: null, sourceClearance: null, limitedFactualSource: false },
      { isPublic: false, createdBy: "profile", publicationStatus: "PUBLIC", origin: "ROB_RESEARCHED", sourceClearance: "APPROVED", limitedFactualSource: false },
      { isPublic: true, createdBy: null, publicationStatus: "PUBLIC", origin: "ROB_RESEARCHED", sourceClearance: "APPROVED", limitedFactualSource: false },
      { isPublic: true, createdBy: null, publicationStatus: "PUBLIC", origin: "ROB_RESEARCHED", sourceClearance: "REVIEW_REQUIRED", limitedFactualSource: false },
      { isPublic: true, createdBy: null, publicationStatus: "PUBLIC", origin: "ROB_RESEARCHED", sourceClearance: "REVIEW_REQUIRED", limitedFactualSource: true },
      { isPublic: true, createdBy: null, publicationStatus: "PUBLIC", origin: "ROB_RESEARCHED", sourceClearance: "REJECTED", limitedFactualSource: true },
      { isPublic: true, createdBy: null, publicationStatus: "PENDING_REVIEW", origin: "ARTIST_SUBMITTED", sourceClearance: "NOT_APPLICABLE", limitedFactualSource: false },
      { isPublic: true, createdBy: null, publicationStatus: "PUBLIC", origin: "ARTIST_SUBMITTED", sourceClearance: "NOT_APPLICABLE", limitedFactualSource: false },
      { isPublic: true, createdBy: null, publicationStatus: "DRAFT", origin: "ROB_RESEARCHED", sourceClearance: "APPROVED", limitedFactualSource: false },
      { isPublic: true, createdBy: null, publicationStatus: "REJECTED", origin: "GALLERY_SUBMITTED", sourceClearance: "APPROVED", limitedFactualSource: false },
    ] as const;
    for (const sample of samples) {
      const artistWorld = !sample.publicationStatus && !sample.origin
        ? sample.isPublic && Boolean(sample.createdBy)
        : sample.isPublic &&
          recordIsPublic({
            publicationStatus: sample.publicationStatus ?? "DRAFT",
            origin: sample.origin ?? "ROB_RESEARCHED",
            sourceClearance: sample.sourceClearance ?? "REVIEW_REQUIRED",
            internalUseDecision: sample.limitedFactualSource ? "FACTUAL_USE_OK" : null,
            contentScope: sample.limitedFactualSource ? "FACTUAL_METADATA_ONLY" : null,
          });
      expect(isPublicGraphExhibition({ ...sample, limitedFactualSource: sample.limitedFactualSource })).toBe(artistWorld);
    }
    expect(isFactualUseOk("FACTUAL_USE_OK")).toBe(true);
    expect(isFactualUseOk("ALLOW_LIMITED")).toBe(true);
    expect(
      recordIsPublic({
        publicationStatus: "PUBLIC",
        origin: "ROB_RESEARCHED",
        sourceClearance: "REVIEW_REQUIRED",
        internalUseDecision: "FACTUAL_USE_OK",
        contentScope: "FACTUAL_METADATA_ONLY",
      }),
    ).toBe(true);
  });

  it("keeps the public exhibition rule", () => {
    expect(isPublicGraphExhibition({ isPublic: true, createdBy: "profile", publicationStatus: null, origin: null, sourceClearance: null, limitedFactualSource: false })).toBe(true);
    expect(isPublicGraphExhibition({ isPublic: true, createdBy: null, publicationStatus: null, origin: null, sourceClearance: null, limitedFactualSource: false })).toBe(false);
    expect(isPublicGraphExhibition({ isPublic: false, createdBy: "profile", publicationStatus: "PUBLIC", origin: "ROB_RESEARCHED", sourceClearance: "APPROVED", limitedFactualSource: false })).toBe(false);
    expect(isPublicGraphExhibition({ isPublic: true, createdBy: null, publicationStatus: "PUBLIC", origin: "ROB_RESEARCHED", sourceClearance: "APPROVED", limitedFactualSource: false })).toBe(true);
    expect(isPublicGraphExhibition({ isPublic: true, createdBy: null, publicationStatus: "PUBLIC", origin: "ROB_RESEARCHED", sourceClearance: "REVIEW_REQUIRED", limitedFactualSource: false })).toBe(false);
    expect(isPublicGraphExhibition({ isPublic: true, createdBy: null, publicationStatus: "PUBLIC", origin: "ROB_RESEARCHED", sourceClearance: "REVIEW_REQUIRED", limitedFactualSource: true })).toBe(true);
    expect(isPublicGraphExhibition({ isPublic: true, createdBy: null, publicationStatus: "PUBLIC", origin: "ROB_RESEARCHED", sourceClearance: "REJECTED", limitedFactualSource: true })).toBe(false);
    expect(isPublicGraphExhibition({ isPublic: true, createdBy: null, publicationStatus: "PENDING_REVIEW", origin: "ARTIST_SUBMITTED", sourceClearance: "NOT_APPLICABLE", limitedFactualSource: false })).toBe(false);
    expect(isPublicGraphExhibition({ isPublic: true, createdBy: null, publicationStatus: "PUBLIC", origin: "ARTIST_SUBMITTED", sourceClearance: "NOT_APPLICABLE", limitedFactualSource: false })).toBe(true);
  });

  it("returns only artists who share a public exhibition", () => {
    const found = slugs("connected=lee-ufan", rows, entities);
    expect(found.status).toBe("ok");
    expect(found.cards.map((card) => card.slug)).toEqual(["park-seo-bo"]);
    expect(found.cards[0].reasons).toContain("이우환과 확인된 공동 전시 1건");
    expect(found.cards[0].sharedExhibitions.map((exhibition) => exhibition.title)).toEqual(["Shared X"]);
    expect(found.cards[0].sharedExhibitions[0].year).toBe(2024);
    expect(found.cards[0].connectionCount).toBe(1);
  });

  it("resolves a connected artist by native name and does not guess when names collide", () => {
    expect(slugs("connected=이우환", rows, entities).cards.map((card) => card.slug)).toEqual(["park-seo-bo"]);
    const twin = artist("a2", "lee-ufan-2", "Lee Ufan", "이우환");
    const collided = slugs("connected=Lee Ufan", rows, [...entities, twin]);
    expect(collided.status).toBe("ambiguous_artist");
    expect(collided.cards).toEqual([]);
    expect(slugs("connected=lee-ufan", rows, [...entities, twin]).cards.map((card) => card.slug)).toEqual(["park-seo-bo"]);
  });

  it("filters city and country from exhibition or space facts, not artist residence", () => {
    const seoul = slugs("city=Seoul", rows, entities);
    expect(seoul.cards.map((card) => card.slug).sort()).toEqual(["lee-ufan", "park-seo-bo"]);
    expect(seoul.cards.find((card) => card.slug === "lee-ufan")?.reasons.some((reason) => reason.includes("서울에서") || reason.includes("Seoul에서"))).toBe(true);
    expect(slugs("city=Seoulite", rows, entities).cards).toEqual([]);
    expect(slugs("city=Busan", rows, entities).cards.map((card) => card.slug)).toEqual(["unrelated"]);
    expect(slugs("country=한국", rows, entities).cards.map((card) => card.slug).sort()).toEqual(["lee-ufan", "park-seo-bo"]);
  });

  it("uses the exhibition space and does not treat the venue as representation", () => {
    const found = slugs("space=kukje", rows, entities);
    expect(found.resolvedSpace?.name).toBe("Kukje Gallery");
    expect(found.cards.map((card) => card.slug).sort()).toEqual(["lee-ufan", "park-seo-bo"]);
    expect(found.cards.every((card) => card.reasons.some((reason) => reason.startsWith("Kukje Gallery 전시 기록")))).toBe(true);
    expect(JSON.stringify(found.cards)).not.toMatch(/represent/i);
  });

  it("counts only public exhibitions toward the minimum and the year window", () => {
    const minimum = slugs("min=3", rows, entities);
    expect(minimum.cards.map((card) => card.slug)).toEqual(["lee-ufan"]);
    expect(minimum.cards[0].exhibitionCount).toBe(3);
    expect(minimum.cards[0].provenance).toEqual({ publicExhibitions: 3, approvedExternal: 2, firstParty: 1, limitedFactual: 0 });
    expect(minimum.cards[0].careerStart).toBe(2024);
    expect(minimum.cards[0].careerEnd).toBe(2026);
    const years = slugs("from=2024&to=2026", rows, entities);
    expect(years.cards.map((card) => card.slug).sort()).toEqual(["lee-ufan", "park-seo-bo"]);
    expect(years.cards.find((card) => card.slug === "park-seo-bo")?.sparseNote).toBe(
      "ROB currently has 1 verified exhibition record for this artist.",
    );
  });

  it("treats recent activity as overlapping public exhibition dates", () => {
    expect(slugs("recent=3y", rows, entities).cards.map((card) => card.slug).sort()).toEqual(["lee-ufan", "park-seo-bo"]);
    expect(slugs("recent=12m", rows, entities).cards.map((card) => card.slug)).toEqual(["lee-ufan"]);
    const dated = [
      show({ id: "day", artistIds: ["d"], datePrecision: "DAY", startYear: 2026, startMonth: 6, startDay: 1 }),
      show({ id: "old-day", artistIds: ["e"], datePrecision: "DAY", startYear: 2025, startMonth: 1, startDay: 1 }),
      show({ id: "year-2025", artistIds: ["f"], datePrecision: "YEAR", startYear: 2025 }),
      show({ id: "year-2024", artistIds: ["g"], datePrecision: "YEAR", startYear: 2024 }),
      show({ id: "unknown", artistIds: ["h"], datePrecision: "UNKNOWN", startYear: null }),
      show({ id: "span", artistIds: ["i"], datePrecision: "YEAR", startYear: 2023, endYear: 2025 }),
    ];
    const people = ["d", "e", "f", "g", "h", "i"].map((id) => artist(id, id, id.toUpperCase()));
    expect(slugs("recent=12m", dated, people).cards.map((card) => card.slug).sort()).toEqual(["d", "f", "i"]);
    expect(slugs("from=2024&to=2026", dated, people).cards.map((card) => card.slug).sort()).toEqual(["d", "e", "f", "g", "i"]);
    const window = recentWindow("12m", NOW);
    const year2025 = { precision: "YEAR", startYear: 2025, startMonth: null, startDay: null, endYear: null, endMonth: null, endDay: null };
    const year2024 = { ...year2025, startYear: 2024 };
    expect(overlapsWindow(year2025, window)).toBe(true);
    expect(overlapsWindow(year2024, window)).toBe(false);
  });

  it("requires the same exhibition to satisfy place and time together", () => {
    const mixed = [
      show({ id: "old-seoul", artistIds: ["p"], city: "Seoul", startYear: 1998 }),
      show({ id: "new-busan", artistIds: ["p"], city: "Busan", startYear: 2026 }),
    ];
    const person = [artist("p", "split", "Split Artist")];
    expect(slugs("city=Seoul&recent=3y", mixed, person).cards).toEqual([]);
    expect(slugs("city=Seoul", mixed, person).cards.map((card) => card.slug)).toEqual(["split"]);
    expect(slugs("recent=3y", mixed, person).cards.map((card) => card.slug)).toEqual(["split"]);
  });

  it("counts a confirmed linked profile and ignores a draft co-exhibitor", () => {
    const linked = artist("linked", "linked-artist", "Linked Artist", null, { profileId: "profile-1" });
    const found = slugs("", [show({ id: "profile-show", artistIds: [], confirmedProfileIds: ["profile-1"], startYear: 2020 })], [linked]);
    expect(found.cards.map((card) => card.slug)).toEqual(["linked-artist"]);
    expect(slugs("connected=lee-ufan", rows, entities).cards.map((card) => card.slug)).not.toContain("unrelated");
  });

  it("sorts deterministically and pages without overlap", () => {
    const manyRows: DiscoveryExhibitionRow[] = [];
    const manyArtists: DiscoveryEntityRow[] = [];
    for (let index = 0; index < 30; index += 1) {
      const id = `n${String(index).padStart(2, "0")}`;
      manyArtists.push(artist(id, id, index % 2 === 0 ? "Same Name" : `Name ${id}`, null));
      manyRows.push(show({ id: `ex-${id}`, artistIds: [id], startYear: 2000 + index }));
    }
    manyArtists.push(artist("n00b", "n00b", "Same Name"));
    manyRows.push(show({ id: "ex-n00b", artistIds: ["n00b"], startYear: 2000 }));
    const pages = [slugs("sort=name", manyRows, manyArtists, 10)];
    while (pages[pages.length - 1].nextCursor) {
      const cursor = pages[pages.length - 1].nextCursor;
      pages.push(slugs(`sort=name&cursor=${cursor}`, manyRows, manyArtists, 10));
    }
    const seen = pages.flatMap((page) => page.cards.map((card) => card.id));
    expect(pages).toHaveLength(4);
    expect(pages[0].cards).toHaveLength(10);
    expect(pages[3].cards).toHaveLength(1);
    expect(new Set(seen).size).toBe(31);
    expect(seen[10]).not.toBe(seen[0]);
    const sameNames = slugs("q=Same Name&sort=name", manyRows, manyArtists, 50);
    const ids = sameNames.cards.map((card) => card.id);
    expect(ids).toEqual([...ids].sort());
  });

  it("round-trips one filter schema through the URL", () => {
    const parsed = parseDiscoveryRequest(new URLSearchParams("city=Seoul&from=2026&to=2024&recent=3y&min=3&connected=lee-ufan&sort=recent"));
    expect(parsed.from).toBe(2024);
    expect(parsed.to).toBe(2026);
    expect(parsed.sort).toBe("recent");
    const again = parseDiscoveryRequest(new URLSearchParams(discoveryHref(parsed).split("?")[1]));
    expect(again).toEqual({ ...parsed, cursor: null });
    expect(discoveryHref(parseDiscoveryRequest({})).startsWith("/pro/discover")).toBe(true);
  });

  it("ships no private research fields and no ranking language", () => {
    const card = slugs("connected=lee-ufan", rows, entities).cards[0];
    expect(Object.keys(card).sort()).toEqual([...DISCOVERY_CARD_KEYS].sort());
    for (const key of ["email", "shortlist", "watchlist", "score", "ranking", "privateNote"]) {
      expect(Object.prototype.hasOwnProperty.call(card, key)).toBe(false);
    }
    expect(card.reasons.every((reason) => !reason.includes("추천"))).toBe(true);
    expect(DISCOVERY_COPY.emptyEn).toBe("No verified artist records match these filters yet.");
  });

  it("reads the public graph and does not select artist residence", () => {
    const source = readFileSync(path.join(process.cwd(), "lib/pro/discoveryQuery.ts"), "utf8");
    const artistQuery = source.slice(source.indexOf("artistEntity.findMany"), source.indexOf("exhibition.findMany"));
    expect(source).toContain("where: publicExhibitionWhere");
    expect(source).toContain("isFactualUseOk");
    expect(artistQuery).not.toContain("country");
    expect(artistQuery).not.toContain("city");
    expect(isHistoryEvent("PRO_DISCOVERY_OPENED")).toBe(true);
    expect(isHistoryEvent("PRO_ARTIST_OPENED")).toBe(true);
    expect(isHistoryEvent("ARTIST_SCORE")).toBe(false);
  });

  it("stays disabled until the operator flag is set", () => {
    const previous = process.env.ROB_PRO_DISCOVERY_ENABLED;
    delete process.env.ROB_PRO_DISCOVERY_ENABLED;
    expect(isProDiscoveryEnabled()).toBe(false);
    process.env.ROB_PRO_DISCOVERY_ENABLED = "1";
    expect(isProDiscoveryEnabled()).toBe(true);
    if (previous == null) delete process.env.ROB_PRO_DISCOVERY_ENABLED;
    else process.env.ROB_PRO_DISCOVERY_ENABLED = previous;
  });

  it("does not invent a relationship from a limited or rejected record", () => {
    const held = show({
      id: "held",
      artistIds: ["a", "c"],
      publicationStatus: "PUBLIC",
      origin: "ROB_RESEARCHED",
      sourceClearance: "REVIEW_REQUIRED",
      limitedFactualSource: false,
    });
    expect(slugs("connected=lee-ufan", [held, ...rows], entities).cards.map((card) => card.slug)).toEqual(["park-seo-bo"]);
    const limited = show({
      id: "limited",
      artistIds: ["a", "c"],
      city: "Paris",
      publicationStatus: "PUBLIC",
      origin: "ROB_RESEARCHED",
      sourceClearance: "REVIEW_REQUIRED",
      limitedFactualSource: true,
      startYear: 2022,
    });
    const found = slugs("city=Paris", [limited], entities);
    expect(found.cards.map((card) => card.slug).sort()).toEqual(["lee-ufan", "unrelated"]);
    expect(found.cards[0].provenance.limitedFactual).toBe(1);
  });
});

describe("discovery date interval", () => {
  it("does not match an unknown date to a window", () => {
    const unknown: DiscoveryExhibition = {
      id: "u",
      slug: null,
      title: "Undated",
      precision: "UNKNOWN",
      startYear: null,
      startMonth: null,
      startDay: null,
      endYear: null,
      endMonth: null,
      endDay: null,
      city: null,
      country: null,
      spaceId: null,
      spaceName: null,
      spaceSlug: null,
      artistIds: [],
      provenance: "approved_external",
    };
    expect(overlapsWindow(unknown, recentWindow("5y", NOW))).toBe(false);
  });
});
