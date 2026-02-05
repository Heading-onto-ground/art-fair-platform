"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";

type Artist = { userId: string; name: string; email: string; country: string; city: string; portfolioUrl?: string; updatedAt?: number };

// 나라 이름 → 이모지 매핑
const COUNTRY_FLAGS: Record<string, string> = {
  "한국": "🇰🇷",
  "Korea": "🇰🇷",
  "South Korea": "🇰🇷",
  "일본": "🇯🇵",
  "Japan": "🇯🇵",
  "영국": "🇬🇧",
  "UK": "🇬🇧",
  "United Kingdom": "🇬🇧",
  "미국": "🇺🇸",
  "USA": "🇺🇸",
  "United States": "🇺🇸",
  "중국": "🇨🇳",
  "China": "🇨🇳",
  "프랑스": "🇫🇷",
  "France": "🇫🇷",
  "독일": "🇩🇪",
  "Germany": "🇩🇪",
  "이탈리아": "🇮🇹",
  "Italy": "🇮🇹",
  "스페인": "🇪🇸",
  "Spain": "🇪🇸",
  "캐나다": "🇨🇦",
  "Canada": "🇨🇦",
  "호주": "🇦🇺",
  "Australia": "🇦🇺",
  "네덜란드": "🇳🇱",
  "Netherlands": "🇳🇱",
  "스위스": "🇨🇭",
  "Switzerland": "🇨🇭",
  "싱가포르": "🇸🇬",
  "Singapore": "🇸🇬",
  "홍콩": "🇭🇰",
  "Hong Kong": "🇭🇰",
  "대만": "🇹🇼",
  "Taiwan": "🇹🇼",
  "브라질": "🇧🇷",
  "Brazil": "🇧🇷",
  "멕시코": "🇲🇽",
  "Mexico": "🇲🇽",
  "인도": "🇮🇳",
  "India": "🇮🇳",
  "러시아": "🇷🇺",
  "Russia": "🇷🇺",
  "태국": "🇹🇭",
  "Thailand": "🇹🇭",
  "베트남": "🇻🇳",
  "Vietnam": "🇻🇳",
  "인도네시아": "🇮🇩",
  "Indonesia": "🇮🇩",
  "말레이시아": "🇲🇾",
  "Malaysia": "🇲🇾",
  "필리핀": "🇵🇭",
  "Philippines": "🇵🇭",
  "아랍에미리트": "🇦🇪",
  "UAE": "🇦🇪",
};

function getCountryFlag(country: string): string {
  return COUNTRY_FLAGS[country] || "🌍";
}

export default function ArtistsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initializedRef = useRef(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  async function load() {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch("/api/public/artists", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setArtists(Array.isArray(data?.artists) ? data.artists : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
      setArtists([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    try { setFavorites(JSON.parse(localStorage.getItem("favorite_artists") || "{}")); } catch { setFavorites({}); }
  }, []);

  useEffect(() => { localStorage.setItem("favorite_artists", JSON.stringify(favorites)); }, [favorites]);

  // 아티스트 데이터에서 동적으로 나라 목록 생성
  const countryTabs = useMemo(() => {
    const countries = artists
      .map((a) => (a.country ?? "").trim())
      .filter(Boolean);
    const uniqueCountries = Array.from(new Set(countries)).sort((a, b) => {
      // 아티스트 수가 많은 나라가 앞에 오도록 정렬
      const countA = artists.filter((x) => x.country === a).length;
      const countB = artists.filter((x) => x.country === b).length;
      return countB - countA;
    });
    return ["ALL", ...uniqueCountries];
  }, [artists]);

  // 각 나라별 아티스트 수
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
      // "ALL"이면 모든 나라 표시
      if (country !== "ALL" && (a.country ?? "").trim() !== country) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.city.toLowerCase().includes(q);
    });
  }, [artists, country, query]);

  return (
    <>
      <TopBar />
      <main style={{ padding: "28px 24px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111" }}>Artists</h1>
            <p style={{ color: "#888", fontSize: 14, marginTop: 4 }}>Browse artists by country</p>
          </div>
          <button onClick={load} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e5e5", background: "white", color: "#888", fontWeight: 500, fontSize: 12, cursor: "pointer" }}>
            Refresh
          </button>
        </div>

        {/* Country Tabs - 동적 생성 */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {countryTabs.map((c) => (
            <button
              key={c}
              onClick={() => setCountry(c)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: c === country ? "1px solid #6366f1" : "1px solid #e5e5e5",
                background: c === country ? "rgba(99,102,241,0.1)" : "white",
                color: c === country ? "#6366f1" : "#666",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {c === "ALL" ? "🌐" : getCountryFlag(c)} {c}
              <span style={{ 
                fontSize: 10, 
                opacity: 0.7,
                background: c === country ? "rgba(99,102,241,0.2)" : "#f5f5f5",
                padding: "2px 6px",
                borderRadius: 999,
              }}>
                {countryCounts[c] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name/email/city..."
          style={{ width: "100%", maxWidth: 300, marginBottom: 20 }}
        />

        {/* Content */}
        {loading ? (
          <p style={{ color: "#888", padding: 20 }}>Loading...</p>
        ) : error ? (
          <div style={{ padding: 16, borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>{error}</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map((a) => (
              <div
                key={a.userId}
                onClick={() => router.push(`/artists/${encodeURIComponent(a.userId)}`)}
                style={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 12, padding: 16, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6366f1"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e5e5"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#111" }}>🎨 {a.name}</div>
                    <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>{a.city}, {a.country}</div>
                    <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{a.email}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFavorites((p) => ({ ...p, [a.userId]: !p[a.userId] })); }}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e5e5", background: favorites[a.userId] ? "#6366f1" : "white", color: favorites[a.userId] ? "white" : "#888", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                    >
                      {favorites[a.userId] ? "★" : "☆"}
                    </button>
                    {a.portfolioUrl && (
                      <a href={a.portfolioUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ padding: "6px 10px", borderRadius: 6, background: "#6366f1", color: "white", fontWeight: 600, fontSize: 12, textDecoration: "none" }}>
                        Portfolio
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p style={{ color: "#888", padding: 20, textAlign: "center", background: "white", borderRadius: 12, border: "1px solid #e5e5e5" }}>No artists in this country yet.</p>}
          </div>
        )}
      </main>
    </>
  );
}
