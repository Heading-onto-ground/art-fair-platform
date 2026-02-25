"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { GridCardSkeleton } from "@/app/components/Skeleton";
import { useFetch } from "@/lib/useFetch";
import { F, S } from "@/lib/design";

type Gallery = {
  userId: string;
  name: string;
  email: string;
  country: string;
  city: string;
  profileImage?: string | null;
  foundedYear?: number;
  updatedAt?: number;
};

function normalizeDirectoryCity(countryInput: string, cityInput: string): string {
  const country = String(countryInput || "").trim();
  const city = String(cityInput || "").trim();
  if (!city) return "";
  const lower = city.toLowerCase();

  const alias: Record<string, string> = {
    seould: "Seoul",
    "new york city": "New York",
    manhattan: "New York",
    brooklyn: "New York",
    queens: "New York",
    bronx: "New York",
    "los angeles county": "Los Angeles",
    "city of los angeles": "Los Angeles",
    "city of london": "London",
    "royal borough of kensington and chelsea": "London",
    "london borough of southwark": "London",
    "london borough of richmond upon thames": "London",
    "london borough of wandsworth": "London",
    "8th arrondissement of paris": "Paris",
    "7th arrondissement of paris": "Paris",
    "6th arrondissement of paris": "Paris",
    "3rd arrondissement of paris": "Paris",
    "1st arrondissement of paris": "Paris",
    "18th arrondissement of paris": "Paris",
    "14th arrondissement of paris": "Paris",
    "11th arrondissement of paris": "Paris",
    "10th arrondissement of paris": "Paris",
    shinjuku: "Tokyo",
    roppongi: "Tokyo",
    "minami-aoyama": "Tokyo",
    ginza: "Tokyo",
    "sakyō-ku": "Kyoto",
    "nakagyō ward": "Kyoto",
    "roma capitale": "Rome",
    victoria: "Melbourne",
    southbank: "Melbourne",
  };
  if (alias[lower]) return alias[lower];

  if (country === "중국") {
    const chinaMajor = [
      "shanghai",
      "beijing",
      "guangzhou",
      "shenzhen",
      "chengdu",
      "hangzhou",
      "nanjing",
      "wuhan",
      "chongqing",
      "tianjin",
      "xi'an",
      "xian",
      "suzhou",
      "qingdao",
      "xiamen",
    ];
    const hit = chinaMajor.find((c) => lower === c || lower.startsWith(`${c} `));
    if (hit === "xian" || hit === "xi'an") return "Xi'an";
    if (hit) return hit.charAt(0).toUpperCase() + hit.slice(1);
    return "";
  }

  if (/\b(county|borough|arrondissement|municipality|ward|territory|province|state|capitale)\b/i.test(lower)) {
    return "";
  }
  return city;
}

