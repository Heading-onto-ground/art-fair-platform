import { isHistoryEvent, type HistoryEventName } from "@/lib/history/policy";

const SEEN_ARTISTS = "rob-history-artists";

/** Session depth without a user id. Repeating an artist does not increase the depth. */
export function nextExplorationDepth(seen: string[], slug: string): { seen: string[]; depth: number } {
  const next = seen.includes(slug) ? [...seen] : [...seen, slug];
  const capped = next.slice(-8);
  return { seen: capped, depth: capped.length };
}

export function rememberExplorationDepth(slug: string): number {
  if (typeof window === "undefined") return 1;
  let seen: string[] = [];
  try {
    seen = (window.sessionStorage.getItem(SEEN_ARTISTS) ?? "").split(",").filter(Boolean);
  } catch {
    seen = [];
  }
  const next = nextExplorationDepth(seen, slug);
  try {
    window.sessionStorage.setItem(SEEN_ARTISTS, next.seen.join(","));
  } catch {
    // Private browsing can reject storage. The journey still works.
  }
  return next.depth;
}

export function trackHistory(name: HistoryEventName, path?: string) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ name, path: path ?? window.location.pathname });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/history/analytics", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/history/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Analytics must not block the history journey.
  }
}

export { isHistoryEvent };
