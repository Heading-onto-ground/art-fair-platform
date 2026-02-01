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
      setError("Failed to load /api/open-calls");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const countries = useMemo(() => ["한국", "일본", "영국"], []);

  const filtered = useMemo(() => {
    return openCalls.filter((o) => (o.country ?? "").trim() === countryFilter);
  }, [openCalls, countryFilter]);

  return (
    <>
      <TopBar />
      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>
            {t("open_calls_title", lang)} 🌍
          </h1>
          <p style={{ opacity: 0.8, marginTop: 6 }}>
            Discover open calls and contact galleries.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <button onClick={load}>{t("refresh", lang)}</button>
          <Link
            href="/open-calls/new"
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.2)",
              textDecoration: "none",
              color: "inherit",
              fontWeight: 700,
            }}
          >
            + Create
          </Link>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {countries.map((c) => {
          const active = c === countryFilter;
          return (
            <button
              key={c}
              onClick={() => setCountryFilter(c)}
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

      {loading ? (
        <p>Loading…</p>
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
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {filtered.map((o) => (
            <div
              key={o.id}
              onClick={() => router.push(`/open-calls/${o.id}`)}
              role="button"
              style={{
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 12,
                padding: 14,
                color: "inherit",
                cursor: "pointer",
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>
                  {o.country} {o.city} ·{" "}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/galleries/${encodeURIComponent(o.galleryId)}`);
                    }}
                    style={{ textDecoration: "underline", cursor: "pointer" }}
                  >
                    {o.gallery}
                  </span>
                </strong>
                <span style={{ opacity: 0.8 }}>Deadline: {o.deadline}</span>
              </div>
              <div style={{ marginTop: 6, opacity: 0.9 }}>
                Theme: <b>{o.theme}</b>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p style={{ opacity: 0.8 }}>No open calls for this country yet.</p>
          )}
        </div>
      )}
      </div>
    </>
  );
}