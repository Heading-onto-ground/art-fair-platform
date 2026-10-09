import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { buildLaunchPlan, kukjeInternalUse, recordAcceptsFactualImport, type LaunchMap, type LaunchMapRecord } from "@/lib/history/launchImport";
import { containsDestructiveSchema, limitedPublicFactualDecision, recordIsPublic, visitorSourceLabel } from "@/lib/history/policy";

const map = JSON.parse(readFileSync(path.resolve("data/production-clearance/kukje-record-map.json"), "utf8")) as LaunchMap;

describe("limited public factual metadata", () => {
  it("allows Kukje facts without treating missing permission as approval", () => {
    const policy = kukjeInternalUse();
    expect(policy.internalUseDecision).toBe("ALLOW_LIMITED");
    expect(policy.externalPermission).toBe("NOT_OBTAINED");
    expect(visitorSourceLabel("Kukje Gallery")).toBe("Source: Kukje Gallery");
    expect(visitorSourceLabel("Kukje Gallery")).not.toMatch(/Approved|Licensed/);
    expect(recordIsPublic({
      publicationStatus: "PUBLIC",
      origin: "ROB_RESEARCHED",
      sourceClearance: "NOT_APPLICABLE",
      internalUseDecision: "ALLOW_LIMITED",
      contentScope: "FACTUAL_METADATA_ONLY",
    })).toBe(true);
    expect(recordIsPublic({
      publicationStatus: "PUBLIC",
      origin: "ROB_RESEARCHED",
      sourceClearance: "REVIEW_REQUIRED",
      internalUseDecision: "HOLD",
      contentScope: "FACTUAL_METADATA_ONLY",
    })).toBe(false);
    expect(limitedPublicFactualDecision({
      publicPage: true,
      loginRequired: false,
      paywall: false,
      captchaBypass: false,
      technicalCircumvention: false,
      officialArtSource: true,
      factualMetadataOnly: false,
      copiesProse: true,
      copiesImages: true,
      sourceUrlPreserved: true,
      bulkDatabaseClone: false,
      explicitProhibition: false,
      correctionPath: true,
      independentGraph: true,
    })).toBe("HOLD");
    expect(limitedPublicFactualDecision({
      publicPage: true,
      loginRequired: false,
      paywall: false,
      captchaBypass: false,
      technicalCircumvention: false,
      officialArtSource: true,
      factualMetadataOnly: true,
      copiesProse: false,
      copiesImages: false,
      sourceUrlPreserved: true,
      bulkDatabaseClone: true,
      explicitProhibition: false,
      correctionPath: true,
      independentGraph: true,
    })).toBe("BLOCK");
  });

  it("plans only the mapped launch records and hides pilot totals", () => {
    const plan = buildLaunchPlan(map, [], []);
    expect(plan.blocked).toEqual([]);
    expect(plan.exhibitions).toHaveLength(10);
    expect(plan.productionCounts["Lee Ufan"]).toBe(8);
    expect(plan.productionCounts["Park Seo-Bo"]).toBe(3);
    expect(plan.bridges.paths).toBeGreaterThan(0);
    expect(JSON.stringify(plan.exhibitions)).not.toContain("130");
    expect(plan.sourceUrls).toHaveLength(2);
    const image = { ...plan.exhibitions[0], facts: undefined } as unknown as LaunchMapRecord;
    expect(recordAcceptsFactualImport({
      ...map.sources[0].records[0],
      facts: { ...map.sources[0].records[0].facts, contentClass: "IMAGE" },
    })).toBe(false);
    expect(image).toBeTruthy();
  });

  it("keeps the import script behind an explicit flag and the SQL additive", () => {
    const script = readFileSync(path.resolve("scripts/import-public-beta-seed.ts"), "utf8");
    const sql = readFileSync(path.resolve("prisma/sql/add-rob-public-web-source-policy.sql"), "utf8");
    expect(script.includes("ROB_CONFIRM_PRODUCTION_SEED_IMPORT")).toBe(true);
    expect(script.includes("exhibitions.json")).toBe(false);
    expect(containsDestructiveSchema(sql)).toBe(false);
    expect(sql).not.toMatch(/\b(TRUNCATE|DELETE\s+FROM)\b/i);
  });
});
