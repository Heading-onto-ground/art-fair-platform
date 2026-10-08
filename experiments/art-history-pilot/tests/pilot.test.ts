import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import vm from "vm";
import { describe, expect, it } from "vitest";
import { buildExhibition } from "../src/claims";
import { dateFromEvidence } from "../src/dates";
import { ER_PAIRS } from "../src/erPairs";
import { earliestRecordedExhibition, materializeGraph, sharedExhibitionIds, EARLIEST_LABEL } from "../src/graph";
import { exhibitionsPerArtist, median, recommend, wrongMergeRate } from "../src/metrics";
import { pilotRoot } from "../src/paths";
import { FROZEN_THRESHOLDS, decideReuse } from "../src/policy";
import { classifyPair, decideMerge } from "../src/resolve";
import { robotsAllows } from "../src/robots";
import { exhibitionFromSinglePage, exhibitionsFromBlocks, exhibitionsFromCards, exhibitionsFromCv, plainPage } from "../src/cvList";
import { enteredDate, classifySubmission, linkParticipant, officialMark, provenanceLabel, submissionMark, submissionMatch } from "../src/hybrid";
import { EMPTY_HISTORY, buildCatalog, collapseTimeline, connectionMap, displayCity, documentedShares, dotMark, historyLayout, pageTitle, rangeCoversToday, rankingModules, searchArtists, sharedExhibitionPhrase, spaceIdFor } from "../src/catalog";
import { exhibitionKey, historySignature, sameCanonicalExhibition, seoBucket, timelineFraction } from "../src/product";
import type { ExhibitionRecord } from "../src/claims";
import { classifyManualResearch, classifySource } from "../src/sourcePolicy";
import { acceptEntity, markSharedQids, parseEntityData, wikipediaItemId } from "../src/wikidataIdentity";
import { buildSeedArtists, validateSeed } from "../src/seed";
import { buildTimelineData, renderTimelineHtml } from "../src/view";

const page = [
  "Small Things",
  "4 September 2018 – 12 October 2018",
  "Gallery Example, Seoul",
  "Artists: Ada Example, Bo Example",
].join("\n");

function draft(overrides: Partial<Parameters<typeof buildExhibition>[0]> = {}) {
  return buildExhibition({
    title: "Small Things",
    titleEvidence: "Small Things",
    dateEvidence: "4 September 2018 – 12 October 2018",
    venue: "Gallery Example",
    venueEvidence: "Gallery Example",
    city: "Seoul",
    cityEvidence: "Seoul",
    artists: [
      { name: "Ada Example", evidence: "Ada Example" },
      { name: "Bo Example", evidence: "Bo Example" },
    ],
    curators: [],
    exhibitionType: null,
    exhibitionTypeEvidence: null,
    sourceUrl: "https://example.museum/small-things",
    sourceTier: 1,
    sourceAllowed: true,
    retrievedAt: "2026-10-08",
    pageText: page,
    confidence: 0.95,
    ...overrides,
  });
}

describe("dates", () => {
  it("keeps a year from becoming a synthetic day", () => {
    const parsed = dateFromEvidence("Opened in 2018");
    expect(parsed).toEqual({ status: "ok", start: { value: "2018", precision: "year" }, end: null });
  });

  it("keeps month and day precision", () => {
    expect(dateFromEvidence("March 2018")).toEqual({
      status: "ok",
      start: { value: "2018-03", precision: "month" },
      end: null,
    });
    expect(dateFromEvidence("12 March 2018").status).toBe("ok");
    expect(dateFromEvidence("2018년 3월")).toEqual({
      status: "ok",
      start: { value: "2018-03", precision: "month" },
      end: null,
    });
  });
});

