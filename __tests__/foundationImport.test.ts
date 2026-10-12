import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { classifyParticipants, isProductionDuplicate, matchKnownArtist, termsBlockFactualMetadata } from "@/lib/history/foundationImport";
import { isFactualUseOk, recordIsPublic } from "@/lib/history/policy";

const file = JSON.parse(readFileSync(path.resolve("data/production-clearance/park-seobo-foundation-candidates.json"), "utf8")) as {
  records: { year: number; venue: string; participants: string[]; pilotRecordId: string }[];
};

describe("Park Seo-Bo foundation factual subset", () => {
  it("treats FACTUAL_USE_OK as the public factual decision", () => {
    expect(isFactualUseOk("FACTUAL_USE_OK")).toBe(true);
    expect(isFactualUseOk("ALLOW_LIMITED")).toBe(true);
    expect(isFactualUseOk("HOLD")).toBe(false);
    expect(recordIsPublic({
      publicationStatus: "PUBLIC",
      origin: "ROB_RESEARCHED",
      sourceClearance: "NOT_APPLICABLE",
      internalUseDecision: "FACTUAL_USE_OK",
      contentScope: "FACTUAL_METADATA_ONLY",
    })).toBe(true);
  });

  it("does not treat a member intellectual-property clause as a factual ban", () => {
    const terms = "회원은 운영자, 사이트 및 제3자의 지적재산권을 침해해서는 안 된다. All Rights Reserved.";
    expect(termsBlockFactualMetadata(terms)).toBe(false);
    expect(termsBlockFactualMetadata("Automated collection is prohibited.")).toBe(true);
  });

  it("matches only exact known names and skips the three production records", () => {
    expect(matchKnownArtist("Lee Ufan")).toBe("lee-ufan");
    expect(matchKnownArtist("Lee U Fan")).toBe("lee-ufan");
    expect(matchKnownArtist("Chung Sang Hwa")).toBe("chung-sang-hwa");
    expect(matchKnownArtist("Lee Fan")).toBeNull();
    expect(isProductionDuplicate({ year: 1992, venue: "Ingong Gallery" })).toBe(true);
    expect(isProductionDuplicate({ year: 1994, venue: "Gallery 63" })).toBe(true);
    expect(isProductionDuplicate({ year: 2025, venue: "Tina Kim Gallery" })).toBe(true);
    expect(file.records).toHaveLength(10);
    expect(file.records.some((row) => isProductionDuplicate(row))).toBe(false);
    const mainz = file.records.find((row) => row.pilotRecordId === "psbf-2005-mainz-monochrom");
    const classified = classifyParticipants(mainz?.participants ?? []);
    expect(classified.matched).toEqual(["park-seo-bo", "lee-ufan", "yun-hyong-keun"]);
    expect(classified.unresolved).toEqual(["Kim, Guirin"]);
  });
});
