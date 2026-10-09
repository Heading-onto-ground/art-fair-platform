import { isHistoryEvent, type HistoryEventName } from "@/lib/history/policy";

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
