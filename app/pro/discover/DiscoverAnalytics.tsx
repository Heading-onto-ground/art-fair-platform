"use client";

import { useEffect } from "react";
import { trackHistory } from "@/lib/history/analytics";

export default function DiscoverAnalytics({ searched, filterKeys }: { searched: boolean; filterKeys: string }) {
  useEffect(() => {
    trackHistory("PRO_DISCOVERY_OPENED", "/pro/discover");
    if (searched) trackHistory("PRO_SEARCH_PERFORMED", "/pro/discover");
    if (filterKeys) trackHistory("PRO_FILTER_APPLIED", `/pro/discover?keys=${filterKeys}`);
  }, [searched, filterKeys]);
  return null;
}
