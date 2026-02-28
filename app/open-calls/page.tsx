"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import SignupPromptModal from "@/app/components/SignupPromptModal";
import { CardSkeleton } from "@/app/components/Skeleton";
import OpenCallPoster from "@/app/components/OpenCallPoster";
import { useFetch } from "@/lib/useFetch";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/translate";
import { F, S } from "@/lib/design";

type OpenCall = {
  id: string; galleryId: string; gallery: string; city: string; country: string;
  theme: string; deadline: string; exhibitionDate?: string; posterImage?: string | null;
  isExternal?: boolean; externalUrl?: string;
  galleryWebsite?: string; galleryDescription?: string;
};

type MeResponse = { session: { userId: string; role: string } | null; profile: any | null };

function normalizeCountry(input: string): string {
  const v = String(input || "").trim();
  if (!v) return v;
  const compact = v.replace(/\s+/g, "").toLowerCase();
  if (compact === "대한민국" || compact === "한국" || compact === "southkorea" || compact === "republicofkorea") {
    return "한국";
  }
  return v;
}

function computeMatchScore(profile: any, oc: OpenCall): number {
  if (!profile) return 0;
  let score = 0;
  // Country match: 35pts
  if (profile.country && normalizeCountry(profile.country) === normalizeCountry(oc.country)) score += 35;
  // Genre keyword in theme/description: 40pts
  const genre = String(profile.genre || "").toLowerCase().trim();
  if (genre) {
    const haystack = `${oc.theme} ${oc.galleryDescription || ""}`.toLowerCase();
    const words = genre.split(/\s+/).filter((w: string) => w.length > 2);
    const matched = words.filter((w: string) => haystack.includes(w));
    if (matched.length > 0) score += Math.round(40 * matched.length / Math.max(words.length, 1));
  }
  // City match: 15pts
  if (profile.city && oc.city && profile.city.toLowerCase() === oc.city.toLowerCase()) score += 15;
  // Bio keyword overlap with theme: 10pts
  const bio = String(profile.bio || "").toLowerCase();
  if (bio) {
    const themeWords = oc.theme.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    if (themeWords.some((w: string) => bio.includes(w))) score += 10;
  }
  return Math.min(score, 100);
}

