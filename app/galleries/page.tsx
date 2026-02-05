"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";

type Gallery = { userId: string; name: string; email: string; country: string; city: string; updatedAt?: number };

// 나라 이름 → 이모지 매핑 (자동 확장 가능)
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

export default function GalleriesPage() {
  const router = useRouter();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState<string>("ALL");
  const [query, setQuery] = useState("");
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
      setError(e?.message ?? "Failed to load");
      setGalleries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    try { setFavorites(JSON.parse(localStorage.getItem("favorite_galleries") || "{}")); } catch { setFavorites({}); }
  }, []);

  useEffect(() => { localStorage.setItem("favorite_galleries", JSON.stringify(favorites)); }, [favorites]);

  // 갤러리 데이터에서 동적으로 나라 목록 생성
  const countryTabs = useMemo(() => {
    const countries = galleries
      .map((g) => (g.country ?? "").trim())
      .filter(Boolean);
    const uniqueCountries = Array.from(new Set(countries)).sort((a, b) => {
      // 갤러리 수가 많은 나라가 앞에 오도록 정렬
      const countA = galleries.filter((g) => g.country === a).length;
      const countB = galleries.filter((g) => g.country === b).length;
      return countB - countA;
    });
    return ["ALL", ...uniqueCountries];
  }, [galleries]);

  // 각 나라별 갤러리 수
  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: galleries.length };
    galleries.forEach((g) => {
      const c = (g.country ?? "").trim();
      if (c) counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [galleries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return galleries.filter((g) => {
      // "ALL"이면 모든 나라 표시
      if (country !== "ALL" && (g.country ?? "").trim() !== country) return false;
      if (!q) return true;
      return g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q) || g.city.toLowerCase().includes(q);
    });
  }, [galleries, country, query]);

  return (
    <>
      <TopBar />
      <main style={{ padding: "28px 24px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111" }}>Galleries</h1>
            <p style={{ color: "#888", fontSize: 14, marginTop: 4 }}>Browse galleries by country</p>
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
                border: c === country ? "1px solid #ec4899" : "1px solid #e5e5e5",
                background: c === country ? "rgba(236,72,153,0.1)" : "white",
                color: c === country ? "#ec4899" : "#666",
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
                background: c === country ? "rgba(236,72,153,0.2)" : "#f5f5f5",
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
            {filtered.map((g) => (
              <div
                key={g.userId}
                onClick={() => router.push(`/galleries/${encodeURIComponent(g.userId)}`)}
                style={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 12, padding: 16, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#ec4899"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e5e5"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#111" }}>🏛️ {g.name}</div>
                    <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>{g.city}, {g.country}</div>
                    <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{g.email}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFavorites((p) => ({ ...p, [g.userId]: !p[g.userId] })); }}
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e5e5", background: favorites[g.userId] ? "#ec4899" : "white", color: favorites[g.userId] ? "white" : "#888", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                  >
                    {favorites[g.userId] ? "★" : "☆"}
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p style={{ color: "#888", padding: 20, textAlign: "center", background: "white", borderRadius: 12, border: "1px solid #e5e5e5" }}>No galleries in this country yet.</p>}
          </div>
        )}
      </main>
    </>
  );
}
