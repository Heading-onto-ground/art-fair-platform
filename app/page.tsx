"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/translate";

export default function Home() {
  const { lang } = useLanguage();
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 32,
      }}
    >
      <h1 style={{ fontSize: 36 }}>🌍 {t("home_title", lang)}</h1>
      <p style={{ opacity: 0.8 }}>{t("home_subtitle", lang)}</p>

      <div style={{ display: "flex", gap: 24 }}>
        <Link href="/login?role=artist">
          <div
            style={{
              padding: 32,
              border: "2px solid black",
              borderRadius: 16,
              cursor: "pointer",
              width: 220,
            }}
          >
            <h2>🎨 {t("artist", lang)}</h2>
            <p style={{ fontSize: 14, marginTop: 8 }}>
              Enter open calls from galleries worldwide.
            </p>
          </div>
        </Link>

        <Link href="/login?role=gallery">
          <div
            style={{
              padding: 32,
              border: "2px solid black",
              borderRadius: 16,
              cursor: "pointer",
              width: 220,
            }}
          >
            <h2>🏛️ {t("gallery", lang)}</h2>
            <p style={{ fontSize: 14, marginTop: 8 }}>
              Open calls and connect with artists.
            </p>
          </div>
        </Link>
      </div>
    </main>
  );
}
