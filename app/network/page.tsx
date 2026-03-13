"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import TopBar from "@/app/components/TopBar";
import { F, S } from "@/lib/design";

// Country → [lat, lng] lookup (no external geocoding needed)
const COUNTRY_COORDS: Record<string, [number, number]> = {
  "한국": [36.5, 127.5], "South Korea": [36.5, 127.5], "Korea": [36.5, 127.5],
  "일본": [36.2, 138.2], "Japan": [36.2, 138.2],
  "미국": [38.0, -97.0], "USA": [38.0, -97.0], "United States": [38.0, -97.0],
  "영국": [54.0, -2.0], "UK": [54.0, -2.0], "United Kingdom": [54.0, -2.0],
  "프랑스": [46.2, 2.2], "France": [46.2, 2.2],
  "독일": [51.2, 10.5], "Germany": [51.2, 10.5],
  "이탈리아": [41.9, 12.5], "Italy": [41.9, 12.5],
  "스위스": [46.8, 8.2], "Switzerland": [46.8, 8.2],
  "중국": [35.9, 104.2], "China": [35.9, 104.2],
  "호주": [-25.3, 133.8], "Australia": [-25.3, 133.8],
  "캐나다": [56.1, -106.3], "Canada": [56.1, -106.3],
  "네덜란드": [52.1, 5.3], "Netherlands": [52.1, 5.3],
  "스페인": [40.5, -3.7], "Spain": [40.5, -3.7],
  "벨기에": [50.8, 4.5], "Belgium": [50.8, 4.5],
  "오스트리아": [47.5, 14.5], "Austria": [47.5, 14.5],
  "폴란드": [51.9, 19.1], "Poland": [51.9, 19.1],
  "브라질": [-14.2, -51.9], "Brazil": [-14.2, -51.9],
  "멕시코": [23.6, -102.6], "Mexico": [23.6, -102.6],
  "아르헨티나": [-38.4, -63.6], "Argentina": [-38.4, -63.6],
  "싱가포르": [1.3, 103.8], "Singapore": [1.3, 103.8],
  "홍콩": [22.3, 114.2], "Hong Kong": [22.3, 114.2],
  "대만": [23.7, 121.0], "Taiwan": [23.7, 121.0],
  "인도": [20.6, 78.9], "India": [20.6, 78.9],
  "러시아": [61.5, 105.3], "Russia": [61.5, 105.3],
  "터키": [38.9, 35.2], "Turkey": [38.9, 35.2],
  "UAE": [23.4, 53.8], "아랍에미리트": [23.4, 53.8],
  "남아프리카공화국": [-28.5, 24.7], "South Africa": [-28.5, 24.7],
  "뉴질랜드": [-40.9, 174.9], "New Zealand": [-40.9, 174.9],
  "스웨덴": [60.1, 18.6], "Sweden": [60.1, 18.6],
  "노르웨이": [60.5, 8.5], "Norway": [60.5, 8.5],
  "덴마크": [56.3, 9.5], "Denmark": [56.3, 9.5],
  "핀란드": [61.9, 25.7], "Finland": [61.9, 25.7],
  "포르투갈": [39.4, -8.2], "Portugal": [39.4, -8.2],
  "그리스": [39.1, 21.8], "Greece": [39.1, 21.8],
  "체코": [49.8, 15.5], "Czech Republic": [49.8, 15.5],
  "헝가리": [47.2, 19.5], "Hungary": [47.2, 19.5],
  "루마니아": [45.9, 24.9], "Romania": [45.9, 24.9],
  "우크라이나": [48.4, 31.2], "Ukraine": [48.4, 31.2],
  "이스라엘": [31.0, 34.9], "Israel": [31.0, 34.9],
  "이란": [32.4, 53.7], "Iran": [32.4, 53.7],
  "태국": [15.9, 100.9], "Thailand": [15.9, 100.9],
  "베트남": [14.1, 108.3], "Vietnam": [14.1, 108.3],
  "인도네시아": [-0.8, 113.9], "Indonesia": [-0.8, 113.9],
  "말레이시아": [4.2, 108.0], "Malaysia": [4.2, 108.0],
  "필리핀": [12.9, 121.8], "Philippines": [12.9, 121.8],
};

