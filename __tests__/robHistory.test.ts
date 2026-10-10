import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { JOURNEY_MS, clusterByDecade, decodeDisplayText, displayCountry, groupByYear, historyCoverageCopy, historyPresentation, restoredArtistPath, shouldPlayJourney, uncertainDisplay } from "@/lib/history/display";
import { publicHistoryImage, selectExplicitFirstPartyHero } from "@/lib/history/images";
import { planBackfill } from "@/lib/history/backfill";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import {
  artistAddedLabel,
  artistSitemapEligible,
  betaSeedDecision,
  classifyLegacyExhibition,
  classifyParticipant,
  containsDestructiveSchema,
  containsRuntimeDdl,
  countBridgePaths,
  dedupeById,
  densityForCount,
  firstPartyWrite,
  formatHistoryDate,
  isFirstPartyImage,
  isIndexEligible,
  legacyArtistRedirect,
  mayPublishHistoryRecord,
  median,
  omitPrivateClaimFields,
  provenanceLabel,
  publicBetaDecision,
  recordIsPublic,
  selectiveImportDecision,
  seoIndexEligible,
  sharedIds,
  uniqueSlug,
  validateExhibitionInput,
} from "@/lib/history/policy";

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
  });
}

describe("ROB public history", () => {
  it("keeps an artist entity independent of an account", () => {
    const plan = planBackfill(
      [
        { id: "profile-1", name: "Lee Ufan", country: "Korea", city: null, website: null, startedYear: 1956 },
        { id: "profile-2", name: "Lee Ufan", country: null, city: null, website: null, startedYear: 2001 },
      ],
      [],
    );
    expect(plan).toHaveLength(2);
    expect(plan[0].slug).not.toBe(plan[1].slug);
    expect(plan[0].birthYear).toBeNull();
    expect(plan[1].birthYear).toBeNull();
    expect(plan[0].profileId).toBe("profile-1");
  });

  it("does not merge artists that only share a name", () => {
    const taken = new Set<string>();
    expect(uniqueSlug("Haegue Yang", taken)).toBe("haegue-yang");
    taken.add("haegue-yang");
    expect(uniqueSlug("Haegue Yang", taken)).toBe("haegue-yang-2");
  });

  it("searches native names through the slug of the canonical record", () => {
    expect(uniqueSlug("이우환", new Set())).toBe("artist");
    expect(legacyArtistRedirect({ requested: "user-1", userId: "user-1", artistId: "A01", slug: "lee-ufan" })).toBe("/artists/lee-ufan");
    expect(legacyArtistRedirect({ requested: "someone-else", userId: "user-1", artistId: "A01", slug: "lee-ufan" })).toBeNull();
  });

  it("does not turn a year into January 1", () => {
    expect(formatHistoryDate({ precision: "YEAR", year: 1978, month: 1, day: 1 })).toBe("1978");
    expect(formatHistoryDate({ precision: "MONTH", year: 1978, month: 5, day: null })).toBe("1978-05");
    expect(formatHistoryDate({ precision: "DAY", year: 1978, month: 5, day: 2 })).toBe("1978-05-02");
    expect(formatHistoryDate({ precision: "UNKNOWN", year: null, month: null, day: null })).toBe("Date not recorded");
    const yearOnly = validateExhibitionInput({ title: "Solo", precision: "YEAR", year: 1978, month: 1, day: 1 });
    expect(yearOnly.ok).toBe(false);
  });

  it("keeps the real count when a year has more than four exhibitions", () => {
    const events = Array.from({ length: 6 }, (_, index) => ({ id: `e${index}`, year: 1978, mark: "open" as const }));
    const group = groupByYear(events)[0];
    expect(group.count).toBe(6);
    expect(group.visible).toBe(4);
    expect(group.visible + group.overflow).toBe(group.count);
    const dated = groupByYear([{ id: "one", year: 1990, mark: "filled" }]);
    expect(dated[0].marks).toEqual(["filled"]);
  });

  it("dedupes exhibitions and derives shared exhibitions", () => {
    expect(dedupeById([{ id: "a" }, { id: "a" }, { id: "b" }])).toHaveLength(2);
    expect(sharedIds(["e1", "e2"], ["e2", "e3"])).toEqual(["e2"]);
  });

  it("restores the previous artist, zoom, year, exhibition, and scroll", () => {
    expect(
      restoredArtistPath({ from: "lee-ufan", via: "exhibition-x", srcZoom: "year", srcFocus: "2025", srcScroll: "480" }),
    ).toBe("/artists/lee-ufan?event=exhibition-x&zoom=year&focus=2025&scroll=480");
  });

  it("hides unapproved sources and private claim notes", () => {
    expect(mayPublishHistoryRecord({ pilotOnly: true, clearance: "APPROVED" })).toBe(false);
    expect(mayPublishHistoryRecord({ usageStatus: "PILOT_ONLY", clearance: "APPROVED" })).toBe(false);
    expect(mayPublishHistoryRecord({ clearance: "UNRESOLVED" })).toBe(false);
    expect(mayPublishHistoryRecord({ clearance: "APPROVED" })).toBe(true);
    expect(omitPrivateClaimFields({ slug: "lee-ufan", note: "passport", claims: [] })).toEqual({ slug: "lee-ufan" });
  });

  it("keeps claims pending and participants unresolved when the name is ambiguous", () => {
    expect(classifyParticipant(1)).toBe("LINKED");
    expect(classifyParticipant(2)).toBe("REVIEW_REQUIRED");
    expect(classifyParticipant(0)).toBe("UNRESOLVED_PARTICIPANT");
    expect(provenanceLabel({ official: true, contributor: null, conflict: false })).toBe("Official source");
    expect(provenanceLabel({ official: false, contributor: "artist", conflict: false })).toBe("Artist added");
    expect(provenanceLabel({ official: true, contributor: "artist", conflict: false })).toBe("Artist + official source");
    expect(provenanceLabel({ official: false, contributor: null, conflict: true })).toBe("Conflict");
  });

  it("does not index thin artist pages", () => {
    expect(densityForCount(0)).toBe("EMPTY");
    expect(densityForCount(2)).toBe("LOW_DENSITY");
    expect(densityForCount(3)).toBe("HISTORY_READY");
    expect(densityForCount(12)).toBe("RICH_HISTORY");
    expect(isIndexEligible("EMPTY")).toBe(false);
    expect(isIndexEligible("LOW_DENSITY")).toBe(false);
    expect(artistSitemapEligible(2)).toBe(false);
    expect(artistSitemapEligible(3)).toBe(true);
    expect(median([3, 8, 12])).toBe(8);
  });

  it("keeps publication, provenance, and indexing separate", () => {
    const artistAdded = firstPartyWrite({ claimApproved: true, hasExternalSource: false });
    expect(artistAdded.publicationStatus).toBe("PUBLIC");
    expect(artistAdded.sourceClearance).toBe("NOT_APPLICABLE");
    expect(recordIsPublic(artistAdded)).toBe(true);
    expect(artistAddedLabel({ claimApproved: true, sourceClearance: artistAdded.sourceClearance })).toBe("Artist added");
    expect(artistAddedLabel({ claimApproved: true, sourceClearance: "NOT_APPLICABLE" })).not.toBe("Official source");
    expect(provenanceLabel({ official: false, contributor: "artist", conflict: false })).toBe("Artist added");

    expect(recordIsPublic({ publicationStatus: "PUBLIC", origin: "ROB_RESEARCHED", sourceClearance: "REVIEW_REQUIRED" })).toBe(false);
    expect(recordIsPublic({ publicationStatus: "PUBLIC", origin: "ROB_RESEARCHED", sourceClearance: "APPROVED" })).toBe(true);
    expect(provenanceLabel({ official: true, contributor: null, conflict: false })).toBe("Official source");

    expect(seoIndexEligible({ publicationStatus: "PUBLIC", exhibitionCount: 1 })).toBe(false);
    expect(recordIsPublic({ publicationStatus: "PUBLIC", origin: "ARTIST_SUBMITTED", sourceClearance: "NOT_APPLICABLE" })).toBe(true);
    expect(seoIndexEligible({ publicationStatus: "PUBLIC", exhibitionCount: 8 })).toBe(true);

    const pending = firstPartyWrite({ claimApproved: false, hasExternalSource: false });
    expect(pending.publicationStatus).toBe("PENDING_REVIEW");
    expect(pending.isPublic).toBe(false);
    expect(pending.contributorKind).toBeNull();
    expect(artistAddedLabel({ claimApproved: false, sourceClearance: "NOT_APPLICABLE" })).toBe("Pending review");
    expect(recordIsPublic(pending)).toBe(false);
  });

  it("counts a real artist bridge and does not treat missing ownership as first-party", () => {
    expect(classifyLegacyExhibition({ isPublic: true, createdByProfileId: "profile-1", hasHistoryMeta: false, crawlerWritten: false })).toBe(
      "LEGACY_FIRST_PARTY",
    );
    expect(classifyLegacyExhibition({ isPublic: true, createdByProfileId: null, hasHistoryMeta: false, crawlerWritten: false })).toBeNull();
    expect(classifyLegacyExhibition({ isPublic: true, createdByProfileId: "profile-1", hasHistoryMeta: false, crawlerWritten: true })).toBeNull();
    expect(countBridgePaths([{ artistIds: ["a", "a", "b"] }, { artistIds: ["a"] }])).toEqual({ paths: 2, artists: 2 });
    expect(
      betaSeedDecision({ artistsAtLeast1: 3, artistsAtLeast8: 1, bridgePaths: 1, spacesWithExhibitions: 1 }),
    ).toBe("PUBLIC_BETA_FIRST_PARTY_SEED_READY");
    expect(
      betaSeedDecision({ artistsAtLeast1: 20, artistsAtLeast8: 4, bridgePaths: 0, spacesWithExhibitions: 6 }),
    ).toBe("PUBLIC_BETA_CONTENT_GATE_BLOCKED");
    expect(
      publicBetaDecision({
        databaseConfirmed: false,
        recoveryConfirmed: false,
        seed: "PUBLIC_BETA_FIRST_PARTY_SEED_READY",
        clearanceSeedReady: false,
      }),
    ).toBe("PUBLIC_BETA_DATABASE_GATE_BLOCKED");
  });

  it("imports one approved pilot record and refuses the rest of the file", () => {
    expect(
      selectiveImportDecision({
        usageStatus: "PILOT_ONLY",
        reviewDecision: "REVIEW_REQUIRED",
        requestedIds: ["record-1"],
        approvedIds: [],
      }).ok,
    ).toBe(false);
    expect(
      selectiveImportDecision({
        usageStatus: "PILOT_ONLY",
        reviewDecision: "APPROVED",
        requestedIds: ["record-1", "record-2"],
        approvedIds: ["record-1"],
      }).reason,
    ).toBe("not-in-approved-set");
    expect(
      selectiveImportDecision({
        usageStatus: "PILOT_ONLY",
        reviewDecision: "APPROVED",
        requestedIds: ["record-1"],
        approvedIds: ["record-1"],
      }).ok,
    ).toBe(true);
    expect(mayPublishHistoryRecord({ pilotOnly: true, clearance: "APPROVED" })).toBe(false);
  });

  it("normalizes only unambiguous display values", () => {
    expect(decodeDisplayText("St&auml;dtisches")).toBe("Städtisches");
    expect(displayCountry("대한민국")).toBe("Korea");
    expect(displayCountry("North Korea")).toBe("North Korea");
    expect(uncertainDisplay("Tokyo G1995")).toBe(true);
    expect(isFirstPartyImage("https://example.com/painting.jpg")).toBe(false);
  });

  it("does not draw a career across sparse ROB records", () => {
    const park = historyCoverageCopy({ count: 3, years: [2025, 1992, 1994] });
    expect(park.presentation).toBe("sparse");
    expect(historyPresentation(0)).toBe("sparse");
    expect(historyPresentation(5)).toBe("sparse");
    expect(historyPresentation(6)).toBe("timeline");
    expect(historyPresentation(8)).toBe("timeline");
    expect(historyPresentation(20)).toBe("timeline");
    expect(historyPresentation(21)).toBe("dense");
    expect(park.chronologyYears).toEqual([1992, 1994, 2025]);
    expect(park.rangeLabel).toBeNull();
    expect(park.partialLabel).toBe("Partial history");
    expect(park.countNoun).toBe("records currently documented in ROB");
    expect(park.gapNote).toBe("Years without a row are not years without activity.");
    expect(park.impliesInactivity).toBe(false);
    expect([park.partialLabel, park.countNoun, park.gapNote, park.rangeLabel].join(" ")).not.toMatch(/1994\s*[–-]\s*2025|career/i);

    const lee = historyCoverageCopy({ count: 8, years: [2022, 2023, 2024, 2025, 2026] });
    expect(lee.presentation).toBe("timeline");
    expect(lee.rangeLabel).toBe("Documented years 2022–2026");
    expect(lee.countNoun).toBe("exhibitions currently documented in ROB");
    expect(lee.impliesInactivity).toBe(false);

    expect(clusterByDecade([{ year: 1992, count: 1 }, { year: 1994, count: 1 }, { year: 2008, count: 4 }])).toEqual([
      { decade: 1990, count: 2, start: 1992, end: 1994 },
      { decade: 2000, count: 4, start: 2008, end: 2008 },
    ]);
    expect(JOURNEY_MS).toBeGreaterThanOrEqual(200);
    expect(JOURNEY_MS).toBeLessThanOrEqual(350);
  });

  it("renders only images with a known rights state", () => {
    const blob = "https://works.public.blob.vercel-storage.com/painting.jpg";
    expect(selectExplicitFirstPartyHero([{ id: "work-1", isPublic: true, imageUrl: blob, title: "Ecriture" }], null)).toBeNull();
    expect(selectExplicitFirstPartyHero([{ id: "work-1", isPublic: false, imageUrl: blob }], "work-1")).toBeNull();
    expect(selectExplicitFirstPartyHero([{ id: "work-1", isPublic: true, imageUrl: "https://gallery.example/a.jpg" }], "work-1")).toBeNull();
    expect(selectExplicitFirstPartyHero([{ id: "work-1", isPublic: true, imageUrl: blob, title: "Ecriture" }], "work-1")).toMatchObject({
      provenance: "FIRST_PARTY",
      url: blob,
      alt: "Ecriture",
    });
    expect(publicHistoryImage({
      url: "https://upload.wikimedia.org/wikipedia/commons/a.jpg",
      alt: "Open portrait",
      provenance: "OPEN_LICENSE",
      creator: null,
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:A.jpg",
      attribution: "Artist, CC BY 4.0",
    })).toBeNull();
    expect(publicHistoryImage({
      url: "https://upload.wikimedia.org/wikipedia/commons/a.jpg",
      alt: "Open portrait",
      provenance: "OPEN_LICENSE",
      creator: "Artist",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:A.jpg",
      attribution: "Artist, CC BY 4.0",
    })?.provenance).toBe("OPEN_LICENSE");
    expect(publicHistoryImage({
      url: "https://museum.example/permission.jpg",
      alt: "Permitted still",
      provenance: "PERMISSION_GRANTED",
      creator: null,
      license: null,
      licenseUrl: null,
      sourceUrl: null,
      attribution: "Museum grant",
    })).toBeNull();
  });

  it("keeps artist navigation from waiting on the arrival animation", () => {
    const experience = readFileSync(path.resolve("app/components/history/HistoryExperience.tsx"), "utf8");
    const loading = readFileSync(path.resolve("app/artists/[id]/loading.tsx"), "utf8");
    expect(experience).toContain("router.prefetch");
    expect(experience).toContain("rh-chronology");
    expect(experience).toContain("dataset.nav");
    expect(experience).not.toMatch(/documented career|career runs|inactive/i);
    expect(loading).toContain("rh-progress");
    expect(loading).toContain("rh-skel");
    expect(loading).not.toContain("CardSkeleton");
  });

  it("keeps navigation available when motion is reduced", () => {
    expect(shouldPlayJourney(true)).toBe(false);
    expect(shouldPlayJourney(false)).toBe(true);
  });

  it("does not describe a database failure as an empty search", () => {
    expect(isHistoryUnavailable({ code: "P1000" })).toBe(true);
    expect(isHistoryUnavailable({ code: "P2021" })).toBe(true);
    expect(isHistoryUnavailable(new Error("unrelated"))).toBe(false);
  });

  it("does not run schema changes from history requests", () => {
    const roots = ["app/api/history", "app/api/admin/history", "app/history", "app/artists", "lib/history"].map((dir) =>
      path.resolve(dir),
    );
    const sources = roots.flatMap((dir) => walk(dir)).map((file) => readFileSync(file, "utf8"));
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(containsRuntimeDdl(source)).toBe(false);
      expect(source.includes("exhibitions.json")).toBe(false);
    }
    const sql = readFileSync(path.resolve("prisma/sql/add-rob-public-beta-history.sql"), "utf8");
    expect(containsDestructiveSchema(sql)).toBe(false);
    expect(sql.includes("publicationStatus")).toBe(true);
    expect(sql.includes("NOT_APPLICABLE")).toBe(true);
  });
});
