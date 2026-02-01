"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";

type Gallery = {
  userId: string;
  name: string;
  email: string;
  country: string;
  city: string;
  updatedAt?: number;
};

const COUNTRY_TABS = ["한국", "일본", "영국"];

export default function GalleriesPage() {
  const router = useRouter();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState<string>(COUNTRY_TABS[0]);
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [sort1, setSort1] = useState<string>("favorites");
  const [sort2, setSort2] = useState<string>("updated");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  async function load() {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch("/api/public/galleries", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setGalleries(Array.isArray(data?.galleries) ? data.galleries : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load galleries");
      setGalleries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("favorite_galleries") || "{}";
      setFavorites(JSON.parse(raw));
    } catch {
      setFavorites({});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("favorite_galleries", JSON.stringify(favorites));
  }, [favorites]);

  const cityOptions = useMemo(() => {
    const list = galleries
      .filter((g) => (g.country ?? "").trim() === country)
      .map((g) => (g.city ?? "").trim())
      .filter(Boolean);
    return ["ALL", ...Array.from(new Set(list)).sort((a, b) => a.localeCompare(b))];
  }, [galleries, country]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = galleries.filter((g) => {
      if ((g.country ?? "").trim() !== country) return false;
      if (cityFilter !== "ALL" && (g.city ?? "").trim() !== cityFilter) return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.city.toLowerCase().includes(q)
      );
    });
    const order = [sort1, sort2];
    const cmpBy = (key: string, a: Gallery, b: Gallery) => {
      if (key === "favorites") {
        const af = favorites[a.userId] ? 1 : 0;
        const bf = favorites[b.userId] ? 1 : 0;
        return bf - af;
      }
      if (key === "updated") return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
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
  }, [galleries, country, query, cityFilter, sort1, sort2, favorites]);

  return (
    <>
      <TopBar />
      <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900 }}>Galleries 🏛️</h1>
            <p style={{ opacity: 0.8, marginTop: 6 }}>
              Browse galleries by country.
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
            <option value="favorites">Sort1: Favorites</option>
            <option value="updated">Sort1: Recent update</option>
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
            <option value="favorites">Sort2: Favorites</option>
            <option value="name">Sort2: Name</option>
            <option value="city">Sort2: City</option>
            <option value="country">Sort2: Country</option>
          </select>
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
            {filtered.map((g) => (
              <div
                key={g.userId}
                style={{
                  border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 14,
                  padding: 14,
                  background: "#fff",
                  cursor: "pointer",
                }}
                onClick={() => router.push(`/galleries/${encodeURIComponent(g.userId)}`)}
              >
                <div style={{ fontWeight: 900 }}>
                  {g.name} · {g.city}, {g.country}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                  {g.email}
                </div>
                <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFavorites((p) => ({
                        ...p,
                        [g.userId]: !p[g.userId],
                      }));
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: favorites[g.userId] ? "#111" : "#fff",
                      color: favorites[g.userId] ? "#fff" : "#111",
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {favorites[g.userId] ? "★ Favorite" : "☆ Favorite"}
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p style={{ opacity: 0.8 }}>No galleries in this country yet.</p>
            )}
          </div>
        )}
      </main>
    </>
  );
}