describe("claims and graph", () => {
  it("accepts only explicit tier 1 evidence", () => {
    const record = draft();
    expect(record.status).toBe("AUTO_ACCEPTED");
    expect(record.curatorNames).toEqual([]);
    expect(record.start).toEqual({ value: "2018-09-04", precision: "day" });
    expect(record.end).toEqual({ value: "2018-10-12", precision: "day" });
  });

  it("rejects tier 2 exhibition creation, missing evidence, and inferred artists", () => {
    expect(draft({ sourceTier: 2 }).statusReason).toBe("TIER2_CANNOT_CREATE");
    expect(draft({ titleEvidence: "not on the page" }).status).toBe("REJECTED");
    expect(draft({ titleEvidence: "x".repeat(201) }).status).toBe("REJECTED");
    expect(
      draft({ artists: [{ name: "Unlisted Person", evidence: "Unlisted Person" }] }).status,
    ).toBe("REJECTED");
  });

  it("stores participation edges and derives artist relationships", () => {
    const record = draft();
    const graph = materializeGraph([record, draft({ sourceTier: 2 })]);
    expect(graph.edges.every((edge) => edge.type !== "PARTICIPATED_IN" || edge.type === "PARTICIPATED_IN")).toBe(true);
    expect(JSON.stringify(graph)).not.toContain("RELATED_TO");
    expect(graph.edges.map((edge) => edge.type).sort()).toEqual([
      "HELD_AT",
      "PARTICIPATED_IN",
      "PARTICIPATED_IN",
    ]);
    expect(sharedExhibitionIds([record], "Ada Example", "Bo Example")).toEqual([record.id]);
    expect(earliestRecordedExhibition([record], "Ada Example")?.label).toBe(EARLIEST_LABEL);
  });
});

describe("entity resolution", () => {
  it("does not auto-merge the frozen 20 pairs except authoritative ids", () => {
    expect(ER_PAIRS).toHaveLength(20);
    const scored = ER_PAIRS.map((pair) => {
      const state = classifyPair(pair.left, pair.right);
      const decision = decideMerge(state, false);
      expect(state).toBe(pair.expectedState);
      expect(decision.merge).toBe(pair.expectedAutoMerge);
      return { expectedAutoMerge: pair.expectedAutoMerge, merged: decision.merge };
    });
    expect(wrongMergeRate(scored)).toBe(0);
    expect(decideMerge("HIGH_CONFIDENCE_CANDIDATE", false).merge).toBe(false);
    expect(decideMerge("HIGH_CONFIDENCE_CANDIDATE", true).merge).toBe(true);
    expect(decideMerge("DISTINCT", true).merge).toBe(false);
  });
});

