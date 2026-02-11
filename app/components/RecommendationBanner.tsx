"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { F, S } from "@/lib/design";

type Recommendation = {
  id: string;
  gallery: string;
  city: string;
  country: string;
  theme: string;
  deadline: string;
  matchScore: number;
  matchReasons: string[];
  isExternal?: boolean;
};

export default function RecommendationBanner() {
  const router = useRouter();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/recommendations", { cache: "no-store", credentials: "include" });
        const data = await res.json();
        if (data.recommendations) setRecs(data.recommendations);
      } catch {
        // Silent fail — recommendations are optional
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || dismissed || recs.length === 0) return null;

  return (
    <div style={{ marginBottom: 48, border: "1px solid #E8E3DB", background: "#FFFFFF" }}>
      {/* Header */}
      <div style={{ padding: "20px 32px", borderBottom: "1px solid #E8E3DB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
            Recommended for you
          </span>
          <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>
            Based on your profile
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{ border: "none", background: "transparent", color: "#B0AAA2", fontSize: 14, cursor: "pointer", padding: 4 }}
        >
          ×
        </button>
      </div>

      {/* Cards */}
      <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
        {recs.slice(0, 3).map((rec, i) => {
          const daysLeft = Math.ceil((new Date(rec.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          const scorePercent = Math.round(rec.matchScore * 100);

          return (
            <div
              key={rec.id}
              onClick={() => router.push(`/open-calls/${rec.id}`)}
              style={{ background: "#FFFFFF", padding: "24px 32px", cursor: "pointer", transition: "background 0.3s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#FAF8F4"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355" }}>
                      {rec.country} / {rec.city}
                    </span>
                    {rec.isExternal && (
                      <span style={{ fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#FFF", background: "#8B7355", padding: "2px 8px" }}>
                        Global
                      </span>
                    )}
                    {daysLeft <= 14 && (
                      <span style={{ fontFamily: F, fontSize: 9, fontWeight: 600, color: "#8B4A4A", background: "rgba(139,74,74,0.08)", padding: "2px 8px", letterSpacing: "0.08em" }}>
                        {daysLeft}d left
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: "#1A1A1A", marginBottom: 4 }}>
                    {rec.gallery}
                  </h4>
                  <p style={{ fontFamily: F, fontSize: 12, fontWeight: 300, color: "#8A8580" }}>{rec.theme}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                    {rec.matchReasons.map((r, j) => (
                      <span key={j} style={{ fontFamily: F, fontSize: 9, fontWeight: 500, padding: "3px 10px", background: "rgba(139,115,85,0.06)", color: "#8B7355", letterSpacing: "0.06em" }}>
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 20 }}>
                  <div style={{ fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#B0AAA2" }}>Match</div>
                  <div style={{ fontFamily: S, fontSize: 24, fontWeight: 400, color: scorePercent >= 60 ? "#5A7A5A" : "#1A1A1A" }}>
                    {scorePercent}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {recs.length > 3 && (
        <div style={{ padding: "14px 32px", textAlign: "center", borderTop: "1px solid #E8E3DB" }}>
          <button
            onClick={() => router.push("/open-calls")}
            style={{ border: "none", background: "transparent", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355", cursor: "pointer" }}
          >
            View all {recs.length} recommendations →
          </button>
        </div>
      )}
    </div>
  );
}
