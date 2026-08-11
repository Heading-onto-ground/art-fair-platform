"use client";

import TopBar from "@/app/components/TopBar";
import ArtistFeed from "@/app/components/ArtistFeed";
import { useLanguage } from "@/lib/useLanguage";

/** Artwork SNS feed — moved from home while labor survey is featured on /. */
export default function StudioPage() {
  const { lang } = useLanguage();

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "0 12px", background: "#FDFBF7", minHeight: "calc(100vh - 56px)" }} className="mobile-app-main">
        <ArtistFeed lang={lang} />
      </main>
    </>
  );
}