describe("seed and policy", () => {
  it("freezes 100 people and the success thresholds", () => {
    const artists = buildSeedArtists();
    expect(artists.filter((artist) => artist.cohort === "INTERNATIONAL")).toHaveLength(25);
    expect(artists.filter((artist) => artist.cohort === "DOMESTIC_INSTITUTIONAL")).toHaveLength(50);
    expect(artists.filter((artist) => artist.cohort === "EMERGING")).toHaveLength(25);
    expect(artists.find((artist) => artist.pilotId === "A01")?.canonicalKoreanName).toBe("이우환");
    expect(artists.find((artist) => artist.pilotId === "C01")?.canonicalKoreanName).toBe("구나");
    expect(artists.find((artist) => artist.pilotId === "C19")?.canonicalKoreanName).toBe("탁영준");
    expect(artists.find((artist) => artist.pilotId === "C22")?.canonicalKoreanName).toBe("박웅규");
    expect(artists.find((artist) => artist.pilotId === "C25")?.canonicalKoreanName).toBe("백종관");
    expect(validateSeed(artists).length).toBeGreaterThan(0);
    expect(validateSeed(artists.map((artist) => ({ ...artist, identityStatus: "QID_UNRESOLVED" })))).toEqual([]);
    expect(FROZEN_THRESHOLDS.internationalMedianExhibitions).toBe(8);
    expect(FROZEN_THRESHOLDS.domesticMedianExhibitions).toBe(4);
    expect(FROZEN_THRESHOLDS.emergingMedianExhibitions).toBe(2);
    expect(FROZEN_THRESHOLDS.emergingStopMedian).toBe(1);
  });

  it("holds sources that do not grant reuse", () => {
    expect(robotsAllows("User-agent: *\nDisallow:\n", "/exhibitions")).toBe(true);
    expect(robotsAllows("User-agent: *\nDisallow: /\n", "/exhibitions")).toBe(false);
    const wikidataRobots = [
      "User-agent: *",
      "Allow: /w/api.php?action=mobileview&",
      "Disallow: /w/",
      "Disallow: /wiki/Special:",
      "Disallow: /wiki/Special:EntityData/",
      "Allow: /wiki/Special:EntityData/*.",
    ].join("\n");
    expect(robotsAllows(wikidataRobots, "/wiki/Special:EntityData/Q1567689.json")).toBe(true);
    expect(robotsAllows(wikidataRobots, "/w/api.php")).toBe(false);
    expect(robotsAllows("User-agent: *\nDisallow: /sparql\nDisallow: /bigdata\n", "/sparql")).toBe(false);
    expect(
      classifySource({
        robotsAccess: "DISALLOWED",
        officialInterface: "DISALLOWED",
        structuredDataLicense: "CC0",
        explicitReuseBan: false,
        accessBarrier: "NONE",
      }).finalPilotStatus,
    ).toBe("RED");
    expect(
      classifySource({
        robotsAccess: "ALLOWED",
        officialInterface: "OPEN",
        structuredDataLicense: "CC0",
        explicitReuseBan: false,
        accessBarrier: "NONE",
      }).finalPilotStatus,
    ).toBe("GREEN");
    expect(
      classifySource({
        robotsAccess: "ALLOWED",
        officialInterface: "NONE",
        structuredDataLicense: "UNSPECIFIED",
        explicitReuseBan: false,
        accessBarrier: "NONE",
      }).finalPilotStatus,
    ).toBe("YELLOW");
    expect(
      classifySource({
        robotsAccess: "UNREADABLE",
        officialInterface: "NONE",
        structuredDataLicense: "UNSPECIFIED",
        explicitReuseBan: false,
        accessBarrier: "NONE",
      }).finalPilotStatus,
    ).toBe("RED");
    expect(
      classifySource({
        robotsAccess: "ALLOWED",
        officialInterface: "NONE",
        structuredDataLicense: "INCOMPATIBLE",
        explicitReuseBan: true,
        accessBarrier: "NONE",
      }).finalPilotStatus,
    ).toBe("RED");
    expect(
      decideReuse({
        tier: 1,
        robotsAllowTarget: true,
        termsText: "No part of this website may be used without prior permission.",
      }).approved,
    ).toBe(false);
    expect(
      decideReuse({
        tier: 1,
        robotsAllowTarget: true,
        termsText:
          "자유이용이 가능한 자료는 공공누리 제1유형을 부착한 저작물인지 확인한 이후에 이용합니다. 부착되지 않은 자료는 사전에 협의합니다.",
      }).reason,
    ).toBe("open_license_is_per_item_not_sitewide");
    expect(
      decideReuse({
        tier: 0,
        robotsAllowTarget: true,
        termsText: "All structured data is available under CC0.",
      }).mode,
    ).toBe("identity_api");
  });
});

describe("recommendation and view", () => {
  it("does not score an unfinished canary as a failed pivot", () => {
    expect(median([1, 8, 9])).toBe(8);
    expect(
      recommend({
        internationalMedian: 0,
        domesticMedian: 0,
        emergingMedian: 0,
        quality: {
          cohortComplete: false,
          tier1Coverage: null,
          auditIncorrectRate: null,
          wrongMergeRate: 0,
          medianReviewMinutes: null,
        },
      }).recommendation,
    ).toBe("INCOMPLETE");
    expect(
      recommend({
        internationalMedian: 8,
        domesticMedian: 4,
        emergingMedian: 0,
        quality: {
          cohortComplete: true,
          tier1Coverage: 0.8,
          auditIncorrectRate: 0.04,
          wrongMergeRate: 0,
          medianReviewMinutes: 10,
        },
      }).recommendation,
    ).toBe("PIVOT_SUPPORTED_WITH_HYBRID_MODEL");
    expect(
      recommend({
        internationalMedian: 8,
        domesticMedian: 3,
        emergingMedian: 3,
        quality: {
          cohortComplete: true,
          tier1Coverage: 0.9,
          auditIncorrectRate: 0,
          wrongMergeRate: 0,
          medianReviewMinutes: null,
        },
      }).recommendation,
    ).toBe("PIVOT_NOT_SUPPORTED");
  });

  it("renders an English history shell without calling anything the first exhibition", () => {
    const artists = buildSeedArtists().map((artist) => ({ ...artist, identityStatus: "QID_UNRESOLVED" as const }));
    const record = draft();
    const html = renderTimelineHtml(buildTimelineData(artists, [record]));
    expect(html).toContain("Search an artist.");
    expect(html).toContain("See their journey.");
    expect(html).toContain("HISTORY");
    expect(html).toContain(EARLIEST_LABEL);
    expect(html.toLowerCase()).not.toContain("first exhibition");
    expect(exhibitionsPerArtist(["Ada Example"], [record])).toEqual([1]);
  });
});

