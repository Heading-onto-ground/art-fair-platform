import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  displayedProductionCount,
  dossierHasProductionImage,
  explicitParticipants,
  kukjeClearanceDecision,
  mayImportClearedRecord,
} from "@/lib/history/kukjeClearance";

const root = path.resolve("data/production-clearance");
const dossier = JSON.parse(readFileSync(path.join(root, "kukje-source-dossier.json"), "utf8"));
const map = JSON.parse(readFileSync(path.join(root, "kukje-record-map.json"), "utf8"));
const seed = JSON.parse(readFileSync(path.join(root, "candidate-seed.json"), "utf8"));

describe("Kukje clearance dossier", () => {
  it("leaves every candidate unapproved and stores no image or page body", () => {
    expect(dossier.sources.every((source: { productionDecision: string }) => source.productionDecision === "REVIEW_REQUIRED")).toBe(true);
    expect(seed.sources.every((source: { decision: string }) => source.decision !== "APPROVED")).toBe(true);
    expect(dossierHasProductionImage(JSON.stringify(dossier))).toBe(false);
    expect(dossierHasProductionImage(JSON.stringify(map))).toBe(false);
    expect(JSON.stringify(dossier)).not.toMatch(/Born in|Selected Solo Exhibitions -/);
    expect(dossier.sources.every((source: { expressiveContentNeeded: string[] }) => source.expressiveContentNeeded.length === 0)).toBe(true);
  });

  it("maps every launch record to an exact Kukje URL and keeps partial counts", () => {
    const allowed = new Set(seed.sources.map((source: { sourceUrl: string }) => source.sourceUrl));
    const ids = new Set<string>();
    for (const source of map.sources) {
      expect(allowed.has(source.sourceUrl)).toBe(true);
      for (const record of source.records) {
        expect(record.facts.sourceUrl).toBe(source.sourceUrl);
        ids.add(record.pilotRecordId);
        if (record.role === "bridge") {
          expect(explicitParticipants(record.explicitParticipants, record.facts.title)).toEqual(record.explicitParticipants);
        }
      }
    }
    expect(displayedProductionCount([...ids])).toBe(10);
    expect(displayedProductionCount(map.minimumLaunchSubset.uniquePilotRecordIds)).toBe(8 + 2);
    expect(map.minimumLaunchSubset.productionCounts["Lee Ufan"]).toBe(8);
    expect(map.minimumLaunchSubset.pilotCountsNotForDisplay["Lee Ufan"]).toBe(130);
  });

  it("imports only an approved id and requires the participant to be in the evidence", () => {
    const id = "e36e8dee259d6973";
    expect(mayImportClearedRecord({ decision: "REVIEW_REQUIRED", recordId: id, approvedIds: [id] }).ok).toBe(false);
    expect(mayImportClearedRecord({ decision: "REJECTED", recordId: id, approvedIds: [id] }).ok).toBe(false);
    expect(mayImportClearedRecord({ decision: "APPROVED", recordId: id, approvedIds: [id] }).ok).toBe(true);
    expect(mayImportClearedRecord({ decision: "APPROVED", recordId: "other", approvedIds: [id] }).ok).toBe(false);
    const line = "The Making of Modern Korean Art: The Letters of Kim Tschang-Yeul, Kim Whanki, Lee Ufan, and Park Seo-Bo, 1961-1982";
    expect(explicitParticipants(["Lee Ufan", "Park Seo-Bo", "Ha Chong-Hyun"], line)).toEqual(["Lee Ufan", "Park Seo-Bo"]);
    expect(kukjeClearanceDecision({
      explicitReuseLicense: false,
      writtenPermission: false,
      reviewedPolicyCoversUse: false,
      explicitMetadataProhibition: false,
    })).toBe("REVIEW_REQUIRED");
  });
});
