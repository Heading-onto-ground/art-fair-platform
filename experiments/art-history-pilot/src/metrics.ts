import type { ExhibitionRecord } from "./claims";
import { isRecordedExhibition } from "./claims";
import type { ResolutionState } from "./resolve";
import { FROZEN_THRESHOLDS } from "./policy";

export type Cohort = "INTERNATIONAL" | "DOMESTIC_INSTITUTIONAL" | "EMERGING";

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

export function exhibitionsPerArtist(
  artistNames: string[],
  records: ExhibitionRecord[],
): number[] {
  const accepted = records.filter((record) => isRecordedExhibition(record));
  return artistNames.map(
    (name) => accepted.filter((record) => record.artistNames.includes(name)).length,
  );
}

export type QualityFlags = {
  cohortComplete: boolean;
  tier1Coverage: number | null;
  auditIncorrectRate: number | null;
  wrongMergeRate: number | null;
  medianReviewMinutes: number | null;
};

export type Recommendation =
  | "PIVOT_SUPPORTED"
  | "PIVOT_SUPPORTED_WITH_HYBRID_MODEL"
  | "PIVOT_NOT_SUPPORTED"
  | "INCOMPLETE";

export function recommend(input: {
  internationalMedian: number | null;
  domesticMedian: number | null;
  emergingMedian: number | null;
  quality: QualityFlags;
}): { recommendation: Recommendation; operationallyProblematic: boolean } {
  const operationallyProblematic =
    input.quality.medianReviewMinutes !== null &&
    input.quality.medianReviewMinutes > FROZEN_THRESHOLDS.maxMedianReviewMinutes;

  if (!input.quality.cohortComplete) {
    return { recommendation: "INCOMPLETE", operationallyProblematic };
  }
  const qualityOk =
    input.quality.tier1Coverage !== null &&
    input.quality.tier1Coverage >= FROZEN_THRESHOLDS.tier1CoverageMin &&
    input.quality.auditIncorrectRate !== null &&
    input.quality.auditIncorrectRate < FROZEN_THRESHOLDS.auditMaxIncorrectRate &&
    input.quality.wrongMergeRate !== null &&
    input.quality.wrongMergeRate < FROZEN_THRESHOLDS.entityMaxWrongMergeRate;

  const established =
    (input.internationalMedian ?? -1) >= FROZEN_THRESHOLDS.internationalMedianExhibitions &&
    (input.domesticMedian ?? -1) >= FROZEN_THRESHOLDS.domesticMedianExhibitions;
  const emergingOk = (input.emergingMedian ?? -1) >= FROZEN_THRESHOLDS.emergingMedianExhibitions;

  if (established && emergingOk && qualityOk) {
    return { recommendation: "PIVOT_SUPPORTED", operationallyProblematic };
  }
  if (established && !emergingOk && qualityOk) {
    return { recommendation: "PIVOT_SUPPORTED_WITH_HYBRID_MODEL", operationallyProblematic };
  }
  return { recommendation: "PIVOT_NOT_SUPPORTED", operationallyProblematic };
}

export function wrongMergeRate(
  pairs: { expectedAutoMerge: boolean; merged: boolean }[],
): number {
  if (pairs.length !== FROZEN_THRESHOLDS.entityPairCount) {
    throw new Error(`Entity test set must stay frozen at ${FROZEN_THRESHOLDS.entityPairCount} pairs.`);
  }
  const wrong = pairs.filter((pair) => pair.merged && !pair.expectedAutoMerge).length;
  return wrong / pairs.length;
}

export type PairExpectation = {
  id: string;
  state: ResolutionState;
  expectedAutoMerge: boolean;
};