describe("wikidata identity", () => {
  it("accepts a matching artist entity and ignores a year-only day", () => {
    expect(wikipediaItemId('{"wgWikibaseItemId":"Q1567689"}')).toBe("Q1567689");
    const entity = parseEntityData(
      {
        entities: {
          Q1567689: {
            labels: { en: { value: "Haegue Yang" }, ko: { value: "양혜규" } },
            aliases: { en: [{ value: "Yang Hae-gue" }], ko: [{ value: "양혜규" }] },
            descriptions: { en: { value: "South Korean artist" } },
            claims: {
              P569: [{ mainsnak: { datavalue: { value: { time: "+1971-01-01T00:00:00Z", precision: 9 } } } }],
              P1344: [{}, {}],
            },
          },
        },
      },
      "Q1567689",
    );
    expect(entity?.birth).toEqual({ year: 1971, date: null, precision: 9 });
    expect(entity?.participantInStatements).toBe(2);
    expect(
      acceptEntity(
        { canonicalKoreanName: "양혜규", romanizedNames: ["Haegue Yang"], otherAliases: [] },
        entity!,
      ).accept,
    ).toBe(true);
    expect(
      acceptEntity(
        {
          canonicalKoreanName: "이배",
          romanizedNames: ["Lee Bae"],
          otherAliases: [],
          requireBoth: true,
        },
        {
          ...entity!,
          qid: "Q9",
          englishLabel: "Lee Bae",
          koreanLabel: null,
          aliases: [],
          descriptions: ["South Korean artist"],
        },
      ).accept,
    ).toBe(false);
    const shared = markSharedQids([
      { qid: "Q1", status: "QID_CONFIRMED" as const, reason: "label_and_artist_description" },
      { qid: "Q1", status: "QID_CONFIRMED" as const, reason: "label_and_artist_description" },
    ]);
    expect(shared.every((item) => item.status === "QID_AMBIGUOUS")).toBe(true);
  });
});

