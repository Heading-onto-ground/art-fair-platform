import { PUBLIC_HISTORY_CACHE_TAG } from "@/lib/history/publicGraph";

/** Public pages that must move when a factual import commits. Private routes are not included. */
export const PUBLIC_HISTORY_REFRESH_PATH = "/api/cron/refresh-public-history";
export const PUBLIC_SITEMAP_PATH = "/sitemap.xml";

export function publicCacheTargets(): { tag: string; paths: string[] } {
  return {
    tag: PUBLIC_HISTORY_CACHE_TAG,
    paths: [PUBLIC_SITEMAP_PATH],
  };
}

export type RefreshOutcome =
  | { status: "CACHE_INVALIDATION_COMPLETE"; tag: string; paths: string[] }
  | { status: "WRITE_SUCCEEDED_CACHE_REFRESH_FAILED"; reason: string };

export function publicRefreshUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}${PUBLIC_HISTORY_REFRESH_PATH}`;
}

export function refreshOutcome(input: {
  httpStatus: number | null;
  bodyStatus?: string | null;
  error?: string | null;
}): RefreshOutcome {
  const targets = publicCacheTargets();
  if (input.httpStatus === 200 && input.bodyStatus === "CACHE_INVALIDATION_COMPLETE") {
    return { status: "CACHE_INVALIDATION_COMPLETE", tag: targets.tag, paths: targets.paths };
  }
  const reason = input.error?.trim() || (input.httpStatus == null ? "NO_RESPONSE" : `HTTP_${input.httpStatus}`);
  return { status: "WRITE_SUCCEEDED_CACHE_REFRESH_FAILED", reason };
}

/** Calls the authenticated production route. A missing secret does not send a request. */
export async function requestPublicHistoryRefresh(input: {
  origin: string;
  secret: string;
  fetchImpl?: typeof fetch;
}): Promise<RefreshOutcome> {
  const secret = input.secret.trim();
  if (!secret) return refreshOutcome({ httpStatus: null, error: "SECRET_MISSING" });
  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(publicRefreshUrl(input.origin), {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    const body = await response.json().catch(() => null) as { status?: unknown } | null;
    const bodyStatus = body && typeof body.status === "string" ? body.status : null;
    return refreshOutcome({ httpStatus: response.status, bodyStatus });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "REFRESH_FAILED";
    return refreshOutcome({ httpStatus: null, error: reason });
  }
}
