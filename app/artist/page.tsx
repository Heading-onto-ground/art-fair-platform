"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
type Gallery = {
  userId: string;
  name: string;
  email: string;
  country: string;
  city: string;
  profileImage?: string | null;
  foundedYear?: number;
};
type Role = "artist" | "gallery";
type MeResponse = { session: { userId: string; role: Role; email?: string } | null; profile: any | null };

function hostFromUrl(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function fetchMe(): Promise<MeResponse | null> {
  try { const res = await fetch("/api/auth/me", { cache: "no-store" }); return (await res.json().catch(() => null)) as MeResponse | null; }
  catch { return null; }
}

export default function ArtistPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const isAdminView = searchParams.get("adminView") === "1";
  const [me, setMe] = useState<MeResponse | null>(null);
  const [adminReadOnly, setAdminReadOnly] = useState(false);
  const [ready, setReady] = useState(false);
  const { data: ocData, error: ocError, isLoading: ocLoading, mutate: mutateOc } = useFetch<{ openCalls: OpenCall[] }>(ready ? "/api/open-calls" : null);
  const { data: galleryData, error: galleryError, isLoading: galleryLoading, mutate: mutateGalleries } =
    useFetch<{ galleries: Gallery[] }>(ready ? "/api/public/galleries" : null);
  const { data: appData, mutate: mutateApps } = useFetch<{ applications: { openCallId: string }[] }>(ready && !adminReadOnly ? "/api/applications" : null);
  const openCalls = ocData?.openCalls ?? [];
  const galleries = galleryData?.galleries ?? [];
  const appliedIds = useMemo(() => new Set<string>((appData?.applications ?? []).map((a) => a.openCallId)), [appData]);
  const loading = ocLoading;
  const error = ocError?.message ?? null;
  const [contactingId, setContactingId] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"open-calls" | "galleries">("open-calls");
  const [countryFilter, setCountryFilter] = useState<string>("ALL");
  const [galleryCountryFilter, setGalleryCountryFilter] = useState<string>("ALL");
  const [galleryCityFilter, setGalleryCityFilter] = useState<string>("ALL");
  const [galleryQuery, setGalleryQuery] = useState("");
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [hasAutoSelectedCountry, setHasAutoSelectedCountry] = useState(false);
  const [translatedById, setTranslatedById] = useState<
    Record<string, { theme?: string; galleryDescription?: string }>
  >({});
  const [showOriginalById, setShowOriginalById] = useState<Record<string, boolean>>({});
  const [translatingById, setTranslatingById] = useState<Record<string, boolean>>({});
  const preferredCountry = (me?.profile?.country ?? "").trim();

  function load() {
    mutateOc();
    mutateGalleries();
    if (!adminReadOnly) mutateApps();
  }

  async function applyToOpenCall(openCallId: string, galleryId: string) {
    if (adminReadOnly) {
      alert(lang === "ko" ? "관리자 미리보기 모드에서는 지원할 수 없습니다." : "Apply is disabled in admin preview mode.");
      return;
    }
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
      if (isAdminView) {
        const adminRes = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" }).catch(() => null);
        const adminData = adminRes ? await adminRes.json().catch(() => null) : null;
        if (adminData?.authenticated) {
          setAdminReadOnly(true);
          setReady(true);
          return;
        }
      }
      const m = await fetchMe();
      if (!m?.session) { router.replace("/login?role=artist"); return; }
      if (m.session.role !== "artist") { router.replace("/gallery"); return; }
      setMe(m);
      setReady(true); // Triggers SWR fetches
    })();
  }, [router, isAdminView]);

  // Dynamic country list from data
  const countries = useMemo(() => {
    const set = new Set(
      openCalls.map((o) => (o.country ?? "").trim()).filter(Boolean)
    );
    const ordered = Array.from(set);
    if (preferredCountry) {
      const idx = ordered.indexOf(preferredCountry);
      if (idx > 0) {
        ordered.splice(idx, 1);
        ordered.unshift(preferredCountry);
      }
    }
    return ["ALL", ...ordered];
  }, [openCalls, preferredCountry]);

  const filtered = useMemo(() => {
    if (countryFilter === "ALL") return openCalls;
    return openCalls.filter((o) => (o.country ?? "").trim() === countryFilter);
  }, [openCalls, countryFilter]);

  const galleryCountries = useMemo(() => {
    const set = new Set(galleries.map((g) => (g.country ?? "").trim()).filter(Boolean));
    return ["ALL", ...Array.from(set)];
  }, [galleries]);

  const galleryCities = useMemo(() => {
    const scoped =
      galleryCountryFilter === "ALL"
        ? galleries
        : galleries.filter((g) => (g.country ?? "").trim() === galleryCountryFilter);
    const set = new Set(scoped.map((g) => (g.city ?? "").trim()).filter(Boolean));
    return ["ALL", ...Array.from(set)];
  }, [galleries, galleryCountryFilter]);

  useEffect(() => {
    if (!galleryCities.includes(galleryCityFilter)) setGalleryCityFilter("ALL");
  }, [galleryCities, galleryCityFilter]);

  const filteredGalleries = useMemo(() => {
    const q = galleryQuery.trim().toLowerCase();
    return galleries.filter((g) => {
      if (galleryCountryFilter !== "ALL" && (g.country ?? "").trim() !== galleryCountryFilter) return false;
      if (galleryCityFilter !== "ALL" && (g.city ?? "").trim() !== galleryCityFilter) return false;
      if (!q) return true;
      return (
        (g.name || "").toLowerCase().includes(q) ||
        (g.email || "").toLowerCase().includes(q) ||
        (g.city || "").toLowerCase().includes(q)
      );
    });
  }, [galleries, galleryCountryFilter, galleryCityFilter, galleryQuery]);

  useEffect(() => {
    if (hasAutoSelectedCountry) return;
    if (countryFilter !== "ALL") {
      setHasAutoSelectedCountry(true);
      return;
    }
    if (!preferredCountry) return;
    if (!countries.includes(preferredCountry)) return;
    setCountryFilter(preferredCountry);
    setHasAutoSelectedCountry(true);
  }, [hasAutoSelectedCountry, countryFilter, preferredCountry, countries]);

  async function translateOpenCall(id: string, theme: string, galleryDescription?: string) {
    const texts = [theme, galleryDescription?.trim() || ""].filter(Boolean);
    if (texts.length === 0) return;
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts, targetLang: lang }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data?.translated)) return;
    const translated = data.translated as string[];
    setTranslatedById((prev) => ({
      ...prev,
      [id]: {
        theme: translated[0] || prev[id]?.theme,
        galleryDescription: texts.length > 1 ? translated[1] || prev[id]?.galleryDescription : prev[id]?.galleryDescription,
      },
    }));
  }

  async function toggleTranslation(openCall: OpenCall) {
    if (lang === "en") return;
    const hasTranslated = !!translatedById[openCall.id]?.theme;
    if (hasTranslated) {
      setShowOriginalById((prev) => ({ ...prev, [openCall.id]: !prev[openCall.id] }));
      return;
    }
    setTranslatingById((prev) => ({ ...prev, [openCall.id]: true }));
    try {
      await translateOpenCall(openCall.id, openCall.theme, openCall.galleryDescription);
      setShowOriginalById((prev) => ({ ...prev, [openCall.id]: false }));
    } finally {
      setTranslatingById((prev) => ({ ...prev, [openCall.id]: false }));
    }
  }

  useEffect(() => {
    if (lang === "en" || openCalls.length === 0) return;
    const targets = openCalls
      .filter((o) => !translatedById[o.id]?.theme)
      .slice(0, 20);
    if (targets.length === 0) return;
    (async () => {
      for (const item of targets) {
        await translateOpenCall(item.id, item.theme, item.galleryDescription);
      }
    })();
  }, [openCalls, lang, translatedById]);

  async function contactGallery(openCallId: string, galleryId: string) {
    if (adminReadOnly) {
      setContactError(lang === "ko" ? "관리자 미리보기 모드에서는 메시지를 보낼 수 없습니다." : "Messaging is disabled in admin preview mode.");
      return;
    }
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
          .oc-poster { width: 100% !important; height: auto !important; aspect-ratio: 3/4 !important; max-height: 280px !important; }
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
        {adminReadOnly && (
          <div style={{ marginBottom: 20, padding: "12px 14px", border: "1px solid #E8E3DB", background: "#FAF8F4", color: "#8A8580", fontFamily: F, fontSize: 11, letterSpacing: "0.04em" }}>
            {lang === "ko" ? "관리자 미리보기 모드 (읽기 전용)" : "Admin preview mode (read-only)"}
          </div>
        )}

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

        {/* View tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <button
            onClick={() => setActiveTab("open-calls")}
            style={{
              padding: "10px 16px",
              border: activeTab === "open-calls" ? "1px solid #1A1A1A" : "1px solid #E8E3DB",
              background: activeTab === "open-calls" ? "#1A1A1A" : "#FFFFFF",
              color: activeTab === "open-calls" ? "#FFFFFF" : "#8A8580",
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {lang === "ko" ? "오픈콜 탭" : lang === "ja" ? "オープンコール" : "Open Calls"}
          </button>
          <button
            onClick={() => setActiveTab("galleries")}
            style={{
              padding: "10px 16px",
              border: activeTab === "galleries" ? "1px solid #1A1A1A" : "1px solid #E8E3DB",
              background: activeTab === "galleries" ? "#1A1A1A" : "#FFFFFF",
              color: activeTab === "galleries" ? "#FFFFFF" : "#8A8580",
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {lang === "ko" ? "갤러리 목록 탭" : lang === "ja" ? "ギャラリー一覧" : "Gallery List"}
          </button>
        </div>

        {activeTab === "open-calls" ? (
          <>
            {/* Country tabs - dynamic */}
            <div className="country-tabs" style={{ display: "flex", gap: 0, marginBottom: 32, overflowX: "auto", borderBottom: "1px solid #E8E3DB", WebkitOverflowScrolling: "touch" }}>
              {countries.map((c) => {
                const active = c === countryFilter;
                return (
                  <button key={c} onClick={() => setCountryFilter(c)} style={{ padding: "14px 20px", border: "none", borderBottom: active ? "1px solid #1A1A1A" : "1px solid transparent", background: "transparent", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: active ? "#1A1A1A" : "#B0AAA2", cursor: "pointer", marginBottom: -1, whiteSpace: "nowrap", transition: "all 0.3s" }}>
                    {c}
                  </button>
                );
              })}
            </div>

            {/* Open-call content */}
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
                      <OpenCallPoster className="oc-poster" posterImage={o.posterImage} gallery={o.gallery} theme={o.theme} city={o.city} country={o.country} deadline={o.deadline} width={100} height={134} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                          <span style={{ fontFamily: S, fontSize: 18, fontWeight: 300, color: "#D4CEC4" }}>{String(index + 1).padStart(2, "0")}</span>
                          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355" }}>{o.country} / {o.city}</span>
                        </div>
                        <h3 style={{ fontFamily: S, fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 400, color: "#1A1A1A", marginBottom: 6 }}>{o.gallery}</h3>
                        <p style={{ fontFamily: F, fontSize: 13, fontWeight: 300, color: "#8A8580", wordBreak: "break-word" }}>
                          {lang !== "en" && translatedById[o.id]?.theme && !showOriginalById[o.id] ? translatedById[o.id]?.theme : o.theme}
                        </p>
                      </div>
                      <div className="oc-card-right" style={{ textAlign: "right", flexShrink: 0, marginLeft: 24 }}>
                        <span style={{ fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#B0AAA2" }}>{t("deadline", lang)}</span>
                        <div style={{ fontFamily: S, fontSize: 18, fontWeight: 400, color: "#1A1A1A", marginTop: 4 }}>{o.deadline}</div>
                      </div>
                    </div>
                    <div className="oc-card-actions" style={{ marginTop: 16, display: "flex", gap: 10 }}>
                      {adminReadOnly ? (
                        <span style={{ padding: "10px 20px", border: "1px solid #E8E3DB", color: "#8A8580", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                          {lang === "ko" ? "읽기 전용" : "Read-only"}
                        </span>
                      ) : appliedIds.has(o.id) ? (
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
          </>
        ) : (
          <>
            {/* Gallery list filters */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {galleryCountries.map((c) => (
                <button key={c} onClick={() => { setGalleryCountryFilter(c); setGalleryCityFilter("ALL"); }}
                  style={{ padding: "8px 12px", border: c === galleryCountryFilter ? "1px solid #1A1A1A" : "1px solid #E8E3DB", background: c === galleryCountryFilter ? "#1A1A1A" : "#FFFFFF", color: c === galleryCountryFilter ? "#FFFFFF" : "#8A8580", fontFamily: F, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                  {c}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {galleryCities.map((c) => (
                <button key={c} onClick={() => setGalleryCityFilter(c)}
                  style={{ padding: "7px 12px", border: c === galleryCityFilter ? "1px solid #8B7355" : "1px solid #E8E3DB", background: c === galleryCityFilter ? "rgba(139,115,85,0.08)" : "#FFFFFF", color: c === galleryCityFilter ? "#8B7355" : "#8A8580", fontFamily: F, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                  {c}
                </button>
              ))}
            </div>
            <div style={{ marginBottom: 20 }}>
              <input
                value={galleryQuery}
                onChange={(e) => setGalleryQuery(e.target.value)}
                placeholder={lang === "ko" ? "갤러리명/이메일/도시 검색..." : lang === "ja" ? "ギャラリー名/メール/都市を検索..." : "Search gallery name/email/city..."}
                style={{ width: "100%", maxWidth: 420, padding: "12px 14px", border: "1px solid #E8E3DB", background: "#FFFFFF", fontFamily: F, fontSize: 12, color: "#1A1A1A", outline: "none" }}
              />
            </div>

            {galleryLoading ? (
              <div style={{ padding: "clamp(20px, 3vw, 48px)" }}>
                <CardSkeleton count={5} />
              </div>
            ) : galleryError ? (
              <div style={{ padding: 20, border: "1px solid rgba(139,74,74,0.2)", background: "rgba(139,74,74,0.04)", color: "#8B4A4A", fontFamily: F, fontSize: 12 }}>
                {galleryError.message}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
                {filteredGalleries.map((g, idx) => (
                  <div key={g.userId} onClick={() => router.push(`/galleries/${encodeURIComponent(g.userId)}`)}
                    style={{ background: "#FFFFFF", padding: "18px 20px", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#FAF8F4"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <span style={{ fontFamily: S, fontSize: 16, color: "#D4CEC4" }}>{String(idx + 1).padStart(2, "0")}</span>
                          <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8B7355" }}>
                            {[g.country, g.city].filter(Boolean).join(" / ")}
                          </span>
                        </div>
                        <h3 style={{ fontFamily: S, fontSize: 22, fontWeight: 400, color: "#1A1A1A", margin: 0 }}>{g.name}</h3>
                        <p style={{ fontFamily: F, fontSize: 11, color: "#8A8580", marginTop: 6 }}>{g.email}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/galleries/${encodeURIComponent(g.userId)}`); }}
                        style={{ padding: "9px 14px", border: "1px solid #E8E3DB", background: "#FFFFFF", color: "#8A8580", fontFamily: F, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer" }}
                      >
                        {lang === "ko" ? "상세 보기" : lang === "ja" ? "詳細" : "View"}
                      </button>
                    </div>
                  </div>
                ))}
                {filteredGalleries.length === 0 && (
                  <div style={{ background: "#FFFFFF", padding: 48, textAlign: "center" }}>
                    <p style={{ fontFamily: S, fontSize: 18, fontStyle: "italic", color: "#B0AAA2" }}>
                      {lang === "ko" ? "조건에 맞는 갤러리가 없습니다." : lang === "ja" ? "条件に合うギャラリーがありません。" : "No galleries found."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
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