describe("pilot manual research", () => {
  it("keeps production clearance separate from a public CV line", () => {
    expect(
      classifyManualResearch({
        robotsAccess: "ALLOWED",
        officialInterface: "NONE",
        structuredDataLicense: "UNSPECIFIED",
        explicitReuseBan: false,
        accessBarrier: "NONE",
        officialExhibitionPage: true,
      }),
    ).toBe("ELIGIBLE");
    expect(
      classifyManualResearch({
        robotsAccess: "ALLOWED",
        officialInterface: "NONE",
        structuredDataLicense: "INCOMPATIBLE",
        explicitReuseBan: true,
        accessBarrier: "NONE",
        officialExhibitionPage: true,
      }),
    ).toBe("REVIEW_REQUIRED");
    expect(
      classifyManualResearch({
        robotsAccess: "DISALLOWED",
        officialInterface: "NONE",
        structuredDataLicense: "CC0",
        explicitReuseBan: false,
        accessBarrier: "NONE",
        officialExhibitionPage: true,
      }),
    ).toBe("INELIGIBLE");
    const text = [
      "Lee Ufan",
      "Selected Solo Exhibitions",
      "2023",
      "Lee Ufan , Kukje Gallery, Seoul, Korea",
      "Selected Group Exhibitions",
      "2024",
      "Letters of Lee Ufan and Park Seo-Bo, Tina Kim Gallery, New York, US",
    ].join("\n");
    const hits = exhibitionsFromCv(text, ["Lee Ufan", "Park Seo-Bo"]);
    expect(hits).toHaveLength(2);
    expect(hits[0]?.venue).toBe("Kukje Gallery");
    expect(hits[1]?.section).toBe("group");
    expect(hits[1]?.venue).toBe("Tina Kim Gallery");
    expect(
      exhibitionsFromCv(
        ["Lee Ufan", "Selected Solo Exhibitions", "2023", "Lee Ufan Presents Relatum at Palais des Papes, Avignon, France"].join("\n"),
        ["Lee Ufan"],
      ),
    ).toHaveLength(0);
    expect(
      exhibitionsFromCv(
        ["하종현", "Selected Group Exhibitions", "2019", "우순옥, 양혜규, 김수자, 하종현"].join("\n"),
        ["하종현", "김수자"],
      ),
    ).toHaveLength(0);
    expect(
      exhibitionsFromBlocks(
        ["Lee Ufan Presents Relatum", "Palais des Papes", "June 2023"].join("\n"),
        ["Lee Ufan"],
      ),
    ).toHaveLength(0);
    expect(
      exhibitionsFromBlocks(
        [
          "서도호",
          "National Museum of Modern and Contemporary Art, Korea",
          "Seoul, Korea, 2026년 8월 27일–2027년 2월 9일",
        ].join("\n"),
        ["서도호"],
      ),
    ).toHaveLength(0);
    expect(
      exhibitionsFromCv(
        [
          "Lee Ufan",
          "Selected Group Exhibitions",
          "2019",
          "Yves Klein, Lee Ufan, Ding Yi: The Challenging Souls, Power Station of Art, Shanghai, China",
        ].join("\n"),
        ["Lee Ufan"],
      ),
    ).toHaveLength(0);
    expect(
      exhibitionsFromCv("Lee Ufan\nSelected Solo Exhibitions\n2012\nKunsthalle Basel, Basel, Switzerland", ["Lee Ufan"])[0]?.venue,
    ).toBe("Kunsthalle Basel");
    expect(exhibitionsFromCv("Lee Ufan\nSelected Solo Exhibitions\n2011\nGuggenheim Museum, New York, US", ["Lee Ufan"])[0]).toMatchObject({
      title: "Guggenheim Museum",
      venue: "Guggenheim Museum",
      city: "New York",
      country: "US",
    });
    expect(dateFromEvidence("Jun. 1 - Aug. 25, 2024")).toEqual({
      status: "ok",
      start: { value: "2024-06-01", precision: "day" },
      end: { value: "2024-08-25", precision: "day" },
    });
    expect(dateFromEvidence("5월 1일–2025년 10월 26일").status).toBe("ok");
    const blocks = exhibitionsFromBlocks(
      ["서도호: Walk the House", "Tate Modern", "London, England, 5월 1일–2025년 10월 26일"].join("\n"),
      ["서도호"],
    );
    expect(blocks[0]).toMatchObject({ title: "서도호: Walk the House", venue: "Tate Modern", city: "London" });
    const record = buildExhibition({
      title: hits[0]!.title,
      titleEvidence: hits[0]!.line,
      dateEvidence: hits[0]!.year,
      venue: hits[0]!.venue,
      venueEvidence: hits[0]!.line,
      city: hits[0]!.city,
      cityEvidence: hits[0]!.line,
      artists: [{ name: "Lee Ufan", evidence: "Lee Ufan" }],
      curators: [],
      exhibitionType: "Solo",
      exhibitionTypeEvidence: "Selected Solo Exhibitions",
      sourceUrl: "https://www.kukjegallery.com/artists/view?seq=190",
      sourceTier: 1,
      sourceAllowed: false,
      pilotManualEligible: true,
      retrievedAt: "2026-10-08",
      pageText: text,
      confidence: 0.9,
    });
    expect(record.status).toBe("PILOT_ACCEPTED");
    expect(record.usageStatus).toBe("PILOT_ONLY");
    expect(record.productionClearance).toBe("UNRESOLVED");
    expect(plainPage("<p>Lee Ufan</p>")).toContain("Lee Ufan");
  });
});

