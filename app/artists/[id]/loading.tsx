"use client";

import TopBar from "@/app/components/TopBar";
import "@/app/components/history/history.css";

// Same-segment client navigations keep this file unmounted.
// HistoryExperience draws rh-nav-overlay when that transition stays pending.
export default function ArtistPublicLoading() {
  return (
    <div className="rh-page">
      <div className="rh-progress is-active" role="progressbar" aria-label="Opening history">
        <span />
      </div>
      <TopBar />
      <main className="rh-wrap" id="main-content" aria-busy="true">
        <p className="rh-kicker">Artist history</p>
        <div className="rh-skel rh-skel-title" />
        <div className="rh-skel rh-skel-line" />
        <div className="rh-skel rh-skel-row" />
        <div className="rh-skel rh-skel-row" />
        <div className="rh-skel rh-skel-row" />
      </main>
    </div>
  );
}
