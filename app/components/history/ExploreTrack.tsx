"use client";

import { useEffect } from "react";
import { trackHistory } from "@/lib/history/analytics";

export default function ExploreTrack() {
  useEffect(() => {
    trackHistory("EXPLORE_OPENED", "/history/explore");
  }, []);
  return null;
}