export default function OpenCallsPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useFetch<{ openCalls: OpenCall[] }>("/api/open-calls");
  const openCalls = data?.openCalls ?? [];
  const [countryFilter, setCountryFilter] = useState<string>("ALL");
  const [showSignup, setShowSignup] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [preferredCountry, setPreferredCountry] = useState("");
  const [artistProfile, setArtistProfile] = useState<any>(null);
  const [hasAutoSelectedCountry, setHasAutoSelectedCountry] = useState(false);
  const [translatedById, setTranslatedById] = useState<
    Record<string, { theme?: string; galleryDescription?: string }>
  >({});
  const [showOriginalById, setShowOriginalById] = useState<Record<string, boolean>>({});
  const [translatingById, setTranslatingById] = useState<Record<string, boolean>>({});
  const { lang } = useLanguage();
  const normalizedPreferredCountry = useMemo(() => normalizeCountry(preferredCountry), [preferredCountry]);

  function load() {
    mutate();
  }

  useEffect(() => {
    // Check login status
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: MeResponse) => {
        setIsLoggedIn(!!data?.session);
        setPreferredCountry((data?.profile?.country ?? "").trim());
        if (data?.session?.role === "artist") setArtistProfile(data?.profile ?? null);
      })
      .catch(() => {
        setIsLoggedIn(false);
        setPreferredCountry("");
      });
  }, []);

  const countries = useMemo(() => {
    const set = new Set(
      openCalls.map((o) => normalizeCountry((o.country ?? "").trim())).filter(Boolean)
    );
    const ordered = Array.from(set);
    if (preferredCountry) {
      const idx = ordered.indexOf(normalizeCountry(preferredCountry));
      if (idx > 0) {
        ordered.splice(idx, 1);
        ordered.unshift(normalizeCountry(preferredCountry));
      }
    }
    return ["ALL", ...ordered];
  }, [openCalls, preferredCountry]);

  const openCallCountryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: openCalls.length };
    for (const o of openCalls) {
      const c = normalizeCountry((o.country ?? "").trim());
      if (!c) continue;
      counts[c] = (counts[c] || 0) + 1;
    }
    return counts;
  }, [openCalls]);

  const filtered = useMemo(() => {
    if (countryFilter === "ALL") return openCalls;
    return openCalls.filter((o) => normalizeCountry((o.country ?? "").trim()) === countryFilter);
  }, [openCalls, countryFilter]);

  useEffect(() => {
    // Prefetch likely detail routes to make list -> detail navigation feel instant.
    for (const item of filtered.slice(0, 16)) {
      router.prefetch(`/open-calls/${item.id}`);
    }
  }, [router, filtered]);

  useEffect(() => {
    if (hasAutoSelectedCountry) return;
    if (countryFilter !== "ALL") {
      setHasAutoSelectedCountry(true);
      return;
    }
    if (!normalizedPreferredCountry) return;
    if (!countries.includes(normalizedPreferredCountry)) return;
    setCountryFilter(normalizedPreferredCountry);
    setHasAutoSelectedCountry(true);
  }, [hasAutoSelectedCountry, countryFilter, normalizedPreferredCountry, countries]);

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
      .slice(0, 8);
    if (targets.length === 0) return;
    (async () => {
      for (const item of targets) {
        await translateOpenCall(item.id, item.theme, item.galleryDescription);
      }
    })();
  }, [openCalls, lang, translatedById]);

  return (
    <>
      <TopBar />
      <style jsx global>{`
        @media (max-width: 768px) {
          .oc-list-inner { flex-direction: column !important; }
          .oc-list-poster { width: 100% !important; height: auto !important; aspect-ratio: 3/4 !important; max-height: 300px !important; }
        }
      `}</style>
      <main style={{ padding: "56px 40px", maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48 }}>
          <div>
            <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", color: "#8B7355", textTransform: "uppercase" }}>{t("oc_opportunities", lang)}</span>
            <h1 style={{ fontFamily: S, fontSize: 42, fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>{t("oc_title", lang)}</h1>
          </div>
          <button onClick={load} style={{ padding: "10px 20px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
            {t("refresh", lang)}
          </button>
        </div>

        {/* Country tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 40, overflowX: "auto", borderBottom: "1px solid #E8E3DB" }}>
          {countries.map((c) => {
            const active = c === countryFilter;
            return (
              <button
                key={c}
                onClick={() => setCountryFilter(c)}
                style={{
                  padding: "14px 20px",
                  border: "none",
                  borderBottom: active ? "1px solid #1A1A1A" : "1px solid transparent",
                  background: "transparent",
                  fontFamily: F,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: active ? "#1A1A1A" : "#B0AAA2",
                  cursor: "pointer",
                  marginBottom: -1,
                  whiteSpace: "nowrap",
                  transition: "all 0.3s",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>{c}</span>
                <span
                  style={{
                    fontSize: 9,
                    opacity: 0.85,
                    padding: "2px 6px",
                    background: active ? "rgba(26,26,26,0.08)" : "#F5F0EB",
                    color: active ? "#1A1A1A" : "#8A8580",
                  }}
                >
                  {openCallCountryCounts[c] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <CardSkeleton count={5} />
        ) : error ? (
          <div style={{ padding: 20, border: "1px solid rgba(139,74,74,0.2)", background: "rgba(139,74,74,0.04)", color: "#8B4A4A", fontFamily: F, fontSize: 12 }}>{error?.message ?? "Failed to load"}</div>
        ) : (
          <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
            {filtered.map((o, index) => (
              <div key={o.id} onClick={() => { if (!isLoggedIn) { setShowSignup(true); return; } router.push(`/open-calls/${o.id}`); }} style={{ background: "#FFFFFF", padding: "32px 36px", cursor: "pointer", transition: "background 0.3s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#FAF8F4"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}>
                <div className="oc-list-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
                  {/* Poster Image */}
                  <OpenCallPoster
                    className="oc-list-poster"
                    posterImage={o.posterImage}
                    gallery={o.gallery}
                    theme={o.theme}
                    city={o.city}
                    country={o.country}
                    deadline={o.deadline}
                    width={110}
                    height={148}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <span style={{ fontFamily: S, fontSize: 20, fontWeight: 300, color: "#D4CEC4" }}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355" }}>
                        {o.country} / {o.city}
                      </span>
                    </div>
                    <h3 style={{ fontFamily: S, fontSize: 24, fontWeight: 400, color: "#1A1A1A", marginBottom: 6 }}>
                      {o.gallery}
                    </h3>
                    <p style={{ fontFamily: F, fontSize: 13, fontWeight: 300, color: "#8A8580" }}>
                      {lang !== "en" && translatedById[o.id]?.theme && !showOriginalById[o.id]
                        ? translatedById[o.id]?.theme
                        : o.theme}
                    </p>
                    <p
                      style={{
                        fontFamily: F,
                        fontSize: 12,
                        fontWeight: 300,
                        color: "#6A6660",
                        marginTop: 10,
                        lineHeight: 1.6,
                      }}
                    >
                      {lang === "ko"
                        ? `오픈콜 정보 · 전시 ${o.exhibitionDate || "-"} · 지원 마감 ${o.deadline}`
                        : lang === "ja"
                          ? `オープンコール情報 · 展示日 ${o.exhibitionDate || "-"} · 応募締切 ${o.deadline}`
                          : `Open call info · Exhibition ${o.exhibitionDate || "-"} · Deadline ${o.deadline}`}
                    </p>
                    {lang !== "en" && (
                      <div style={{ marginTop: 10 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTranslation(o);
                          }}
                          disabled={!!translatingById[o.id]}
                          style={{
                            fontFamily: F,
                            fontSize: 10,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "#8A8580",
                            border: "1px solid #E8E3DB",
                            padding: "6px 10px",
                            background: "#FFFFFF",
                            cursor: translatingById[o.id] ? "wait" : "pointer",
                          }}
                        >
                          {translatingById[o.id]
                            ? "..."
                            : showOriginalById[o.id]
                              ? t("oc_show_translation", lang)
                              : t("oc_show_original", lang)}
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 24 }}>
                    {artistProfile && (() => {
                      const score = computeMatchScore(artistProfile, o);
                      if (score === 0) return null;
                      const color = score >= 70 ? "#3D6B3D" : score >= 40 ? "#7A6030" : "#8A8580";
                      const bg = score >= 70 ? "rgba(61,107,61,0.08)" : score >= 40 ? "rgba(122,96,48,0.08)" : "rgba(138,133,128,0.08)";
                      return (
                        <div style={{ marginBottom: 8, padding: "4px 10px", background: bg, border: `1px solid ${color}22`, display: "inline-block" }}>
                          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 600, color, letterSpacing: "0.06em" }}>
                            {score}% {lang === "ko" ? "매칭" : lang === "ja" ? "マッチ" : "Match"}
                          </span>
                        </div>
                      );
                    })()}
                    <span style={{ fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#B0AAA2" }}>
                      {lang === "ko" ? "작가 지원 마감일" : t("deadline", lang)}
                    </span>
                    <div style={{ fontFamily: S, fontSize: 18, fontWeight: 400, color: "#1A1A1A", marginTop: 4 }}>{o.deadline}</div>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ background: "#FFFFFF", padding: 48, textAlign: "center" }}>
                <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>{t("oc_no_results", lang)}</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Signup modal for non-logged-in users */}
      <SignupPromptModal isOpen={showSignup} onClose={() => setShowSignup(false)} context="view" />
    </>
  );
}
