"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import OpenCallPoster from "@/app/components/OpenCallPoster";
import { CardSkeleton } from "@/app/components/Skeleton";
import { useFetch } from "@/lib/useFetch";
import { useLanguage } from "@/lib/useLanguage";
import { F, S } from "@/lib/design";

type Role = "artist" | "gallery";
type MeResponse = {
  session: { userId: string; role: Role; email?: string } | null;
  profile: unknown | null;
};

type OpenCall = {
  id: string;
  galleryId: string;
  gallery: string;
  city: string;
  country: string;
  theme: string;
  deadline: string;
  posterImage?: string | null;
  isExternal?: boolean;
  externalUrl?: string;
  galleryWebsite?: string;
  galleryDescription?: string;
};

async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
    return (await res.json().catch(() => null)) as MeResponse | null;
  } catch {
    return null;
  }
}

function naverQueryUrl(city: string) {
  const month = new Date().getMonth() + 1;
  const q = `${month}월 ${city} 전시`;
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(q)}`;
}

export default function ArtistExhibitionBoardPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [ready, setReady] = useState(false);
  const [countryFilter, setCountryFilter] = useState("ALL");

  const { data, error, isLoading, mutate } = useFetch<{ openCalls: OpenCall[] }>(
    ready ? "/api/open-calls" : null
  );
  const openCalls = data?.openCalls ?? [];

  useEffect(() => {
    (async () => {
      const m = await fetchMe();
      if (!m?.session) {
        router.replace("/login?role=artist");
        return;
      }
      if (m.session.role !== "artist") {
        router.replace("/gallery");
        return;
      }
      setReady(true);
    })();
  }, [router]);

  const countries = useMemo(() => {
    const set = new Set(openCalls.map((o) => (o.country ?? "").trim()).filter(Boolean));
    return ["ALL", ...Array.from(set)];
  }, [openCalls]);

  const filtered = useMemo(() => {
    let items = openCalls;
    if (countryFilter !== "ALL") {
      items = items.filter((o) => (o.country ?? "").trim() === countryFilter);
    }
    // External collection first, then by deadline
    return [...items].sort((a, b) => {
      if (!!a.isExternal !== !!b.isExternal) return a.isExternal ? -1 : 1;
      return String(a.deadline).localeCompare(String(b.deadline));
    });
  }, [openCalls, countryFilter]);

  return (
    <>
      <TopBar />
      <style jsx global>{`
        @media (max-width: 768px) {
          .exh-card-inner { flex-direction: column !important; }
          .exh-poster { width: 100% !important; height: auto !important; aspect-ratio: 3/4 !important; max-height: 320px !important; }
          .exh-right { text-align: left !important; margin-left: 0 !important; margin-top: 10px !important; }
          .country-tabs { -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .country-tabs::-webkit-scrollbar { display: none; }
        }
      `}</style>
      <main style={{ padding: "40px 20px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, gap: 12, flexWrap: "wrap" }}>
          <div>
            <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", color: "#8B7355", textTransform: "uppercase" }}>
              {lang === "ko" ? "전시 정보 보드" : "Exhibition Board"}
            </span>
            <h1 style={{ fontFamily: S, fontSize: "clamp(28px, 6vw, 42px)", fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>
              {lang === "ko" ? "국가별 전시/오픈콜 모아보기" : "Country-wise Exhibition Feed"}
            </h1>
            <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginTop: 8 }}>
              {lang === "ko"
                ? "외부 수집 + 플랫폼 등록 오픈콜을 국가별로 모았습니다. 각 카드에서 네이버 검색으로 추가 탐색이 가능합니다."
                : "Aggregated external and platform opportunities by country. Each card includes quick Naver search."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => mutate()}
              style={{ padding: "10px 16px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
            >
              {lang === "ko" ? "새로고침" : "Refresh"}
            </button>
            <Link
              href="/artist"
              style={{ padding: "10px 16px", border: "1px solid #1A1A1A", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}
            >
              {lang === "ko" ? "대시보드" : "Dashboard"}
            </Link>
          </div>
        </div>

        <div className="country-tabs" style={{ display: "flex", gap: 0, marginBottom: 28, overflowX: "auto", borderBottom: "1px solid #E8E3DB" }}>
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
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <CardSkeleton count={6} />
        ) : error ? (
          <div style={{ padding: 20, border: "1px solid rgba(139,74,74,0.2)", background: "rgba(139,74,74,0.04)", color: "#8B4A4A", fontFamily: F, fontSize: 12 }}>
            {error.message || "Failed to load"}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
            {filtered.map((o, index) => (
              <article key={o.id} style={{ background: "#FFFFFF", padding: "clamp(20px, 3vw, 30px) clamp(16px, 3vw, 34px)" }}>
                <div className="exh-card-inner" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
                  <OpenCallPoster
                    className="exh-poster"
                    posterImage={o.posterImage}
                    gallery={o.gallery}
                    theme={o.theme}
                    city={o.city}
                    country={o.country}
                    deadline={o.deadline}
                    width={108}
                    height={144}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontFamily: S, fontSize: 18, color: "#D4CEC4" }}>{String(index + 1).padStart(2, "0")}</span>
                      <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355" }}>{o.country} / {o.city}</span>
                      {o.isExternal && (
                        <span style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.08em", color: "#8B7355", border: "1px solid #EDE2CF", background: "#FAF5EE", padding: "3px 8px", textTransform: "uppercase" }}>
                          {lang === "ko" ? "외부수집" : "External"}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontFamily: S, fontSize: "clamp(20px,3vw,28px)", fontWeight: 400, marginBottom: 6, color: "#1A1A1A" }}>{o.gallery}</h3>
                    <p style={{ fontFamily: F, fontSize: 13, color: "#8A8580", lineHeight: 1.6, marginBottom: 10 }}>{o.theme}</p>
                    <p style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2", lineHeight: 1.6 }}>
                      {lang === "ko" ? "네이버 추천 검색어:" : "Naver quick search:"}{" "}
                      <a
                        href={naverQueryUrl(o.city || o.country)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#8B7355", textDecoration: "underline" }}
                      >
                        {`${new Date().getMonth() + 1}월 ${o.city || o.country} 전시`}
                      </a>
                    </p>
                  </div>
                  <div className="exh-right" style={{ textAlign: "right", marginLeft: 20 }}>
                    <div style={{ fontFamily: F, fontSize: 9, color: "#B0AAA2", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      {lang === "ko" ? "마감일" : "Deadline"}
                    </div>
                    <div style={{ fontFamily: S, fontSize: 18, color: "#1A1A1A", marginTop: 4 }}>{o.deadline}</div>
                  </div>
                </div>
                <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {o.externalUrl ? (
                    <a href={o.externalUrl} target="_blank" rel="noreferrer" style={{ padding: "10px 18px", border: "1px solid #1A1A1A", background: "#1A1A1A", color: "#FFF", fontFamily: F, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
                      {lang === "ko" ? "공식 페이지" : "Official"}
                    </a>
                  ) : (
                    <button onClick={() => router.push(`/open-calls/${o.id}`)} style={{ padding: "10px 18px", border: "1px solid #1A1A1A", background: "#1A1A1A", color: "#FFF", fontFamily: F, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                      {lang === "ko" ? "상세 보기" : "Details"}
                    </button>
                  )}
                  {o.galleryWebsite && (
                    <a href={o.galleryWebsite} target="_blank" rel="noreferrer" style={{ padding: "10px 18px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
                      {lang === "ko" ? "갤러리 사이트" : "Gallery Site"}
                    </a>
                  )}
                </div>
              </article>
            ))}
            {filtered.length === 0 && (
              <div style={{ background: "#FFFFFF", padding: 50, textAlign: "center", color: "#B0AAA2", fontFamily: F, fontSize: 13 }}>
                {lang === "ko" ? "해당 국가에 등록된 전시 정보가 없습니다." : "No exhibition info for this country yet."}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

