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
  const [artistId, setArtistId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch("/api/auth/me?lite=1", { credentials: "include" }).then(r => r.json()).catch(() => null);
        if (!me?.session || me.session.role !== "artist") { router.replace("/login"); return; }
        const res = await fetch("/api/artist/exhibitions", { credentials: "include" });
        const data = await res.json().catch(() => null);
        setExhibitions(Array.isArray(data?.exhibitions) ? data.exhibitions : []);
        setArtistId(data?.artistId ?? null);
        setIsPublic(!!data?.exhibitionsPublic);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const shareUrl = artistId ? `${typeof window !== "undefined" ? window.location.origin : "https://rob-roleofbridge.com"}/artist/public/${artistId}` : "";

  async function handleToggle() {
    if (toggling) return;
    setToggling(true);
    const next = !isPublic;
    setIsPublic(next);
    await fetch("/api/artist/exhibitions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ exhibitionsPublic: next }),
    }).catch(() => setIsPublic(!next));
    setToggling(false);
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 40px" }}>
        <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8A8A8A" }}>
          {lang === "ko" ? "전시 이력" : lang === "ja" ? "展示履歴" : "Exhibition History"}
        </span>
        <h1 style={{ fontFamily: S, fontSize: 36, fontWeight: 300, color: "#1A1A1A", marginTop: 8, marginBottom: 32 }}>
          {lang === "ko" ? "내 전시 이력" : lang === "ja" ? "私の展示履歴" : "My Exhibitions"}
        </h1>

        {/* Public toggle */}
        {!loading && (
          <div style={{ marginBottom: 32, padding: "16px 20px", border: "1px solid #E8E3DB", background: "#FDFCFA" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <p style={{ margin: 0, fontFamily: F, fontSize: 12, fontWeight: 600, color: "#1A1A1A", letterSpacing: "0.04em" }}>
                  {lang === "ko" ? "전시 이력 공개" : "Make exhibition history public"}
                </p>
                <p style={{ margin: "3px 0 0", fontFamily: F, fontSize: 11, color: "#8A8580" }}>
                  {lang === "ko" ? "공개 링크로 포트폴리오처럼 공유할 수 있습니다." : "Share as a public portfolio link."}
                </p>
              </div>
              <button
                onClick={handleToggle}
                disabled={toggling}
                style={{
                  flexShrink: 0, width: 44, height: 24, borderRadius: 12, border: "none",
                  background: isPublic ? "#1A1A1A" : "#D8D3CB",
                  cursor: "pointer", position: "relative", transition: "background 0.2s",
                }}
              >
                <span style={{
                  position: "absolute", top: 3, left: isPublic ? 23 : 3,
                  width: 18, height: 18, borderRadius: "50%", background: "#FFFFFF",
                  transition: "left 0.2s",
                }} />
              </button>
            </div>
            {isPublic && shareUrl && (
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1, fontFamily: F, fontSize: 11, color: "#6A6660", background: "#F5F2EE", padding: "8px 12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {shareUrl}
                </span>
                <button
                  onClick={handleCopy}
                  style={{ flexShrink: 0, padding: "8px 14px", border: "1px solid #C8B4A0", background: "#FFFFFF", fontFamily: F, fontSize: 10, fontWeight: 600, color: copied ? "#3D6B3D" : "#8B7355", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
                >
                  {copied ? (lang === "ko" ? "복사됨 ✓" : "Copied ✓") : (lang === "ko" ? "복사" : "Copy")}
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("My ROB Verified Exhibition History")}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Share to X"
                  style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, border: "1px solid #E0DAD2", background: "#FFFFFF", color: "#1A1A1A", textDecoration: "none" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Share to LinkedIn"
                  style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, border: "1px solid #E0DAD2", background: "#FFFFFF", color: "#0A66C2", textDecoration: "none" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            )}
          </div>
        )}

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