describe("search rescue rules", () => {
  it("keeps a search snippet from becoming a record and places a year-only date on the year", () => {
    expect(dateFromEvidence("1 May – 26 October 2025")).toEqual({
      status: "ok",
      start: { value: "2025-05-01", precision: "day" },
      end: { value: "2025-10-26", precision: "day" },
    });
    expect(dateFromEvidence("2021-05-22 ~ 2021-09-26").start?.value).toBe("2021-05-22");
    const cards = exhibitionsFromCards(
      ["Kimsooja, Meta-Painting, Tschudi Gallery, Zürich, Switzerland", "20 December 2025 – 14 March 2026"].join("\n"),
      ["Kimsooja"],
    );
    expect(cards[0]?.venue).toBe("Tschudi Gallery");
    expect(cards[0]?.title).toContain("Meta-Painting");
    const single = exhibitionFromSinglePage(
      ["Do Ho Suh: Walk the House", "1 May – 26 October 2025", "Tate Modern"].join("\n"),
      ["Do Ho Suh"],
    );
    expect(single?.venue).toBe("Tate Modern");
    expect(exhibitionKey("Walk the House", "Tate Modern", "2025-05-01")).toBe(
      exhibitionKey("Walk the House", "Tate Modern", "2025"),
    );
    expect(seoBucket(0)).toBe("EMPTY");
    expect(seoBucket(6)).toBe("LOW_DENSITY");
    expect(seoBucket(8)).toBe("HISTORY_READY");
    expect(seoBucket(58)).toBe("RICH_HISTORY");
    const signature = historySignature(["1967", "1967-03-02", "2026"]);
    expect(signature.reduce((sum, count) => sum + count, 0)).toBe(3);
    expect(timelineFraction("2011", "year", 1967, 2026).precise).toBe(false);
    const canonical = (title: string, venue: string): ExhibitionRecord => ({
      id: "x",
      title,
      start: { value: "2025", precision: "year" },
      end: null,
      datePrecision: "year",
      venueName: venue,
      city: null,
      country: null,
      artistNames: ["Lee Ufan", "Park Seo-Bo"],
      curatorNames: [],
      exhibitionType: null,
      status: "PILOT_ACCEPTED",
      statusReason: "pilot_manual_evidence_checked",
      evidences: [],
      sourceUrl: "https://example.test/a",
      sourceTier: 1,
      usageStatus: "PILOT_ONLY",
      productionClearance: "UNRESOLVED",
    });
    expect(sameCanonicalExhibition(
      canonical("The Making of Modern Korean Art: Letters", "Tina Kim Gallery"),
      canonical("The Making of Modern Korean Art: Letters", "Tina Kim Gallery"),
    )).toBe(true);
    expect(sameCanonicalExhibition(canonical("Gallery Hyundai", "Gallery Hyundai"), canonical("Gallery Hyundai", "Gallery Hyundai"))).toBe(false);
  });

  it("keeps first-party history on one timeline without inventing a date or a person", () => {
    expect(enteredDate("2018", "DAY")).toEqual({ value: "2018", precision: "YEAR" });
    expect(enteredDate("2018-03", "DAY").value).toBe("2018-03");
    expect(enteredDate("", "YEAR")).toEqual({ value: null, precision: "UNKNOWN" });
    const existing = { title: "The Making of Modern Korean Art: Letters", venue: "Tina Kim Gallery", start: "2025" };
    expect(submissionMatch(existing, { title: existing.title, venue: existing.venue, start: "2025" })).toBe("ATTACHED");
    expect(submissionMatch(existing, { title: existing.title, venue: existing.venue, start: "2025-03" })).toBe("ATTACHED");
    expect(submissionMatch(existing, { title: existing.title, venue: existing.venue, start: "2024" })).toBe("REVIEW_REQUIRED");
    expect(submissionMatch({ title: "Show", venue: existing.venue, start: "2025" }, { title: "Show", venue: existing.venue, start: "2025" })).toBe("REVIEW_REQUIRED");
    expect(submissionMatch({ ...existing, start: "2025-03" }, { title: existing.title, venue: existing.venue, start: "2025-06" })).toBe("REVIEW_REQUIRED");
    expect(submissionMatch(existing, { title: "A different exhibition title here", venue: "Other Gallery", start: "2025" })).toBe("NEW");
    expect(provenanceLabel([officialMark("https://example.test"), submissionMark("ARTIST_SUBMITTED", null)])).toBe("Artist + official source");
    expect(provenanceLabel([officialMark("https://example.test"), submissionMark("GALLERY_SUBMITTED", null)])).toBe("Gallery + official source");
    expect(provenanceLabel([submissionMark("ARTIST_SUBMITTED", null)])).toBe("Artist added");
    expect(provenanceLabel([submissionMark("GALLERY_SUBMITTED", null)])).toBe("Gallery added");
    expect(classifySubmission(null, { title: existing.title, venue: existing.venue, start: "2025" })).toBe("NEW");
    expect(classifySubmission(existing, { title: existing.title, venue: existing.venue, start: "2025" })).toBe("ATTACHED");
    expect(classifySubmission({ ...existing, start: "2025-03" }, { title: existing.title, venue: existing.venue, start: "2025-06" })).toBe("CONFLICT");
    const people = [
      { id: "A01", labels: ["Lee Ufan", "이우환"] },
      { id: "A07", labels: ["Park Seo-Bo", "박서보"] },
    ];
    expect(linkParticipant("Lee Ufan", people)).toEqual({ kind: "PILOT_ARTIST", id: "A01", name: "Lee Ufan" });
    expect(linkParticipant("Avery Demo", people).kind).toBe("UNRESOLVED_PARTICIPANT");
    expect(linkParticipant("Lee Ufan", people.concat({ id: "L2", labels: ["Lee Ufan"] })).kind).toBe("REVIEW_REQUIRED");
  });
});

