"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import RecommendationBanner from "@/app/components/RecommendationBanner";
import { CardSkeleton } from "@/app/components/Skeleton";
import OpenCallPoster from "@/app/components/OpenCallPoster";
import { useFetch } from "@/lib/useFetch";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/translate";
import { F, S } from "@/lib/design";

type OpenCall = {
  id: string; galleryId: string; gallery: string; city: string; country: string;
  theme: string; deadline: string; posterImage?: string | null;
  isExternal?: boolean; externalUrl?: string;
  galleryWebsite?: string; galleryDescription?: string;
};
type Role = "artist" | "gallery";
type MeResponse = { session: { userId: string; role: Role; email?: string } | null; profile: any | null };

async function fetchMe(): Promise<MeResponse | null> {
  try { const res = await fetch("/api/auth/me", { cache: "no-store" }); return (await res.json().catch(() => null)) as MeResponse | null; }
  catch { return null; }
}

export default function ArtistPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [ready, setReady] = useState(false);
  const { data: ocData, error: ocError, isLoading: ocLoading, mutate: mutateOc } = useFetch<{ openCalls: OpenCall[] }>(ready ? "/api/open-calls" : null);
  const { data: appData, mutate: mutateApps } = useFetch<{ applications: { openCallId: string }[] }>(ready ? "/api/applications" : null);
  const openCalls = ocData?.openCalls ?? [];
  const appliedIds = useMemo(() => new Set<string>((appData?.applications ?? []).map((a) => a.openCallId)), [appData]);
  const loading = ocLoading;
  const error = ocError?.message ?? null;
  const [contactingId, setContactingId] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string>("ALL");
  const [applyingId, setApplyingId] = useState<string | null>(null);

  function load() { mutateOc(); mutateApps(); }

  async function applyToOpenCall(openCallId: string, galleryId: string) {
    setApplyingId(openCallId);
    try {
      const res = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ openCallId, galleryId }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.application) { alert(data?.error || "Application failed"); return; }
      mutateApps(); // Refresh applied IDs
      if (data.emailSent) alert("Application submitted! Your portfolio has been emailed to the gallery.");
      else alert("Application submitted successfully.");
    } catch { alert("Server error"); }
    finally { setApplyingId(null); }
  }

  useEffect(() => {
    (async () => {
      const m = await fetchMe();
      if (!m?.session) { router.replace("/login?role=artist"); return; }
      if (m.session.role !== "artist") { router.replace("/gallery"); return; }
      setMe(m);
      setReady(true); // Triggers SWR fetches
    })();
  }, [router]);

  // Dynamic country list from data
  const countries = useMemo(() => {
    const set = new Set(openCalls.map(o => o.country));
    return ["ALL", ...Array.from(set)];
  }, [openCalls]);

  const filtered = useMemo(() => {
    if (countryFilter === "ALL") return openCalls;
    return openCalls.filter((o) => (o.country ?? "").trim() === countryFilter);
  }, [openCalls, countryFilter]);

  async function contactGallery(openCallId: string, galleryId: string) {
    setContactError(null); setContactingId(openCallId);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ openCallId, galleryId }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.roomId) throw new Error(data?.error ?? "Failed");
      router.push(`/chat/${String(data.roomId)}`);
    } catch (e: any) { setContactError(e?.message ?? "Failed"); }
    finally { setContactingId(null); }
  }

  return (
    <>
      <TopBar />
      <style jsx global>{`
        @media (max-width: 768px) {
          .artist-header { flex-direction: column !important; align-items: flex-start !important; gap: 20px !important; }
          .artist-header-btns { width: 100% !important; flex-wrap: wrap !important; }
          .artist-header-btns > * { flex: 1 1 auto !important; text-align: center !important; }
          .oc-card-inner { flex-direction: column !important; }
          .oc-poster { width: 100% !important; height: 180px !important; }
          .oc-card-right { text-align: left !important; margin-left: 0 !important; margin-top: 12px !important; }
          .oc-card-actions { flex-wrap: wrap !important; }
          .country-tabs { -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .country-tabs::-webkit-scrollbar { display: none; }
        }
      `}</style>
      <main style={{ padding: "40px 20px", maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <div className="artist-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36 }}>
          <div>
            <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>{t("artist_dashboard", lang)}</span>
            <h1 style={{ fontFamily: S, fontSize: "clamp(28px, 6vw, 42px)", fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>
              {t("artist_page_title", lang)}
            </h1>
            <p style={{ fontFamily: F, fontSize: 12, fontWeight: 300, color: "#8A8580", marginTop: 8 }}>
              {t("artist_browse_desc", lang)}
            </p>
          </div>
          <div className="artist-header-btns" style={{ display: "flex", gap: 10 }}>
            <button onClick={load} style={{ padding: "10px 16px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1A1A1A"; e.currentTarget.style.color = "#1A1A1A"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8E3DB"; e.currentTarget.style.color = "#8A8580"; }}>
              {t("refresh", lang)}
            </button>
            <button onClick={() => router.push("/artist/me")} style={{ padding: "10px 16px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1A1A1A"; e.currentTarget.style.color = "#1A1A1A"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8E3DB"; e.currentTarget.style.color = "#8A8580"; }}>
              {t("artist_my_profile", lang)}
            </button>
            <Link href="/open-calls" style={{ padding: "10px 16px", border: "1px solid #1A1A1A", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
              {t("artist_full_list", lang)}
            </Link>
          </div>
        </div>

        {/* Personalized Recommendations */}
        <RecommendationBanner />

        {/* Community Section */}
        <div style={{ marginBottom: 36, border: "1px solid #E8E3DB", background: "#FFFFFF", padding: "clamp(20px, 3vw, 32px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
                {t("artist_community", lang)}
              </span>
              <h2 style={{ fontFamily: S, fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 300, color: "#1A1A1A", marginTop: 6, marginBottom: 4 }}>
                {t("artist_community_title", lang)}
              </h2>
              <p style={{ fontFamily: F, fontSize: 12, fontWeight: 300, color: "#8A8580", maxWidth: 500 }}>
                {t("artist_community_desc", lang)}
              </p>
            </div>
          </div>
          <div className="community-btns" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/community?cat=find_collab" style={{
              padding: "12px 20px", border: "1px solid #8B7355", background: "rgba(139,115,85,0.06)", color: "#8B7355",
              fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none",
              display: "flex", alignItems: "center", gap: 8, transition: "all 0.3s",
            }}>
              <span style={{ fontSize: 14 }}>🎭</span> {t("artist_find_collab", lang)}
            </Link>
            <Link href="/community?cat=daily" style={{
              padding: "12px 20px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580",
              fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none",
              display: "flex", alignItems: "center", gap: 8, transition: "all 0.3s",
            }}>
              <span style={{ fontSize: 14 }}>☕</span> {t("artist_share_daily", lang)}
            </Link>
            <Link href="/community" style={{
              padding: "12px 20px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580",
              fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none",
              display: "flex", alignItems: "center", gap: 8, transition: "all 0.3s",
            }}>
              <span style={{ fontSize: 14 }}>💬</span> {t("artist_all_posts", lang)}
            </Link>
          </div>
        </div>

        {/* Country tabs - dynamic */}
        <div className="country-tabs" style={{ display: "flex", gap: 0, marginBottom: 32, overflowX: "auto", borderBottom: "1px solid #E8E3DB", WebkitOverflowScrolling: "touch" }}>
          {countries.map((c, i) => {
            const active = c === countryFilter;
            return (
              <button key={c} onClick={() => setCountryFilter(c)} style={{ padding: "14px 20px", border: "none", borderBottom: active ? "1px solid #1A1A1A" : "1px solid transparent", background: "transparent", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: active ? "#1A1A1A" : "#B0AAA2", cursor: "pointer", marginBottom: -1, whiteSpace: "nowrap", transition: "all 0.3s" }}>
                {c}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ padding: "clamp(20px, 3vw, 48px)" }}>
            <CardSkeleton count={5} />
          </div>
        ) : error ? (
          <div style={{ padding: 20, border: "1px solid rgba(139,74,74,0.2)", background: "rgba(139,74,74,0.04)", color: "#8B4A4A", fontFamily: F, fontSize: 12 }}>
            {error}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
            {filtered.map((o, index) => (
              <div key={o.id} onClick={() => router.push(`/open-calls/${o.id}`)} style={{ background: "#FFFFFF", padding: "clamp(20px, 3vw, 32px) clamp(16px, 3vw, 36px)", cursor: "pointer", transition: "background 0.3s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#FAF8F4"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}>
                <div className="oc-card-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
                  {/* Poster Image */}
                  <OpenCallPoster
                    className="oc-poster"
                    posterImage={o.posterImage}
                    gallery={o.gallery}
                    theme={o.theme}
                    city={o.city}
                    country={o.country}
                    deadline={o.deadline}
                    width={140}
                    height={100}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <span style={{ fontFamily: S, fontSize: 18, fontWeight: 300, color: "#D4CEC4" }}>{String(index + 1).padStart(2, "0")}</span>
                      <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355" }}>{o.country} / {o.city}</span>
                    </div>
                    <h3 style={{ fontFamily: S, fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 400, color: "#1A1A1A", marginBottom: 6 }}>
                      {o.gallery}
                    </h3>
                    <p style={{ fontFamily: F, fontSize: 13, fontWeight: 300, color: "#8A8580", wordBreak: "break-word" }}>{o.theme}</p>
                  </div>
                  <div className="oc-card-right" style={{ textAlign: "right", flexShrink: 0, marginLeft: 24 }}>
                    <span style={{ fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#B0AAA2" }}>{t("deadline", lang)}</span>
                    <div style={{ fontFamily: S, fontSize: 18, fontWeight: 400, color: "#1A1A1A", marginTop: 4 }}>{o.deadline}</div>
                  </div>
                </div>

                <div className="oc-card-actions" style={{ marginTop: 16, display: "flex", gap: 10 }}>
                  {appliedIds.has(o.id) ? (
                    <span style={{ padding: "10px 20px", border: "1px solid #5A7A5A", color: "#5A7A5A", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>{t("applied", lang)}</span>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); applyToOpenCall(o.id, o.galleryId); }} disabled={applyingId === o.id}
                      style={{ padding: "10px 20px", border: "none", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                      {applyingId === o.id ? "..." : t("apply", lang)}
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); router.push(`/open-calls/${o.id}`); }}
                    style={{ padding: "10px 20px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                    {t("details", lang)}
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{ background: "#FFFFFF", padding: 48, textAlign: "center" }}>
                <p style={{ fontFamily: S, fontSize: 18, fontStyle: "italic", color: "#B0AAA2" }}>{t("artist_no_open_calls", lang)}</p>
              </div>
            )}
          </div>
        )}

        {contactError && (
          <div style={{ marginTop: 20, padding: 16, border: "1px solid rgba(139,74,74,0.2)", background: "rgba(139,74,74,0.04)", color: "#8B4A4A", fontFamily: F, fontSize: 12 }}>
            {contactError}
          </div>
        )}
      </main>
    </>
  );
}
