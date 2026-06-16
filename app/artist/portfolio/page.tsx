"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import ArtistFeed from "@/app/components/ArtistFeed";
import { useLanguage } from "@/lib/useLanguage";

export default function ArtistHomePage() {
  const router = useRouter();
  const { lang } = useLanguage();

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((me) => {
        if (!me?.session) router.replace("/login?role=artist");
        else if (me.session.role !== "artist") router.replace("/gallery");
      })
      .catch(() => router.replace("/login?role=artist"));
  }, [router]);

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px 0" }}>
        <ArtistFeed lang={lang} />
      </main>
    </>
  );
}