export default function GalleriesPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useFetch<{ galleries: Gallery[] }>("/api/public/galleries");
  const galleries = data?.galleries ?? [];
  const [country, setCountry] = useState<string>("ALL");
  const [city, setCity] = useState<string>("ALL");
  const [showAllCityTabs, setShowAllCityTabs] = useState(false);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  function load() {
    mutate();
  }

  useEffect(() => {
    try { setFavorites(JSON.parse(localStorage.getItem("favorite_galleries") || "{}")); } catch { setFavorites({}); }
  }, []);

  useEffect(() => { localStorage.setItem("favorite_galleries", JSON.stringify(favorites)); }, [favorites]);

  const countryTabs = useMemo(() => {
    const countries = galleries.map((g) => (g.country ?? "").trim()).filter(Boolean);
    const uniqueCountries = Array.from(new Set(countries)).sort((a, b) => {
      const countA = galleries.filter((g) => g.country === a).length;
      const countB = galleries.filter((g) => g.country === b).length;
      return countB - countA;
    });
    return ["ALL", ...uniqueCountries];
  }, [galleries]);

  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: galleries.length };
    galleries.forEach((g) => {
      const c = (g.country ?? "").trim();
      if (c) counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [galleries]);

  const cityTabs = useMemo(() => {
    const scoped = country === "ALL"
      ? galleries
      : galleries.filter((g) => (g.country ?? "").trim() === country);
    const counts = new Map<string, number>();
    for (const g of scoped) {
      const normalized = normalizeDirectoryCity(g.country ?? "", g.city ?? "");
      if (!normalized) continue;
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
    const topCities = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 30)
      .map(([c]) => c);
    return ["ALL", ...topCities];
  }, [galleries, country]);

  const cityCounts = useMemo(() => {
    const scoped = country === "ALL"
      ? galleries
      : galleries.filter((g) => (g.country ?? "").trim() === country);
    const counts: Record<string, number> = { ALL: scoped.length };
    scoped.forEach((g) => {
      const c = normalizeDirectoryCity(g.country ?? "", g.city ?? "");
      if (c) counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [galleries, country]);

  useEffect(() => {
    if (!cityTabs.includes(city)) setCity("ALL");
  }, [cityTabs, city]);

  useEffect(() => {
    setShowAllCityTabs(false);
  }, [country]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return galleries.filter((g) => {
      if (country !== "ALL" && (g.country ?? "").trim() !== country) return false;
      if (city !== "ALL" && normalizeDirectoryCity(g.country ?? "", g.city ?? "") !== city) return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        normalizeDirectoryCity(g.country ?? "", g.city ?? "").toLowerCase().includes(q) ||
        g.city.toLowerCase().includes(q)
      );
    });
  }, [galleries, country, city, query]);

  const visibleCityTabs = useMemo(() => {
    const limit = 12;
    if (showAllCityTabs) return cityTabs;
    return cityTabs.slice(0, limit);
  }, [cityTabs, showAllCityTabs]);

  function getYearsSince(year?: number): string {
    if (!year || year <= 0) return "";
    const diff = new Date().getFullYear() - year;
    if (diff <= 0) return "New";
    return `Est. ${year}`;
  }

  return (
    <>
      <TopBar />
      <style jsx global>{`
        .gallery-card-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        @media (max-width: 900px) {
          .gallery-card-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
        }
        @media (max-width: 560px) {
          .gallery-card-grid { grid-template-columns: 1fr; gap: 16px; }
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
              Galleries
            </h1>
            <p style={{ fontFamily: F, fontSize: 12, color: "#8A8A8A", marginTop: 8, letterSpacing: "0.02em" }}>
              Browse galleries by country
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
              onClick={() => {
                setCountry(c);
                setCity("ALL");
              }}
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

        {/* City Sub Tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {visibleCityTabs.map((c) => (
            <button
              key={c}
              onClick={() => setCity(c)}
              style={{
                padding: "8px 14px",
                border: c === city ? "1px solid #8B7355" : "1px solid #EDE7DD",
                background: c === city ? "rgba(139,115,85,0.08)" : "transparent",
                color: c === city ? "#8B7355" : "#6A6A6A",
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {c}
              <span style={{ fontSize: 9, opacity: 0.7, padding: "2px 6px", background: c === city ? "rgba(139,115,85,0.15)" : "#F7F3ED" }}>
                {cityCounts[c] || 0}
              </span>
            </button>
          ))}
        </div>
        {cityTabs.length > 12 && (
          <div style={{ marginBottom: 28 }}>
            <button
              onClick={() => setShowAllCityTabs((v) => !v)}
              style={{
                padding: "7px 12px",
                border: "1px solid #EDE7DD",
                background: "#FFFFFF",
                color: "#6A6A6A",
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {showAllCityTabs ? "접기" : "도시 더보기"}
            </button>
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: 32 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or city..."
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
          <div className="gallery-card-grid">
            {filtered.map((g) => (
              <div
                key={g.userId}
                onClick={() => router.push(`/galleries/${encodeURIComponent(g.userId)}`)}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #EEEAE5",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  overflow: "hidden",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#C8C0B4";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#EEEAE5";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Image */}
                <div style={{
                  width: "100%",
                  aspectRatio: "4 / 3",
                  background: "#F5F1EB",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  {g.profileImage ? (
                    <img
                      src={g.profileImage}
                      alt={g.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 40, color: "#DDD6CC", marginBottom: 8 }}>
                        {g.name?.charAt(0)?.toUpperCase() || "G"}
                      </div>
                      <div style={{ fontFamily: F, fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", color: "#C8C0B4" }}>
                        No photo
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: "18px 20px 20px" }}>
                  <h3 style={{
                    fontFamily: S,
                    fontSize: 18,
                    fontWeight: 400,
                    color: "#1A1A1A",
                    marginBottom: 8,
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {g.name}
                  </h3>

                  {/* Tags row */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {(g.city || g.country) && (
                      <span style={{
                        fontFamily: F,
                        fontSize: 9,
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#8B7355",
                        background: "#F5F0E8",
                        padding: "4px 10px",
                        border: "1px solid #EDE6DA",
                      }}>
                        {[normalizeDirectoryCity(g.country ?? "", g.city ?? ""), g.country].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {getYearsSince(g.foundedYear) && (
                      <span style={{
                        fontFamily: F,
                        fontSize: 9,
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        color: "#6A6A6A",
                        background: "#F5F3F0",
                        padding: "4px 10px",
                        border: "1px solid #ECEAE6",
                      }}>
                        {getYearsSince(g.foundedYear)}
                      </span>
                    )}
                  </div>

                </div>

                {/* Favorite button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFavorites((p) => ({ ...p, [g.userId]: !p[g.userId] }));
                  }}
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "none",
                    background: favorites[g.userId] ? "#1A1A1A" : "rgba(255,255,255,0.85)",
                    color: favorites[g.userId] ? "#FFFFFF" : "#8A8A8A",
                    fontFamily: F,
                    fontSize: 14,
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {favorites[g.userId] ? "★" : "☆"}
                </button>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div style={{ padding: 64, textAlign: "center" }}>
            <p style={{ fontFamily: S, fontSize: 18, fontStyle: "italic", color: "#8A8A8A" }}>
              No galleries found.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
