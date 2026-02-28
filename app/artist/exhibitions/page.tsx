"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { useLanguage } from "@/lib/useLanguage";
import { F, S } from "@/lib/design";

type Exhibition = {
  id: string;
  openCallId: string;
  galleryName: string;
  theme: string;
  country: string;
  city: string;
  externalUrl?: string;
  acceptedAt: string;
};

export default function ArtistExhibitionsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch("/api/auth/me?lite=1", { credentials: "include" }).then(r => r.json()).catch(() => null);
        if (!me?.session || me.session.role !== "artist") { router.replace("/login"); return; }
        const res = await fetch("/api/artist/exhibitions", { credentials: "include" });
        const data = await res.json().catch(() => null);
        setExhibitions(Array.isArray(data?.exhibitions) ? data.exhibitions : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 40px" }}>
        <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8A8A8A" }}>
          {lang === "ko" ? "전시 이력" : lang === "ja" ? "展示履歴" : "Exhibition History"}
        </span>
        <h1 style={{ fontFamily: S, fontSize: 36, fontWeight: 300, color: "#1A1A1A", marginTop: 8, marginBottom: 40 }}>
          {lang === "ko" ? "내 전시 이력" : lang === "ja" ? "私の展示履歴" : "My Exhibitions"}
        </h1>

        {loading ? (
          <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>Loading...</p>
        ) : exhibitions.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", border: "1px solid #E8E3DB" }}>
            <p style={{ fontFamily: S, fontSize: 16, fontStyle: "italic", color: "#B0AAA2" }}>
              {lang === "ko" ? "아직 합격된 전시가 없습니다." : lang === "ja" ? "まだ合格した展示がありません。" : "No accepted exhibitions yet."}
            </p>
            <p style={{ fontFamily: F, fontSize: 12, color: "#C8C0B4", marginTop: 8 }}>
              {lang === "ko" ? "오픈콜에 지원하고 합격하면 여기에 자동으로 기록됩니다." : "Apply to open calls — accepted exhibitions are recorded here automatically."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
            {exhibitions.map((ex, i) => (
              <div key={ex.id} style={{ background: "#FFFFFF", padding: "24px 28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355" }}>
                      {String(i + 1).padStart(2, "0")} · {ex.country} / {ex.city}
                    </span>
                    <h3 style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: "#1A1A1A", margin: "6px 0 4px" }}>
                      {ex.galleryName}
                    </h3>
                    <p style={{ fontFamily: F, fontSize: 13, color: "#6A6660", margin: 0 }}>{ex.theme}</p>
                    {ex.externalUrl && (
                      <a href={ex.externalUrl} target="_blank" rel="noreferrer"
                        style={{ display: "inline-block", marginTop: 8, fontFamily: F, fontSize: 10, color: "#8B7355", letterSpacing: "0.06em", textTransform: "uppercase", textDecoration: "underline" }}
                        onClick={e => e.stopPropagation()}>
                        {lang === "ko" ? "갤러리 보기 →" : "View Gallery →"}
                      </a>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#B0AAA2" }}>
                      {lang === "ko" ? "합격일" : "Accepted"}
                    </span>
                    <div style={{ fontFamily: S, fontSize: 14, color: "#1A1A1A", marginTop: 4 }}>
                      {ex.acceptedAt ? new Date(ex.acceptedAt).toLocaleDateString() : "-"}
                    </div>
                    <div style={{ marginTop: 8, padding: "3px 8px", background: "rgba(61,107,61,0.08)", border: "1px solid rgba(61,107,61,0.2)", display: "inline-block" }}>
                      <span style={{ fontFamily: F, fontSize: 9, color: "#3D6B3D", fontWeight: 600, letterSpacing: "0.06em" }}>ACCEPTED</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