type NodeData = { id: string; label: string; type: "artist" | "gallery"; country: string; genre: string; image: string | null; artistId: string | null };

// Leaflet map rendered only on client side
const WorldMap = dynamic(() => import("@/app/components/NetworkWorldMap"), { ssr: false, loading: () => (
  <div style={{ height: "calc(100vh - 120px)", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F1EB" }}>
    <p style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>지도 로딩 중...</p>
  </div>
) });

export default function NetworkPage() {
  const router = useRouter();
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"map" | "graph">("map");

  useEffect(() => {
    fetch("/api/network?limit=150")
      .then(r => r.json())
      .then(d => setNodes(d.nodes ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group nodes by country for stats
  const countryCount = nodes.reduce((acc: Record<string, number>, n) => {
    const c = n.country || "Unknown";
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  const topCountries = Object.entries(countryCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Build markers: group by country, scatter slightly per node
  const markers = nodes
    .map(n => {
      const coords = COUNTRY_COORDS[n.country];
      if (!coords) return null;
      const jitter = () => (Math.random() - 0.5) * 2.5;
      return { ...n, lat: coords[0] + jitter(), lng: coords[1] + jitter() };
    })
    .filter(Boolean) as (NodeData & { lat: number; lng: number })[];

  return (
    <>
      <TopBar />
      <div style={{ background: "#FDFBF7", minHeight: "calc(100vh - 60px)" }}>
        {/* Header */}
        <div style={{ padding: "28px 40px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E8E3DB" }}>
          <div>
            <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>Network</span>
            <h1 style={{ fontFamily: S, fontSize: 28, fontWeight: 300, color: "#1A1A1A", margin: "4px 0 0" }}>World Map</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Stats */}
            <div style={{ display: "flex", gap: 20, marginRight: 8 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: S, fontSize: 20, fontWeight: 300, color: "#1A1A1A" }}>{nodes.filter(n => n.type === "artist").length}</div>
                <div style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#B0AAA2" }}>아티스트</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: S, fontSize: 20, fontWeight: 300, color: "#8B7355" }}>{nodes.filter(n => n.type === "gallery").length}</div>
                <div style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#B0AAA2" }}>갤러리</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: S, fontSize: 20, fontWeight: 300, color: "#5A7A5A" }}>{Object.keys(countryCount).filter(c => c !== "Unknown").length}</div>
                <div style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#B0AAA2" }}>국가</div>
              </div>
            </div>
            {/* View toggle */}
            <div style={{ display: "flex", border: "1px solid #E8E3DB" }}>
              {(["map", "graph"] as const).map(v => (
                <button key={v} onClick={() => { if (v === "graph") router.push("/network?view=graph"); else setView("map"); }}
                  style={{ padding: "8px 16px", border: "none", background: view === v ? "#1A1A1A" : "transparent", color: view === v ? "#FDFBF7" : "#8A8580", fontFamily: F, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                  {v === "map" ? "지도" : "그래프"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ height: "calc(100vh - 160px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>데이터 로딩 중...</p>
          </div>
        ) : (
          <div style={{ display: "flex", height: "calc(100vh - 140px)" }}>
            {/* Map */}
            <div style={{ flex: 1 }}>
              <WorldMap markers={markers} />
            </div>
            {/* Sidebar */}
            <div style={{ width: 200, borderLeft: "1px solid #E8E3DB", padding: "24px 20px", overflowY: "auto", background: "#FDFBF7" }}>
              <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8B7355", margin: "0 0 16px" }}>Top Countries</p>
              {topCountries.map(([country, count]) => (
                <div key={country} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontFamily: F, fontSize: 11, color: "#4A4A4A" }}>{country}</span>
                    <span style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2" }}>{count}</span>
                  </div>
                  <div style={{ height: 2, background: "#F0EBE3" }}>
                    <div style={{ height: "100%", background: "#8B7355", width: `${(count / topCountries[0][1]) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
