"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import ArtistBottomNav from "@/app/components/ArtistBottomNav";
import { CardSkeleton } from "@/app/components/Skeleton";
import OpenCallPoster from "@/app/components/OpenCallPoster";
import { useFetch } from "@/lib/useFetch";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/translate";
import { F, S } from "@/lib/design";
import { applicationRouteLabel, costSummary, deadlineStatus, eligibilityDisplay, listingFacts, locationLine, organizerDisplay, typeDisplay } from "@/lib/openCall/listingFacts";
import { preparationStatusLabel, type PreparationStatus } from "@/lib/openCall/preparationStatus";

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

function formatDeadlineLocal(deadline: string, lang: string): string {
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return deadline;
  const locale = lang === "ko" ? "ko-KR" : lang === "ja" ? "ja-JP" : lang === "fr" ? "fr-FR" : "en-US";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(d);
}

type ScoreBreakdown = { country: number; genre: number; city: number; bio: number; total: number };

function computeMatchScore(profile: any, oc: OpenCall, cityNeedsCheck: boolean): ScoreBreakdown {
  const result: ScoreBreakdown = { country: 0, genre: 0, city: 0, bio: 0, total: 0 };
  if (!profile) return result;
  if (profile.country && normalizeCountry(profile.country) === normalizeCountry(oc.country)) result.country = 35;
  const genre = String(profile.genre || "").toLowerCase().trim();
  if (genre) {
    const haystack = `${oc.theme} ${oc.galleryDescription || ""}`.toLowerCase();
    const words = genre.split(/\s+/).filter((w: string) => w.length > 2);
    const matched = words.filter((w: string) => haystack.includes(w));
    if (matched.length > 0) result.genre = Math.round(40 * matched.length / Math.max(words.length, 1));
  }
  if (!cityNeedsCheck && profile.city && oc.city && profile.city.toLowerCase() === oc.city.toLowerCase()) result.city = 15;
  const bio = String(profile.bio || "").toLowerCase();
  if (bio) {
    const themeWords = oc.theme.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    if (themeWords.some((w: string) => bio.includes(w))) result.bio = 10;
  }
  result.total = Math.min(result.country + result.genre + result.city + result.bio, 100);
  return result;
}

