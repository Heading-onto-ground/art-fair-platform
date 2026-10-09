import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { selectLaunchSeed } from "@/lib/history/candidateSeed";
import { legacyDateParts, legacyPublicationPlan, mapConfirmedParticipation } from "@/lib/history/legacy";
import { containsDestructiveSchema } from "@/lib/history/policy";

const artists = [
  { pilotId: "A", canonicalKoreanName: "가", romanizedNames: ["Artist A"] },
  { pilotId: "B", canonicalKoreanName: "나", romanizedNames: ["Artist B"] },
  { pilotId: "C", canonicalKoreanName: "다", romanizedNames: ["Artist C"] },
];

function exhibition(id: string, names: string[], venue = "Hall"): { id: string; title: string; status: string; venueName: string; artistNames: string[]; sourceUrl: string } {
  return { id, title: id, status: "PILOT_ACCEPTED", venueName: venue, artistNames: names, sourceUrl: `https://example.test/${id}` };
}

describe("public beta seed rules", () => {
  it("keeps legacy first-party records off the official-source label", () => {
    const plan = legacyPublicationPlan({ isPublic: true, createdByProfileId: "profile", creatorProfileExists: true, crawlerWritten: false });
    expect(plan).toMatchObject({ origin: "LEGACY_FIRST_PARTY", publicationStatus: "PUBLIC", sourceClearance: "NOT_APPLICABLE" });
    expect(legacyPublicationPlan({ isPublic: true, createdByProfileId: "profile", creatorProfileExists: true, crawlerWritten: true })).toBeNull();
    expect(legacyPublicationPlan({ isPublic: false, createdByProfileId: "profile", creatorProfileExists: true, crawlerWritten: false })).toBeNull();
    expect(legacyDateParts(new Date("2020-01-01T00:00:00.000Z")).precision).toBe("YEAR");
    expect(legacyDateParts(new Date("2020-05-02T00:00:00.000Z"))).toMatchObject({ precision: "DAY", month: 5, day: 2 });
    expect(mapConfirmedParticipation({ legacyPublic: true, status: "confirmed", entityId: "entity" })).toBe("entity");
    expect(mapConfirmedParticipation({ legacyPublic: true, status: "invited", entityId: "entity" })).toBeNull();
    expect(mapConfirmedParticipation({ legacyPublic: false, status: "confirmed", entityId: "entity" })).toBeNull();
  });

  it("selects a small not-reviewed bridge instead of every pilot exhibition", () => {
    const records = [
      exhibition("bridge", ["가", "나"]),
      ...Array.from({ length: 12 }, (_, index) => exhibition(`solo-${index}`, ["가"])),
      exhibition("other", ["다", "가"]),
    ];
    const seed = selectLaunchSeed(artists, records);
    const lead = seed.artists.find((artist) => artist.pilotId === "A");
    expect(seed.status).toBe("NOT_REVIEWED");
    expect(seed.artists.every((artist) => artist.productionClearanceStatus === "NOT_REVIEWED")).toBe(true);
    expect(seed.sources.every((source) => source.decision === "NOT_REVIEWED")).toBe(true);
    expect(seed.bridgeExhibitionIds).toContain("bridge");
    expect(lead).toBeDefined();
    expect(lead?.pilotAcceptedExhibitionCount).toBe(14);
    expect(lead?.launchExhibitionCount).toBeLessThan(lead?.pilotAcceptedExhibitionCount ?? 0);
    expect(lead?.launchExhibitionCount).toBeGreaterThanOrEqual(8);
  });

  it("does not apply destructive history SQL or import pilot records from the app", () => {
    const sql = readFileSync(path.resolve("prisma/sql/add-rob-public-beta-history.sql"), "utf8");
    expect(containsDestructiveSchema(sql)).toBe(false);
    expect(sql).not.toMatch(/\b(TRUNCATE|DELETE\s+FROM)\b/i);
    const route = readFileSync(path.resolve("app/api/admin/history/import/route.ts"), "utf8");
    expect(route.includes("exhibitions.json")).toBe(false);
  });
});
