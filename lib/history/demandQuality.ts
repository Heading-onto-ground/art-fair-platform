import { searchDemandQuery } from "@/lib/history/identity";

/**
 * PR #31 merged at 2026-10-15 23:28:15 +0900 and separated operator checks
 * from public missing-search rows. Older SEARCH_NO_RESULT rows stay stored
 * and visible, and they are not treated as real visitor demand.
 */
export const DEMAND_SEPARATION_AT = "2026-10-15T14:28:15.000Z";

export const DEMAND_QUALITIES = [
  "REAL_VISITOR",
  "OPERATOR",
  "LEGACY_MIXED",
  "QA_TEST",
  "INVALID_QUERY",
] as const;

export type DemandQuality = (typeof DEMAND_QUALITIES)[number];

export type DemandEventName = "SEARCH_NO_RESULT" | "SEARCH_NO_RESULT_OPERATOR" | "SEARCH_NO_RESULT_QA";

const SEPARATION_MS = Date.parse(DEMAND_SEPARATION_AT);

/** Public clients cannot choose this. Admin session or the test runtime can. */
export function demandWriteClass(input: { adminSession: boolean; nodeEnv: string }): "REAL_VISITOR" | "OPERATOR" | "QA_TEST" {
  if (input.nodeEnv === "test") return "QA_TEST";
  if (input.adminSession) return "OPERATOR";
  return "REAL_VISITOR";
}

export function demandEventName(quality: "REAL_VISITOR" | "OPERATOR" | "QA_TEST"): DemandEventName {
  if (quality === "OPERATOR") return "SEARCH_NO_RESULT_OPERATOR";
  if (quality === "QA_TEST") return "SEARCH_NO_RESULT_QA";
  return "SEARCH_NO_RESULT";
}

export function classifyStoredDemand(input: { name: string; createdAt: string; query: string }): DemandQuality {
  if (!searchDemandQuery(input.query)) return "INVALID_QUERY";
  if (input.name === "SEARCH_NO_RESULT_OPERATOR") return "OPERATOR";
  if (input.name === "SEARCH_NO_RESULT_QA") return "QA_TEST";
  if (input.name !== "SEARCH_NO_RESULT") return "INVALID_QUERY";
  const created = Date.parse(input.createdAt);
  if (!Number.isFinite(created) || created < SEPARATION_MS) return "LEGACY_MIXED";
  return "REAL_VISITOR";
}

export function countsAsFrontierDemand(input: { name: string; createdAt: string; query: string }): boolean {
  return classifyStoredDemand(input) === "REAL_VISITOR";
}
