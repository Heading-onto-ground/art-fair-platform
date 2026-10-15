import { searchDemandQuery } from "@/lib/history/identity";
import { missingSearchEvent } from "@/lib/history/policy";

export const SEARCH_CLIENT_TIMEOUT_MS = 9_000;
export const SEARCH_EMPTY_COPY = "No documented artist matches that name yet.";
export const SEARCH_ERROR_COPY = "Search is temporarily unavailable. Please try again.";
export const SEARCH_PENDING_COPY = "Searching…";

export type SearchPhase = "idle" | "searching" | "success" | "empty" | "error";

export type HistorySearchBody = {
  results: unknown[];
  unavailable: false;
};

/** The search payload is complete before any analytics write starts. */
export function historySearchBody(results: unknown[]): HistorySearchBody {
  return { results, unavailable: false };
}

export function finishSearch(input: { ok: boolean; results: unknown[] }): SearchPhase {
  if (!input.ok) return "error";
  return input.results.length === 0 ? "empty" : "success";
}

export function claimSubmit(inflightQuery: string | null, query: string): { proceed: boolean; query: string } {
  const next = query.trim();
  if (!next || inflightQuery === next) return { proceed: false, query: next };
  return { proceed: true, query: next };
}

export function reuseCompletedSearch(completedQuery: string | null, query: string): boolean {
  const next = query.trim();
  return next.length > 0 && completedQuery === next;
}

export function acceptAutocomplete(requestQuery: string, currentQuery: string, aborted: boolean): boolean {
  return !aborted && requestQuery === currentQuery.trim();
}

export async function persistMissingSearch(input: {
  query: string;
  operator: boolean;
  write: (name: "SEARCH_NO_RESULT" | "SEARCH_NO_RESULT_OPERATOR", path: string) => Promise<void>;
}): Promise<"recorded" | "skipped" | "failed"> {
  const path = searchDemandQuery(input.query);
  if (!path) return "skipped";
  try {
    await input.write(missingSearchEvent(input.operator), path);
    return "recorded";
  } catch {
    return "failed";
  }
}
