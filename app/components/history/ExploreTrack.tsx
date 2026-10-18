"use client";

import { useEffect } from "react";
import { trackHistory } from "@/lib/history/analytics";
import { pushRobEventOnce } from "@/lib/publicGrowth/analytics";

export default function ExploreTrack() {
  useEffect(() => {
    trackHistory("EXPLORE_OPENED", "/history/explore");
    pushRobEventOnce("EXPLORE_OPENED", "explore", { route: "/history/explore" });
  }, []);
  return null;
}