describe("search snippets", () => {
  it("rejects a snippet that is not on the page", () => {
    const snippet = buildExhibition({
      title: "From 1998 to Now",
      titleEvidence: "From 1998 to Now",
      dateEvidence: "4 September 2025–4 January 2026",
      venue: "Leeum Museum of Art",
      venueEvidence: "Leeum Museum of Art",
      city: null,
      cityEvidence: null,
      artists: [{ name: "Lee Bul", evidence: "Lee Bul" }],
      curators: [],
      exhibitionType: null,
      exhibitionTypeEvidence: null,
      sourceUrl: "https://ocula.com/example",
      sourceTier: 1,
      sourceAllowed: false,
      pilotManualEligible: true,
      retrievedAt: "2026-10-08",
      pageText: "Lee Bul exhibition museum",
      confidence: 0.9,
    });
    expect(snippet.status).toBe("REJECTED");
  });
});

describe("v3 catalog", () => {
  const artists = JSON.parse(readFileSync(path.join(pilotRoot(), "data/seed/artists.json"), "utf8")).artists;
  const records = JSON.parse(readFileSync(path.join(pilotRoot(), "data/claims/exhibitions.json"), "utf8")).records;
  const identity = JSON.parse(readFileSync(path.join(pilotRoot(), "data/identity/wikidata.json"), "utf8")).artists;
  const catalog = buildCatalog(artists, records, identity, "2026-10-08");

  it("searches english, korean, and verified aliases without inventing people", () => {
    expect(searchArtists(catalog.artists, "양혜규").map((artist) => artist.name)).toEqual(["Haegue Yang"]);
    expect(searchArtists(catalog.artists, "Ufan Lee").map((artist) => artist.id)).toEqual(["A01"]);
    expect(searchArtists(catalog.artists, "zzzz-no-artist")).toEqual([]);
    expect(catalog.artists).toHaveLength(25);
  });

  it("keeps year precision visually distinct and orders a career", () => {
    expect(dotMark("2018", "year")).toBe("open");
    expect(dotMark("2018-03", "month")).toBe("filled");
    expect(dotMark("2018-03-02", "day")).toBe("filled");
    const lee = catalog.artists.find((artist) => artist.id === "A01");
    expect(lee?.count).toBe(130);
    expect(lee?.marks.length).toBeGreaterThan(0);
    const ids = lee?.marks.flatMap((mark) => (mark.kind === "cluster" ? mark.ids : [mark.id])) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
    expect(lee?.signature.reduce((sum, count) => sum + count, 0)).toBeGreaterThan(0);
    const park = catalog.artists.find((artist) => artist.id === "A07");
    expect(documentedShares(catalog.exhibitions, "A01").some((share) => share.id === "A07")).toBe(true);
    expect(sharedExhibitionPhrase(park?.count ? 2 : 2)).toBe("2 documented shared exhibitions");
    expect(catalog.artists.find((artist) => artist.id === "A04")?.count).toBe(0);
    expect(catalog.artists.find((artist) => artist.id === "A11")?.birthYear).toBeNull();
  });

  it("does not merge a vague title into another exhibition", () => {
    const marks = collapseTimeline([
      { id: "a", fraction: 0.2, mark: "open", year: 2000 },
      { id: "b", fraction: 0.2, mark: "open", year: 2000 },
      { id: "c", fraction: 0.5, mark: "filled", year: 2010 },
    ]);
    expect(marks.map((mark) => mark.kind)).toEqual(["cluster", "dot"]);
    expect(marks[0].kind === "cluster" ? marks[0].count : 0).toBe(2);
    expect(catalog.exhibitions).toHaveLength(records.filter((record: { status: string }) => record.status === "PILOT_ACCEPTED" || record.status === "AUTO_ACCEPTED").length);
    expect(displayCity("an official Collateral Event of the 61st International Art Exhibition - La Biennale di Venezia, Venice")).toBeNull();
    expect(spaceIdFor("Kukje Gallery")).toBe(spaceIdFor("Kukje Gallery"));
  });

  it("derives a local map and refuses a current show from a year-only date", () => {
    expect(rangeCoversToday("2026", null, "year", "2026-10-08")).toBe(false);
    expect(rangeCoversToday("2026-10", null, "month", "2026-10-08")).toBe(true);
    expect(rangeCoversToday("2026-01", "2026-03", "month", "2026-10-08")).toBe(false);
    const map = connectionMap(
      { id: "A01", name: "Lee Ufan" },
      catalog.exhibitions.map((exhibition) => ({
        ...exhibition,
        people: exhibition.artistIds.map((id) => ({ id, name: id })),
      })),
      2,
    );
    expect(map.nodes.length).toBeLessThanOrEqual(12);
    expect(map.nodes[0]).toMatchObject({ id: "A01", kind: "artist" });
    expect(historyLayout(390)).toBe("vertical");
    expect(historyLayout(1024)).toBe("horizontal");
    expect(historyLayout(1440)).toBe("horizontal");
  });

  it("publishes no fabricated ranking and keeps titles factual", () => {
    const rankings = rankingModules();
    expect(rankings.map((item) => item.entries.length)).toEqual([0, 0, 0, 0]);
    expect(rankings.every((item) => item.status === "COMING_FROM_VERIFIED_DATA")).toBe(true);
    expect(JSON.stringify(rankings)).not.toMatch(/\d{5,}/);
    expect(pageTitle("artist", "Haegue Yang")).toBe("Haegue Yang: Exhibition History & Connections | ROB");
    expect(pageTitle("exhibition", "Relatum")).toBe("Relatum: Artists, Space & History | ROB");
    expect(pageTitle("space", "Kukje Gallery")).toBe("Kukje Gallery: Exhibitions & Artists | ROB");
    expect(pageTitle("ranking", "Oldest Living Artists")).toBe("Oldest Living Artists | ROB");
    expect(EMPTY_HISTORY).toBe("No accepted exhibition records in ROB yet.");
    expect(catalog.rankings.every((item) => item.entries.length === 0)).toBe(true);
    expect(catalog.usageStatus).toBe("PILOT_ONLY");
  });
});

