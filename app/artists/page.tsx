"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";

type Artist = {
  userId: string;
  name: string;
  email: string;
  country: string;
  city: string;
  portfolioUrl?: string;
  updatedAt?: number;
};

const COUNTRY_TABS = [
  "한국",
  "일본",
  "영국",
  "미국",
  "프랑스",
  "독일",
  "이탈리아",
  "스페인",
  "캐나다",
  "호주",
];

export default function ArtistsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initializedRef = useRef(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState<string>(COUNTRY_TABS[0]);
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [isGalleryView, setIsGalleryView] = useState<boolean>(false);
  const [sort1, setSort1] = useState<string>("portfolio");
  const [sort2, setSort2] = useState<string>("updated");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  async function load() {
    try {
      setError(null);
      setLoading(true);
      const [artistsRes, meRes] = await Promise.all([
        fetch("/api/public/artists", { cache: "no-store" }),
        fetch("/api/auth/me", { cache: "no-store", credentials: "include" }),
      ]);
      const artistsData = await artistsRes.json().catch(() => null);
      const meData = await meRes.json().catch(() => null);
      if (!artistsRes.ok) throw new Error(artistsData?.error ?? `HTTP ${artistsRes.status}`);
      setArtists(Array.isArray(artistsData?.artists) ? artistsData.artists : []);
      setIsGalleryView(meData?.session?.role === "gallery");
    } catch (e: any) {
      setError(e?.message ?? "Failed to load artists");
      setArtists([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    const q = searchParams.get("q") ?? "";
    const c = searchParams.get("country") ?? COUNTRY_TABS[0];
    const city = searchParams.get("city") ?? "ALL";
    const sortA = searchParams.get("sort1") ?? "portfolio";
    const sortB = searchParams.get("sort2") ?? "updated";
    if (COUNTRY_TABS.includes(c)) setCountry(c);
    setQuery(q);
    setCityFilter(city);
    setSort1(sortA);
    setSort2(sortB);
    initializedRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!initializedRef.current) return;
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (country) params.set("country", country);
    if (cityFilter && cityFilter !== "ALL") params.set("city", cityFilter);
    if (sort1 && sort1 !== "portfolio") params.set("sort1", sort1);
    if (sort2 && sort2 !== "updated") params.set("sort2", sort2);
    const qs = params.toString();
    router.replace(`/artists${qs ? `?${qs}` : ""}`);
  }, [query, country, cityFilter, sort1, sort2, router]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("favorite_artists") || "{}";
      setFavorites(JSON.parse(raw));
    } catch {
      setFavorites({});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("favorite_artists", JSON.stringify(favorites));
  }, [favorites]);

  const filtered = useMemo(
    () => {
      const q = query.trim().toLowerCase();
      const list = artists.filter((a) => {
        if ((a.country ?? "").trim() !== country) return false;
        if (cityFilter !== "ALL" && (a.city ?? "").trim() !== cityFilter) return false;
        if (!q) return true;
        return (
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q)
        );
      });
      const order = [sort1, sort2];
      const cmpBy = (key: string, a: Artist, b: Artist) => {
        if (key === "favorites") {
          const af = favorites[a.userId] ? 1 : 0;
          const bf = favorites[b.userId] ? 1 : 0;
          return bf - af;
        }
        if (key === "updated") return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
        if (key === "portfolio") {
          const ap = a.portfolioUrl ? 1 : 0;
          const bp = b.portfolioUrl ? 1 : 0;
          return bp - ap;
        }
        if (key === "city") return a.city.localeCompare(b.city);
        if (key === "country") return a.country.localeCompare(b.country);
        return a.name.localeCompare(b.name);
      };
      return list.sort((a, b) => {
        for (const key of order) {
          const c = cmpBy(key, a, b);
          if (c !== 0) return c;
        }
        return a.name.localeCompare(b.name);
      });
    },
    [artists, country, query, cityFilter, sort1, sort2, favorites]
  );

  const cityOptions = useMemo(() => {
    const list = artists
      .filter((a) => (a.country ?? "").trim() === country)
      .map((a) => (a.city ?? "").trim())
      .filter(Boolean);
    return ["ALL", ...Array.from(new Set(list)).sort((a, b) => a.localeCompare(b))];
  }, [artists, country]);

  return (
    <>
      <TopBar />
      <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900 }}>Artists 🌏</h1>
            <p style={{ opacity: 0.8, marginTop: 6 }}>
              Browse artists by country.
            </p>
          </div>
          <button onClick={load}>Refresh</button>
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {COUNTRY_TABS.map((c) => {
            const active = c === country;
            return (
              <button
                key={c}
                onClick={() => setCountry(c)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: active ? "rgba(0,0,0,0.06)" : "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name/email/city..."
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              minWidth: 220,
            }}
          />
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff",
            }}
          >
            {cityOptions.map((c) => (
              <option key={c} value={c}>
                {c === "ALL" ? "All cities" : c}
              </option>
            ))}
          </select>
          <select
            value={sort1}
            onChange={(e) => setSort1(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff",
            }}
          >
            <option value="portfolio">Sort1: Portfolio</option>
            <option value="updated">Sort1: Recent update</option>
            <option value="favorites">Sort1: Favorites</option>
            <option value="name">Sort1: Name</option>
            <option value="city">Sort1: City</option>
            <option value="country">Sort1: Country</option>
          </select>
          <select
            value={sort2}
            onChange={(e) => setSort2(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff",
            }}
          >
            <option value="updated">Sort2: Recent update</option>
            <option value="portfolio">Sort2: Portfolio</option>
            <option value="favorites">Sort2: Favorites</option>
            <option value="name">Sort2: Name</option>
            <option value="city">Sort2: City</option>
            <option value="country">Sort2: Country</option>
          </select>
          <span style={{ fontSize: 12, opacity: 0.7, alignSelf: "center" }}>
            {isGalleryView ? "Gallery view" : "Public view"}
          </span>
        </div>

        {loading ? (
          <p style={{ marginTop: 14 }}>Loading…</p>
        ) : error ? (
          <div
            style={{
              marginTop: 12,
              border: "1px solid rgba(255,80,80,0.5)",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <b>Error:</b> {error}
          </div>
        ) : (
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {filtered.map((a) => (
              <div
                key={a.userId}
                style={{
                  border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 14,
                  padding: 14,
                  background: "#fff",
                  cursor: "pointer",
                }}
                onClick={() => router.push(`/artists/${encodeURIComponent(a.userId)}`)}
              >
                <div style={{ fontWeight: 900 }}>
                  {a.name} · {a.city}, {a.country}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                  {a.email}
                </div>
                <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFavorites((p) => ({
                        ...p,
                        [a.userId]: !p[a.userId],
                      }));
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: favorites[a.userId] ? "#111" : "#fff",
                      color: favorites[a.userId] ? "#fff" : "#111",
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {favorites[a.userId] ? "★ Favorite" : "☆ Favorite"}
                  </button>
                </div>
                {isGalleryView ? (
                  <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {a.portfolioUrl ? (
                      <a
                        href={a.portfolioUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 10,
                          border: "1px solid #111",
                          background: "#111",
                          color: "#fff",
                          fontWeight: 800,
                          textDecoration: "none",
                          fontSize: 12,
                        }}
                      >
                        View Portfolio
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, opacity: 0.7 }}>
                        No portfolio
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/artists/${encodeURIComponent(a.userId)}`);
                      }}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid rgba(0,0,0,0.12)",
                        background: "#fff",
                        fontWeight: 800,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      View Profile
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                    Portfolio: {a.portfolioUrl ? "✅" : "—"}
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <p style={{ opacity: 0.8 }}>No artists in this country yet.</p>
            )}
          </div>
        )}
      </main>
    </>
  );
}
