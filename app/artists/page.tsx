"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { GridCardSkeleton } from "@/app/components/Skeleton";
import { useFetch } from "@/lib/useFetch";
import { F, S } from "@/lib/design";
import { normalizeCountry } from "@/lib/countries";

type Artist = {
  userId: string;
  name: string;
  email: string;
  country: string;
  city: string;
  hasPortfolio?: boolean;
  seriesCount?: number;
  seriesTitles?: string[];
  profileImage?: string | null;
  startedYear?: number;
  genre?: string;
  updatedAt?: number;
  trustScore?: number;
  trustLevel?: "basic" | "verified" | "trusted";
};

type MeResponse = {
  session: { userId: string; role: "artist" | "gallery"; email?: string } | null;
  profile: any | null;
};

export default function ArtistsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, error, isLoading, mutate } = useFetch<{ artists: Artist[] }>("/api/public/artists");
  const artists = data?.artists ?? [];
  const [country, setCountry] = useState<string>("ALL");
  const [preferredCountry, setPreferredCountry] = useState("");
  const [hasAutoSelectedCountry, setHasAutoSelectedCountry] = useState(false);
  const [query, setQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [isGalleryViewer, setIsGalleryViewer] = useState(false); // kept for future use

  function load() {
    mutate();
  }

  useEffect(() => {
    try { setFavorites(JSON.parse(localStorage.getItem("favorite_artists") || "{}")); } catch { setFavorites({}); }
  }, []);

  useEffect(() => { localStorage.setItem("favorite_artists", JSON.stringify(favorites)); }, [favorites]);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: MeResponse) => {
        setPreferredCountry(normalizeCountry(data?.profile?.country ?? ""));
        setIsGalleryViewer(data?.session?.role === "gallery");
      })
      .catch(() => {
        setPreferredCountry("");
        setIsGalleryViewer(false);
      });
  }, []);

  const countryTabs = useMemo(() => {
    const countries = artists.map((a) => normalizeCountry(a.country ?? "")).filter(Boolean);
    const uniqueCountries = Array.from(new Set(countries)).sort((a, b) => {
      const countA = artists.filter((x) => normalizeCountry(x.country ?? "") === a).length;
      const countB = artists.filter((x) => normalizeCountry(x.country ?? "") === b).length;
      return countB - countA;
    });
    const normPreferred = normalizeCountry(preferredCountry);
    if (normPreferred) {
      const idx = uniqueCountries.indexOf(normPreferred);
      if (idx > 0) {
        uniqueCountries.splice(idx, 1);
        uniqueCountries.unshift(normPreferred);
      }
    }
    return ["ALL", ...uniqueCountries];
  }, [artists, preferredCountry]);

  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: artists.length };
    artists.forEach((a) => {
      const c = normalizeCountry(a.country ?? "");
      if (c) counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [artists]);

  const genreTabs = useMemo(() => {
    const genres = artists.map((a) => (a.genre || "").trim()).filter(Boolean);
    return ["ALL", ...Array.from(new Set(genres)).sort()];
  }, [artists]);

  function getCareerStage(startedYear?: number): string {
    if (!startedYear || startedYear <= 0) return "unknown";
    const yrs = new Date().getFullYear() - startedYear;
    if (yrs <= 3) return "emerging";
    if (yrs <= 10) return "mid-career";
    return "established";
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return artists.filter((a) => {
      if (country !== "ALL" && normalizeCountry(a.country ?? "") !== country) return false;
      if (genreFilter !== "ALL" && (a.genre || "").trim() !== genreFilter) return false;
      if (stageFilter !== "ALL" && getCareerStage(a.startedYear) !== stageFilter) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.city.toLowerCase().includes(q) || (a.genre || "").toLowerCase().includes(q) || (a.seriesTitles ?? []).some(t => t.toLowerCase().includes(q));
    });
  }, [artists, country, genreFilter, stageFilter, query]);

  useEffect(() => {
    for (const artist of filtered.slice(0, 24)) {
      router.prefetch(`/artists/${encodeURIComponent(artist.userId)}`);
    }
  }, [router, filtered]);

  useEffect(() => {
    if (hasAutoSelectedCountry) return;
    if (country !== "ALL") {
      setHasAutoSelectedCountry(true);
      return;
    }
    if (!preferredCountry) return;
    if (!countryTabs.includes(preferredCountry)) return;
    setCountry(preferredCountry);
    setHasAutoSelectedCountry(true);
  }, [hasAutoSelectedCountry, country, preferredCountry, countryTabs]);

  function getYearsActive(startedYear?: number): string {
    if (!startedYear || startedYear <= 0) return "";
    const years = new Date().getFullYear() - startedYear;
    if (years <= 0) return "Debut";
    return `${years}yr${years > 1 ? "s" : ""}`;
  }

  return (
    <>
      <TopBar />
      <style jsx global>{`
        .artist-card-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .artist-list {
          display: grid;
          gap: 1px;
          background: #e8e3db;
        }
        @media (max-width: 900px) {
          .artist-card-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
        }
        @media (max-width: 560px) {
          .artist-card-grid { grid-template-columns: 1fr; gap: 16px; }
        }
      `}</style>
      <main style={{ padding: "48px 40px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48 }}>
          <div>
            <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8A8A8A" }}>
              Directory
            </span>
            <h1 style={{ fontFamily: S, fontSize: "clamp(32px, 6vw, 42px)", fontWeight: 300, color: "#1A1A1A", marginTop: 8, letterSpacing: "-0.01em" }}>
              Artists
            </h1>
            <p style={{ fontFamily: F, fontSize: 12, color: "#8A8A8A", marginTop: 8, letterSpacing: "0.02em" }}>
              Browse artists by country
            </p>
          </div>
          <button
            onClick={load}
            style={{
              padding: "10px 20px",
              border: "1px solid #E5E0DB",
              background: "transparent",
              color: "#4A4A4A",
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            Refresh
          </button>
        </div>

        {/* Country Tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {countryTabs.map((c) => (
            <button
              key={c}
              onClick={() => setCountry(c)}
              style={{
                padding: "10px 18px",
                border: c === country ? "1px solid #1A1A1A" : "1px solid #E5E0DB",
                background: c === country ? "#1A1A1A" : "transparent",
                color: c === country ? "#FFFFFF" : "#4A4A4A",
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {c}
              <span style={{ fontSize: 9, opacity: 0.7, padding: "2px 6px", background: c === country ? "rgba(255,255,255,0.2)" : "#F5F0EB" }}>
                {countryCounts[c] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Filters: Genre + Career Stage */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            style={{ padding: "10px 14px", border: "1px solid #E5E0DB", background: genreFilter !== "ALL" ? "#1A1A1A" : "#FFFFFF", color: genreFilter !== "ALL" ? "#FFFFFF" : "#4A4A4A", fontFamily: F, fontSize: 10, letterSpacing: "0.1em", cursor: "pointer", outline: "none" }}
          >
            <option value="ALL">ALL GENRES</option>
            {genreTabs.filter((g) => g !== "ALL").map((g) => <option key={g} value={g}>{g.toUpperCase()}</option>)}
          </select>
          {(["ALL", "emerging", "mid-career", "established"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              style={{ padding: "10px 16px", border: s === stageFilter ? "1px solid #1A1A1A" : "1px solid #E5E0DB", background: s === stageFilter ? "#1A1A1A" : "transparent", color: s === stageFilter ? "#FFFFFF" : "#4A4A4A", fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
            >
              {s === "ALL" ? "All Stages" : s}
            </button>
          ))}
          {(genreFilter !== "ALL" || stageFilter !== "ALL") && (
            <button onClick={() => { setGenreFilter("ALL"); setStageFilter("ALL"); }} style={{ padding: "10px 14px", border: "1px solid #E5E0DB", background: "transparent", color: "#8A8A8A", fontFamily: F, fontSize: 10, letterSpacing: "0.1em", cursor: "pointer" }}>
              Clear
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ marginBottom: 32 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, city, genre, or series…"
            style={{
              width: "100%",
              maxWidth: 400,
              padding: "14px 18px",
              border: "1px solid #E5E0DB",
              background: "#FFFFFF",
              fontFamily: F,
              fontSize: 12,
              letterSpacing: "0.02em",
              color: "#1A1A1A",
              outline: "none",
              transition: "border-color 0.3s ease",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#1A1A1A"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E0DB"; }}
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <GridCardSkeleton count={6} />
        ) : error ? (
          <div style={{ padding: 24, border: "1px solid #D4B0B0", background: "#FDF8F8", color: "#8B3A3A", fontFamily: F, fontSize: 12 }}>
            {error?.message ?? "Failed to load"}
          </div>
        ) : (
          <div className="artist-list">
            {filtered.map((a, idx) => (
              <div
                key={a.userId}
                onClick={() => router.push(`/artists/${encodeURIComponent(a.userId)}`)}
                style={{ background: "#FFFFFF", padding: "12px 16px", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#FAF8F4"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div style={{ width: 44, height: 44, border: "1px solid #EDE6DA", background: "#F5F1EB", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {a.profileImage
                        ? <img src={a.profileImage} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontFamily: S, fontSize: 18, color: "#D0C7BA" }}>{a.name?.charAt(0)?.toUpperCase() || "A"}</span>
                      }
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontFamily: S, fontSize: 12, color: "#D4CEC4", flexShrink: 0 }}>{String(idx + 1).padStart(2, "0")}</span>
                        <h3 style={{ fontFamily: S, fontSize: 17, fontWeight: 400, color: "#1A1A1A", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</h3>
                        <span
                          style={{
                            fontFamily: F,
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: "0.06em",
                            color: trustBadge(a.trustLevel).color,
                            background: trustBadge(a.trustLevel).bg,
                            border: `1px solid ${trustBadge(a.trustLevel).border}`,
                            padding: "2px 7px",
                            flexShrink: 0,
                          }}
                        >
                          {trustBadge(a.trustLevel).label}
                        </span>
                      </div>
                      <p style={{ fontFamily: F, fontSize: 10, color: "#8A8580", margin: 0 }}>
                        {[a.city, a.country].filter(Boolean).join(", ") || "—"}
                        {a.genre ? ` · ${a.genre}` : ""}
                        {getYearsActive(a.startedYear) ? ` · ${getYearsActive(a.startedYear)}` : ""}
                      </p>
                      {(a.seriesTitles ?? []).length > 0 && (
                        <p style={{ fontFamily: F, fontSize: 9, color: "#B0AAA2", margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {(a.seriesTitles ?? []).slice(0, 3).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.07em", color: a.hasPortfolio ? "#2E6B45" : "#B0AAA2", background: a.hasPortfolio ? "#EDF7F1" : "#F5F3F0", padding: "3px 8px", border: `1px solid ${a.hasPortfolio ? "#D6EAD8" : "#ECEAE6"}` }}>
                      PDF
                    </span>
                    <span style={{ fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.07em", color: (a.seriesCount ?? 0) > 0 ? "#5A5A8B" : "#B0AAA2", background: (a.seriesCount ?? 0) > 0 ? "#EDEDF7" : "#F5F3F0", padding: "3px 8px", border: `1px solid ${(a.seriesCount ?? 0) > 0 ? "#D4D4EE" : "#ECEAE6"}` }}>
                      {(a.seriesCount ?? 0) > 0 ? `Series ${a.seriesCount}` : "Series —"}
                    </span>
                    <span style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.07em", color: "#4A4A4A", background: "#F8F5EE", padding: "3px 8px", border: "1px solid #ECE2D3" }}>
                      Trust {Math.max(0, Math.min(100, Number(a.trustScore ?? 0)))}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFavorites((p) => ({ ...p, [a.userId]: !p[a.userId] })); }}
                      style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #E8E3DB", background: favorites[a.userId] ? "#1A1A1A" : "#FFFFFF", color: favorites[a.userId] ? "#FFFFFF" : "#8A8A8A", fontSize: 12, cursor: "pointer", flexShrink: 0 }}
                    >
                      {favorites[a.userId] ? "★" : "☆"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div style={{ padding: 64, textAlign: "center" }}>
            <p style={{ fontFamily: S, fontSize: 18, fontStyle: "italic", color: "#8A8A8A" }}>
              No artists found.
            </p>
          </div>
        )}
      </main>
    </>
  );
}

function trustBadge(level?: "basic" | "verified" | "trusted") {
  if (level === "trusted") return { label: "Trusted", color: "#2E6B45", bg: "#EDF7F1", border: "#D6EAD8" };
  if (level === "verified") return { label: "Verified", color: "#7A6030", bg: "#FFF6E8", border: "#EFD9B7" };
  return { label: "Basic", color: "#8A8580", bg: "#F5F3F0", border: "#ECEAE6" };
}
