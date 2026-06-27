"use client";

import { useEffect, useMemo, useState } from "react";
import { F, S, colors } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";
import type { ArtworkItem } from "@/lib/artworkTypes";
import { POST_TYPE_LABELS } from "@/lib/artworkTypes";

type Profile = {
  name: string;
  genre?: string;
  city?: string;
  country?: string;
  bio?: string;
  workNote?: string | null;
  instagram?: string;
  website?: string;
};

const PRINT_CSS = `
@media print {
  .no-print { display: none !important; }
  @page { size: A4; margin: 14mm; }
  html, body { background: #ffffff !important; }
  .pf-item { break-inside: avoid; page-break-inside: avoid; }
  .pf-cover { page-break-after: always; }
  .pf-img { max-height: 200mm !important; }
}
`;

function fmtDate(iso: string, lang: string): string {
  try {
    return new Date(iso).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function PortfolioPrintPage() {
  const { lang } = useLanguage();
  const ko = lang === "ko";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [artworks, setArtworks] = useState<ArtworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meRes, artRes] = await Promise.all([
          fetch("/api/auth/me", { credentials: "include", cache: "no-store" }),
          fetch("/api/artist/artworks", { credentials: "include", cache: "no-store" }),
        ]);
        const me = await meRes.json().catch(() => null);
        const art = await artRes.json().catch(() => null);
        if (cancelled) return;
        const isArtist = !!me?.session && me.session.role === "artist" && !!me.profile;
        setAuthed(isArtist);
        if (me?.profile) setProfile(me.profile as Profile);
        if (art?.artworks) setArtworks(art.artworks as ArtworkItem[]);
      } catch {
        if (!cancelled) setAuthed(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () =>
      artworks
        .filter((a) => a.inPortfolio)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [artworks],
  );

  const location = [profile?.city, profile?.country].filter(Boolean).join(", ");
  const statement = (profile?.workNote || profile?.bio || "").trim();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: colors.bgPrimary, fontFamily: F, fontSize: 13, color: colors.textMuted }}>
        {ko ? "불러오는 중…" : "Loading…"}
      </div>
    );
  }

  if (authed === false) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: colors.bgPrimary, fontFamily: F, color: colors.textSecondary, padding: 24, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 14 }}>{ko ? "작가 계정으로 로그인해야 포트폴리오를 만들 수 있어요." : "Sign in as an artist to build a portfolio."}</p>
        <a href="/login" style={{ fontFamily: F, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.accent }}>{ko ? "로그인" : "Sign in"}</a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.bgPrimary }}>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* Toolbar (hidden when printing) */}
      <div
        className="no-print"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 20px",
          background: colors.bgCard,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div>
          <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: colors.accent, margin: "0 0 2px" }}>
            {ko ? "포트폴리오 PDF" : "Portfolio PDF"}
          </p>
          <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, margin: 0 }}>
            {ko
              ? `선택한 작업 ${selected.length}점 · 인쇄 창에서 "대상 → PDF로 저장"을 선택하세요.`
              : `${selected.length} selected · In the print dialog, choose "Save as PDF".`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => window.close()}
            style={{ padding: "10px 16px", border: `1px solid ${colors.border}`, background: "transparent", fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.textMuted, cursor: "pointer" }}
          >
            {ko ? "닫기" : "Close"}
          </button>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => window.print()}
            style={{
              padding: "10px 18px",
              border: "none",
              background: selected.length === 0 ? colors.border : colors.textPrimary,
              color: selected.length === 0 ? colors.textMuted : colors.bgPrimary,
              fontFamily: F,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: selected.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {ko ? "PDF로 저장 / 인쇄" : "Save as PDF / Print"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px 64px" }}>
        {selected.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", border: `1px dashed ${colors.border}`, background: colors.bgAccent }}>
            <p style={{ fontFamily: F, fontSize: 13, color: colors.textMuted, margin: 0, lineHeight: 1.7 }}>
              {ko
                ? "포트폴리오에 추가한 작업이 없어요. 내 프로필에서 게시물을 선택해 포트폴리오에 추가해 주세요."
                : "No works added to your portfolio yet. Pick posts on your profile to add them."}
            </p>
          </div>
        ) : (
          <>
            {/* Cover */}
            <header className="pf-cover" style={{ marginBottom: 40 }}>
              <p style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: colors.accent, margin: "0 0 12px" }}>
                {ko ? "포트폴리오" : "Portfolio"}
              </p>
              <h1 style={{ fontFamily: S, fontSize: 40, fontWeight: 400, color: colors.textPrimary, margin: "0 0 8px", lineHeight: 1.15 }}>
                {profile?.name || (ko ? "작가" : "Artist")}
              </h1>
              <p style={{ fontFamily: F, fontSize: 13, color: colors.textSecondary, margin: 0 }}>
                {[profile?.genre, location].filter(Boolean).join(" · ")}
              </p>
              {statement && (
                <p style={{ fontFamily: F, fontSize: 14, color: colors.textSecondary, margin: "20px 0 0", lineHeight: 1.8, whiteSpace: "pre-wrap", maxWidth: 620 }}>
                  {statement}
                </p>
              )}
              <p style={{ fontFamily: F, fontSize: 11, color: colors.textLight, margin: "20px 0 0" }}>
                {(ko ? "작업 " : "") + selected.length + (ko ? "점" : " works") + " · " + fmtDate(new Date().toISOString(), lang)}
              </p>
            </header>

            {/* Works */}
            <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
              {selected.map((a, idx) => (
                <article
                  key={a.id}
                  className="pf-item"
                  style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 24 }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <span style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.accent }}>
                      {String(idx + 1).padStart(2, "0")} · {ko ? POST_TYPE_LABELS[a.postType].ko : POST_TYPE_LABELS[a.postType].en}
                    </span>
                    <span style={{ fontFamily: F, fontSize: 10, color: colors.textLight }}>{fmtDate(a.createdAt, lang)}</span>
                  </div>

                  <div style={{ background: colors.bgAccent, display: "flex", justifyContent: "center" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.imageUrl}
                      alt={a.title || ""}
                      className="pf-img"
                      style={{ maxWidth: "100%", maxHeight: 560, width: "auto", height: "auto", objectFit: "contain", display: "block" }}
                    />
                  </div>

                  <div style={{ marginTop: 14 }}>
                    {a.title && (
                      <h2 style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: colors.textPrimary, margin: "0 0 4px", lineHeight: 1.3 }}>
                        {a.title}
                      </h2>
                    )}
                    {a.medium && (
                      <p style={{ fontFamily: F, fontSize: 12, fontStyle: "italic", color: colors.textMuted, margin: "0 0 8px" }}>{a.medium}</p>
                    )}
                    {a.caption && (
                      <p style={{ fontFamily: F, fontSize: 13, color: colors.textSecondary, margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                        {a.caption}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <footer style={{ marginTop: 48, paddingTop: 16, borderTop: `1px solid ${colors.border}`, textAlign: "center" }}>
              <p style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: colors.textLight, margin: 0 }}>
                {profile?.name ? `${profile.name} · ROB` : "ROB"}
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
