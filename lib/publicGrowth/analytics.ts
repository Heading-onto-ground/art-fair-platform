export const PUBLIC_EVENTS = [
  "SEARCH_STARTED",
  "SEARCH_RESULT_OPENED",
  "SEARCH_NO_RESULT",
  "ARTIST_OPENED",
  "TIMELINE_EVENT_OPENED",
  "CONNECTED_ARTIST_OPENED",
  "SECOND_ARTIST_REACHED",
  "THIRD_ARTIST_REACHED",
  "FOURTH_ARTIST_REACHED",
  "EXPLORE_OPENED",
  "PATH_OPENED",
  "PATH_STEP_OPENED",
  "REPORT_ISSUE_OPENED",
  "REPORT_ISSUE_SUBMITTED",
  "ADD_EXHIBITION_OPENED",
  "ADD_EXHIBITION_SUBMITTED",
  "GUIDE_PAGE_OPENED",
  "PROMO_PAGE_OPENED",
  "CTA_START_HISTORY_CLICKED",
  "CTA_EXPLORE_CLICKED",
] as const;

export type PublicEventName = (typeof PUBLIC_EVENTS)[number];

type EventValue = string | number | boolean | null;

const FORWARD_KEY = "rob-depth-forward";

/** Previous trail length after a forward follow. Back and refresh do not call this. */
export function depthEventForTrail(previousSteps: number): PublicEventName | null {
  if (previousSteps === 1) return "SECOND_ARTIST_REACHED";
  if (previousSteps === 2) return "THIRD_ARTIST_REACHED";
  if (previousSteps === 3) return "FOURTH_ARTIST_REACHED";
  return null;
}

export function markForwardArtist(slug: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(FORWARD_KEY, slug);
}

export function takeForwardArtist(slug: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const marked = sessionStorage.getItem(FORWARD_KEY);
  if (marked !== slug) return false;
  sessionStorage.removeItem(FORWARD_KEY);
  return true;
}

export function pushRobEvent(name: PublicEventName, params?: Record<string, EventValue>) {
  if (typeof window === "undefined") return;
  const holder = window as Window & { dataLayer?: Record<string, unknown>[] };
  holder.dataLayer = holder.dataLayer ?? [];
  holder.dataLayer.push({ event: name, ...params });
}

const recent = new Map<string, number>();

export function pushRobEventOnce(name: PublicEventName, key: string, params?: Record<string, EventValue>, windowMs = 1000) {
  const now = Date.now();
  const id = `${name}:${key}`;
  if (now - (recent.get(id) ?? 0) < windowMs) return false;
  recent.set(id, now);
  pushRobEvent(name, params);
  return true;
}

export function resetPublicEventDedupe() {
  recent.clear();
}

export function gtmContainerId(raw: string | undefined | null): string | null {
  const id = raw?.trim() ?? "";
  return /^GTM-[A-Z0-9]+$/i.test(id) ? id : null;
}

export function siteVerification(google?: string | null, naver?: string | null) {
  const g = google?.trim();
  const n = naver?.trim();
  if (!g && !n) return undefined;
  return {
    ...(g ? { google: g } : {}),
    ...(n ? { other: { "naver-site-verification": n } } : {}),
  };
}
