"use client";

import TopBar from "@/app/components/TopBar";
import NowFeed from "@/app/components/NowFeed";
import { useLanguage } from "@/lib/useLanguage";

export default function NowPage() {
  const { lang } = useLanguage();

  return (
    <>
      <TopBar hideOnMobile />
      <main
        id="main-content"
        className="mobile-app-main now-main"
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "0 12px",
          background: "#FDFBF7",
          minHeight: "calc(100vh - 56px)",
        }}
      >
        <NowFeed lang={lang} />
      </main>
    </>
  );
}
