"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { GridCardSkeleton } from "@/app/components/Skeleton";
import { useFetch } from "@/lib/useFetch";
import { F, S } from "@/lib/design";

type Artist = {
  userId: string;
  name: string;
  email: string;
  country: string;
  city: string;
  portfolioUrl?: string;
  profileImage?: string | null;
  startedYear?: number;
  genre?: string;
  updatedAt?: number;
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
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

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
        setPreferredCountry((data?.profile?.country ?? "").trim());
      })
      .catch(() => {
        setPreferredCountry("");
      });
  }, []);

  const countryTabs = useMemo(() => {
    const countries = artists.map((a) => (a.country ?? "").trim()).filter(Boolean);
    const uniqueCountries = Array.from(new Set(countries)).sort((a, b) => {
      const countA = artists.filter((x) => x.country === a).length;
      const countB = artists.filter((x) => x.country === b).length;
      return countB - countA;
    });
    if (preferredCountry) {
      const idx = uniqueCountries.indexOf(preferredCountry);
      if (idx > 0) {
        uniqueCountries.splice(idx, 1);
        uniqueCountries.unshift(preferredCountry);
      }
    }
    return ["ALL", ...uniqueCountries];
  }, [artists, preferredCountry]);

  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: artists.length };
    artists.forEach((a) => {
      const c = (a.country ?? "").trim();
      if (c) counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [artists]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return artists.filter((a) => {
      if (country !== "ALL" && (a.country ?? "").trim() !== country) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.city.toLowerCase().includes(q);
    });
  }, [artists, country, query]);

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
          <div className="artist-card-grid">
            {filtered.map((a) => (
              <div
                key={a.userId}
                onClick={() => router.push(`/artists/${encodeURIComponent(a.userId)}`)}
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
                  aspectRatio: "1 / 1",
                  background: "#F5F1EB",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  {a.profileImage ? (
                    <img
                      src={a.profileImage}
                      alt={a.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 40, color: "#DDD6CC", marginBottom: 8 }}>
                        {a.name?.charAt(0)?.toUpperCase() || "A"}
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
                    {a.name}
                  </h3>

                  {/* Tags row */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {a.genre && (
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
                        {a.genre}
                      </span>
                    )}
                    {getYearsActive(a.startedYear) && (
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
                        {getYearsActive(a.startedYear)}
                      </span>
                    )}
                  </div>

                  {/* Location */}
                  <p style={{
                    fontFamily: F,
                    fontSize: 11,
                    color: "#8A8580",
                    letterSpacing: "0.02em",
                  }}>
                    {[a.city, a.country].filter(Boolean).join(", ") || "—"}
                  </p>
                </div>

                {/* Favorite button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFavorites((p) => ({ ...p, [a.userId]: !p[a.userId] }));
                  }}
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "none",
                    background: favorites[a.userId] ? "#1A1A1A" : "rgba(255,255,255,0.85)",
                    color: favorites[a.userId] ? "#FFFFFF" : "#8A8A8A",
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
                  {favorites[a.userId] ? "★" : "☆"}
                </button>
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
