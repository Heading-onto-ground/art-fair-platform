"use client";

import { useEffect } from "react";
import { trackHistory } from "@/lib/history/analytics";
import type { HistoryEventName } from "@/lib/history/policy";

export default function ProBeacon({ event, path }: { event: HistoryEventName; path: string }) {
  useEffect(() => {
    trackHistory(event, path);
  }, [event, path]);
  return null;
}
