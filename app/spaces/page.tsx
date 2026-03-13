"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";

type Space = { id: string; name: string; type?: string | null; city?: string | null; country?: string | null; exhibitionCount: number };

export default function SpacesPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/spaces")
      .then(r => r.json())
      .then(d => setSpaces(d.spaces ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ marginBottom: 40 }}>
          <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
            {lang === "ko" ? "공간 탐색" : "Explore Spaces"}
          </span>
          <h1 style={{ fontFamily: S, fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>
            {lang === "ko" ? "전시 공간" : "Exhibition Spaces"}
          </h1>
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginTop: 8 }}>
            {lang === "ko" ? "갤러리, 미술관, 아트페어 등 전시 공간을 찾아보세요" : "Find galleries, museums, art fairs and more"}
          </p>
        </div>

        {loading ? (
          <p style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>Loading…</p>
        ) : spaces.length === 0 ? (
          <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2", fontStyle: "italic" }}>
            {lang === "ko" ? "등록된 공간이 없습니다." : "No spaces yet."}
          </p>
        ) : (
          <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
            {spaces.map((s) => (
              <div
                key={s.id}
                onClick={() => router.push(`/spaces/${s.id}`)}
                style={{ background: "#FFFFFF", padding: "20px 24px", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#FAF8F4"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#FFFFFF"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontFamily: S, fontSize: 18, fontWeight: 400, color: "#1A1A1A", margin: 0 }}>{s.name}</h3>
                    <p style={{ fontFamily: F, fontSize: 11, color: "#8A8580", margin: "4px 0 0" }}>
                      {[s.type, s.city, s.country].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <span style={{ fontFamily: F, fontSize: 10, color: "#8B7355", background: "#F5F1EB", padding: "4px 10px" }}>
                    {s.exhibitionCount} {lang === "ko" ? "전시" : "exhibitions"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