export default function OpenCallsPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useFetch<{ openCalls: OpenCall[] }>("/api/open-calls");
  const openCalls = data?.openCalls ?? [];
  const [countryFilter, setCountryFilter] = useState<string>("ALL");
  const [preferredCountry, setPreferredCountry] = useState("");
  const [artistProfile, setArtistProfile] = useState<any>(null);
  const [scoreModal, setScoreModal] = useState<{ oc: OpenCall; breakdown: ScoreBreakdown } | null>(null);
  const [hasAutoSelectedCountry, setHasAutoSelectedCountry] = useState(false);
  const [appliedOpenCallIds, setAppliedOpenCallIds] = useState<Set<string>>(new Set());
  const [prepByOpenCallId, setPrepByOpenCallId] = useState<Record<string, PreparationStatus>>({});
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
        setPreferredCountry((data?.profile?.country ?? "").trim());
        if (data?.session?.role === "artist") {
          setArtistProfile(data?.profile ?? null);
          fetch("/api/applications", { credentials: "include" })
            .then((r) => r.json())
            .then((d) => {
              const ids = new Set<string>((d?.applications ?? []).map((a: any) => a.openCallId as string));
              setAppliedOpenCallIds(ids);
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        setPreferredCountry("");
      });
  }, []);

  useEffect(() => {
    if (!artistProfile || openCalls.length === 0) return;
    let cancelled = false;
    Promise.all(openCalls.map(async (oc) => {
      const res = await fetch(`/api/open-calls/${oc.id}/preparation`, { credentials: "include", cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      const status = data?.preparation?.status as PreparationStatus | undefined;
      return status ? [oc.id, status] as const : null;
    })).then((rows) => {
      if (cancelled) return;
      const next: Record<string, PreparationStatus> = {};
      for (const row of rows) if (row) next[row[0]] = row[1];
      setPrepByOpenCallId(next);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [artistProfile, openCalls]);

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
    document.title = lang === "ko"
      ? "전시·공모 오픈콜 | ROB"
      : "Exhibition and open-call opportunities | ROB";
  }, [lang]);

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

  return (
    <>
      <TopBar />
      <style jsx global>{`
        .oc-list-main { padding: 56px 40px 88px; max-width: 960px; margin: 0 auto; }
        .oc-list-title { font-family: var(--font-cormorant), Georgia, serif; font-size: 42px; font-weight: 400; color: #1A1A1A; margin: 8px 0 0; line-height: 1.15; }
        .oc-card-title { font-family: var(--font-cormorant), Georgia, serif; font-size: 24px; font-weight: 500; color: #1A1A1A; margin: 0 0 8px; line-height: 1.35; overflow-wrap: anywhere; }
        .oc-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin: 14px 0 0; padding: 0; list-style: none; }
        .oc-facts li { min-width: 0; }
        .oc-facts span { display: block; font-family: var(--font-inter), sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; color: #6A6660; margin-bottom: 2px; }
        .oc-facts strong { display: block; font-family: var(--font-inter), sans-serif; font-size: 14px; font-weight: 500; color: #1A1A1A; line-height: 1.45; overflow-wrap: anywhere; }
        .oc-next { display: inline-flex; align-items: center; margin-top: 14px; padding: 10px 14px; background: #1A1A1A; color: #FDFBF7; font-family: var(--font-inter), sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 0; text-decoration: none; }
        .oc-calendar { display: inline-flex; margin-top: 14px; margin-left: 8px; padding: 10px 12px; background: transparent; color: #5C5854; border: 1px solid #E8E3DB; font-family: var(--font-inter), sans-serif; font-size: 13px; text-decoration: none; }
        @media (max-width: 768px) {
          .oc-list-main { padding: 28px 16px calc(96px + env(safe-area-inset-bottom)) !important; }
          .oc-list-title { font-size: 34px; }
          .oc-list-inner { align-items: flex-start !important; }
          .oc-list-poster { width: 72px !important; height: 96px !important; max-height: 96px !important; aspect-ratio: auto !important; }
          .oc-list-side { text-align: left !important; margin-left: 0 !important; width: 100%; }
          .oc-facts { grid-template-columns: 1fr; }
        }
      `}</style>
      <main id="main-content" className="mobile-app-main oc-list-main">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 28 }}>
          <div>
            <span style={{ fontFamily: F, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "#8B7355", textTransform: "uppercase" }}>{t("oc_opportunities", lang)}</span>
            <h1 className="oc-list-title">{t("oc_title", lang)}</h1>
            <p style={{ fontFamily: F, fontSize: 16, lineHeight: 1.5, color: "#1A1A1A", maxWidth: 560, margin: "12px 0 0" }}>
              {lang === "ko" ? "다음 전시·공모, 마감과 비용부터 확인하세요." : "Check the deadline and costs before the next exhibition or open call."}
            </p>
            <p style={{ fontFamily: F, fontSize: 14, lineHeight: 1.6, color: "#3F3C38", maxWidth: 560, margin: "6px 0 0" }}>
              {lang === "ko"
                ? "목록은 공고를 비교하는 자리입니다. 확인되지 않은 자격과 비용은 미확인으로 두며, 접수는 외부 사이트와 ROB을 구분해 안내합니다."
                : "Use the list to compare calls. Unconfirmed eligibility and costs stay unconfirmed, and each call says whether you apply on an external site or on ROB."}
            </p>
          </div>
          <button onClick={load} style={{ padding: "10px 14px", border: "1px solid #E8E3DB", background: "transparent", color: "#5C5854", fontFamily: F, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
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
                  color: active ? "#1A1A1A" : "#5C5854",
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
            {filtered.map((o, index) => {
              const facts = listingFacts(o);
              const place = locationLine(facts, o.city);
              const closed = deadlineStatus(o.deadline) === "closed";
              const nextLabel = lang === "ko" ? "조건 확인" : "Check conditions";
              return (
              <article key={o.id} onClick={() => router.push(`/open-calls/${o.id}`)} style={{ background: "#FFFFFF", padding: "28px 28px", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#FAF8F4"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}>
                <div className="oc-list-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
                  <OpenCallPoster
                    className="oc-list-poster"
                    posterImage={o.posterImage}
                    gallery={o.gallery}
                    theme={o.theme}
                    city={place.text}
                    country={o.country}
                    deadline={o.deadline}
                    width={88}
                    height={118}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: S, fontSize: 18, fontWeight: 400, color: "#8A8580" }}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span style={{ fontFamily: F, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: "#5C5854" }}>
                        {o.country} / {place.text}
                      </span>
                      <span style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: "#5C5854" }}>
                        {typeDisplay(facts.kind)}
                      </span>
                    </div>
                    <h2 className="oc-card-title">{o.gallery}</h2>
                    <ul className="oc-facts">
                      <li>
                        <span>{lang === "ko" ? "주최" : "Organizer"}</span>
                        <strong>{organizerDisplay(facts.organizerName, lang)}</strong>
                      </li>
                      <li>
                        <span>{lang === "ko" ? "지원 자격" : "Eligibility"}</span>
                        <strong>{eligibilityDisplay(facts.eligibility)}</strong>
                      </li>
                      <li>
                        <span>{lang === "ko" ? "비용" : "Cost"}</span>
                        <strong>{costSummary(facts, lang)}</strong>
                      </li>
                      <li>
                        <span>{lang === "ko" ? "접수" : "Application"}</span>
                        <strong>{applicationRouteLabel(o.isExternal, lang)}</strong>
                      </li>
                    </ul>
                    <Link href={`/open-calls/${o.id}`} className="oc-next" onClick={(e) => e.stopPropagation()}>
                      {nextLabel}
                    </Link>
                    <a href={`/api/open-calls/${o.id}/calendar`} className="oc-calendar" onClick={(e) => e.stopPropagation()}>
                      {t("oc_calendar_short", lang)}
                    </a>
                  </div>
                  <div className="oc-list-side" style={{ textAlign: "right", flexShrink: 0 }}>
                    {artistProfile && (() => {
                      const bd = computeMatchScore(artistProfile, o, facts.cityNeedsCheck);
                      if (bd.total === 0) return null;
                      const color = bd.total >= 70 ? "#1F4D32" : bd.total >= 40 ? "#6A4E22" : "#5C5854";
                      const bg = bd.total >= 70 ? "rgba(31,77,50,0.08)" : bd.total >= 40 ? "rgba(106,78,34,0.08)" : "rgba(92,88,84,0.08)";
                      return (
                        <button
                          onClick={(e) => { e.stopPropagation(); setScoreModal({ oc: o, breakdown: bd }); }}
                          style={{ marginBottom: 8, padding: "4px 10px", background: bg, border: `1px solid ${color}`, display: "inline-block", cursor: "pointer" }}
                        >
                          <span style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color }}>
                            {bd.total}% {lang === "ko" ? "매칭" : lang === "ja" ? "マッチ" : "Match"}
                          </span>
                        </button>
                      );
                    })()}
                    {prepByOpenCallId[o.id] && (
                      <span style={{ display: "inline-block", marginBottom: 8, marginRight: 6, padding: "4px 10px", background: "#FFFFFF", border: "1px solid #C8C0B4", fontFamily: F, fontSize: 12, fontWeight: 600, color: "#3F3C38" }}>
                        {preparationStatusLabel(prepByOpenCallId[o.id], lang)}
                      </span>
                    )}
                    {!o.isExternal && appliedOpenCallIds.has(o.id) && (
                      <span style={{ display: "inline-block", marginBottom: 8, padding: "4px 10px", background: "rgba(31,77,50,0.08)", border: "1px solid #1F4D32", fontFamily: F, fontSize: 12, fontWeight: 600, color: "#1F4D32" }}>
                        {lang === "ko" ? "ROB 제출 완료" : "Submitted on ROB"}
                      </span>
                    )}
                    <span style={{ display: "block", fontFamily: F, fontSize: 12, fontWeight: 600, color: "#5C5854" }}>
                      {closed ? (lang === "ko" ? "마감됨" : "Closed") : (lang === "ko" ? "지원 마감" : t("deadline", lang))}
                    </span>
                    <div style={{ fontFamily: S, fontSize: 22, fontWeight: 500, color: closed ? "#8B4A4A" : "#1A1A1A", marginTop: 2 }}>{formatDeadlineLocal(o.deadline, lang)}</div>
                  </div>
                </div>
              </article>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ background: "#FFFFFF", padding: 48, textAlign: "center" }}>
                <p style={{ fontFamily: F, fontSize: 15, color: "#3F3C38", margin: 0 }}>
                  {lang === "ko" ? "이 조건에 해당하는 공고가 없습니다." : t("oc_no_results", lang)}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Match score breakdown modal */}
      {scoreModal && (
        <div
          onClick={() => setScoreModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#FFFFFF", border: "1px solid #E8E3DB", padding: 28, width: "100%", maxWidth: 360, position: "relative" }}
          >
            <button onClick={() => setScoreModal(null)} style={{ position: "absolute", top: 14, right: 16, background: "transparent", border: "none", fontFamily: F, fontSize: 16, color: "#B0AAA2", cursor: "pointer" }}>✕</button>
            <p style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#B0AAA2", margin: "0 0 6px" }}>
              {lang === "ko" ? "매칭 분석" : "Match Breakdown"}
            </p>
            <p style={{ fontFamily: S, fontSize: 18, fontWeight: 400, color: "#1A1A1A", margin: "0 0 20px" }}>
              {scoreModal.oc.gallery}
            </p>
            {[
              { label: lang === "ko" ? "국가 일치" : "Country", score: scoreModal.breakdown.country, max: 35 },
              { label: lang === "ko" ? "장르 키워드" : "Genre keywords", score: scoreModal.breakdown.genre, max: 40 },
              { label: lang === "ko" ? "도시 일치" : "City", score: scoreModal.breakdown.city, max: 15 },
              { label: lang === "ko" ? "바이오 키워드" : "Bio keywords", score: scoreModal.breakdown.bio, max: 10 },
            ].map(({ label, score, max }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F0EDE8" }}>
                <span style={{ fontFamily: F, fontSize: 12, color: "#6A6660" }}>{label}</span>
                <span style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: score > 0 ? "#3D6B3D" : "#C8C0B4" }}>
                  +{score} <span style={{ fontWeight: 300, color: "#B0AAA2" }}>/ {max}</span>
                </span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 0" }}>
              <span style={{ fontFamily: F, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", color: "#1A1A1A" }}>
                {lang === "ko" ? "총점" : "Total"}
              </span>
              <span style={{ fontFamily: S, fontSize: 22, fontWeight: 400, color: scoreModal.breakdown.total >= 70 ? "#3D6B3D" : "#1A1A1A" }}>
                {scoreModal.breakdown.total}%
              </span>
            </div>
            {scoreModal.breakdown.total < 70 && (
              <button
                onClick={() => { setScoreModal(null); router.push("/artist/me?focus=improve"); }}
                style={{ marginTop: 16, width: "100%", padding: "12px 0", background: "#1A1A1A", border: "none", color: "#FFFFFF", fontFamily: F, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
              >
                {lang === "ko" ? "매칭 점수 높이기 →" : lang === "ja" ? "スコアを改善する →" : "Improve Match Score →"}
              </button>
            )}
          </div>
        </div>
      )}
      <ArtistBottomNav lang={lang} activeTab="calls" onCreate={() => router.push("/artist/ritual")} />
    </>
  );
}
