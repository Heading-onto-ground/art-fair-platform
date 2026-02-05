"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/translate";

type OpenCall = {
  id: string;
  galleryId: string;
  gallery: string;
  city: string;
  country: string;
  theme: string;
  deadline: string;
};

export default function OpenCallsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [openCalls, setOpenCalls] = useState<OpenCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string>("한국");

  async function load() {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch("/api/open-calls");
      const data = await res.json();
      setOpenCalls(data.openCalls ?? []);
    } catch {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const countries = useMemo(() => ["한국", "일본", "영국"], []);
  const filtered = useMemo(() => openCalls.filter((o) => (o.country ?? "").trim() === countryFilter), [openCalls, countryFilter]);

  return (
    <>
      <TopBar />
      <main style={{ padding: "28px 24px", maxWidth: 860, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111" }}>
              {t("open_calls_title", lang)}
            </h1>
            <p style={{ color: "#888", fontSize: 14, marginTop: 4 }}>
              Discover open calls from galleries worldwide
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={load} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e5e5", background: "white", color: "#888", fontWeight: 500, fontSize: 12, cursor: "pointer" }}>
              {t("refresh", lang)}
            </button>
            <Link href="/open-calls/new" style={{ padding: "10px 14px", borderRadius: 8, background: "#6366f1", color: "white", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
              + Create
            </Link>
          </div>
        </div>

        {/* Country Filter */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {countries.map((c) => (
            <button
              key={c}
              onClick={() => setCountryFilter(c)}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: c === countryFilter ? "1px solid #6366f1" : "1px solid #e5e5e5",
                background: c === countryFilter ? "rgba(99,102,241,0.1)" : "white",
                color: c === countryFilter ? "#6366f1" : "#555",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <p style={{ color: "#888", padding: 20 }}>Loading...</p>
        ) : error ? (
          <div style={{ padding: 16, borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
            {error}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((o) => (
              <div
                key={o.id}
                onClick={() => router.push(`/open-calls/${o.id}`)}
                style={{
                  background: "white",
                  border: "1px solid #e5e5e5",
                  borderRadius: 12,
                  padding: 18,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6366f1"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e5e5"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 700, color: "#111" }}>
                    {o.country} {o.city} ·{" "}
                    <span
                      onClick={(e) => { e.stopPropagation(); router.push(`/galleries/${encodeURIComponent(o.galleryId)}`); }}
                      style={{ color: "#6366f1", cursor: "pointer" }}
                    >
                      {o.gallery}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: "#888", background: "#f5f5f5", padding: "4px 10px", borderRadius: 6 }}>
                    Deadline: {o.deadline}
                  </span>
                </div>
                <div style={{ marginTop: 8, fontSize: 14, color: "#555" }}>
                  Theme: <b style={{ color: "#111" }}>{o.theme}</b>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p style={{ color: "#888", padding: 20, textAlign: "center", background: "white", borderRadius: 12, border: "1px solid #e5e5e5" }}>
                No open calls for this country yet.
              </p>
            )}
          </div>
        )}
      </main>
    </>
  );
}