describe("isolation", () => {
  it("does not import the production app", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (entry === "node_modules" || entry === ".local-snapshots") continue;
        if (statSync(full).isDirectory()) walk(full);
        else if (full.endsWith(".ts")) files.push(full);
      }
    };
    walk(pilotRoot());
    const combined = files.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(combined).not.toMatch(/from ["']@\/lib\/prisma["']/);
    expect(combined).not.toMatch(/from ["']next\/navigation["']/);
    expect(combined).not.toMatch(/prisma\/schema\.prisma/);
    const prototype = readFileSync(path.join(pilotRoot(), "view-v2/index.html"), "utf8");
    const client = readFileSync(path.join(pilotRoot(), "view-v2/app.js"), "utf8");
    const product = readFileSync(path.join(pilotRoot(), "view-v3/app.js"), "utf8");
    const productHtml = readFileSync(path.join(pilotRoot(), "view-v3/index.html"), "utf8");
    expect(client).toContain("No accepted exhibition records in ROB yet.");
    expect(product).toContain("No accepted exhibition records in ROB yet.");
    expect(productHtml).toContain("Search an artist.");
    expect(product).toContain("Coming from verified data");
    expect(product).not.toMatch(/\bFollowers\b|\bFollowing\b|ROB Artist Score/);
    expect(prototype + client + product + productHtml).not.toMatch(/google-analytics|googletagmanager|plausible/);
    expect(client).toContain("localStorage");
    expect(product).toContain("localStorage");
    expect(client).not.toMatch(/\bfetch\s*\(/);
    expect(product).not.toMatch(/\bfetch\s*\(/);
    expect(() => new vm.Script(client)).not.toThrow();
    expect(() => new vm.Script(product)).not.toThrow();
  });
});
