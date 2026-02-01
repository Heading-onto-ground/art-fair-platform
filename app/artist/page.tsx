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

type Role = "artist" | "gallery";
type MeResponse = {
  session: { userId: string; role: Role; email?: string } | null;
  profile: any | null;
};

async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    return (await res.json().catch(() => null)) as MeResponse | null;
  } catch {
    return null;
  }
}

export default function ArtistPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [openCalls, setOpenCalls] = useState<OpenCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contactingId, setContactingId] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string>("한국");

  async function load() {
    try {
      setError(null);
      setLoading(true);

      const res = await fetch("/api/open-calls", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // ✅ 중요: API 응답은 { openCalls: [...] }
      const data = (await res.json()) as { openCalls: OpenCall[] };
      setOpenCalls(Array.isArray(data.openCalls) ? data.openCalls : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load open calls");
      setOpenCalls([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const m = await fetchMe();
      const s = m?.session;
      if (!s) {
        router.replace("/login?role=artist");
        return;
      }
      if (s.role !== "artist") {
        router.replace("/gallery");
        return;
      }
      setMe(m);
      await load();
    })();
  }, [router]);

  const countries = useMemo(() => ["한국", "일본", "영국"], []);

  const filtered = useMemo(() => {
    return openCalls.filter((o) => (o.country ?? "").trim() === countryFilter);
  }, [openCalls, countryFilter]);

  async function contactGallery(openCallId: string, galleryId: string) {
    setContactError(null);
    setContactingId(openCallId);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ openCallId, galleryId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.roomId) {
        throw new Error(data?.error ?? `Failed to create chat (${res.status})`);
      }
      router.push(`/chat/${String(data.roomId)}`);
    } catch (e: any) {
      setContactError(e?.message ?? "Failed to contact gallery");
    } finally {
      setContactingId(null);
    }
  }

  return (
    <>
      <TopBar />
      <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 900 }}>{t("artist_page_title", lang)} 🎨</h1>
            <p style={{ opacity: 0.8, marginTop: 6 }}>
              Choose a country tab to explore open calls.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <button onClick={load}>{t("refresh", lang)}</button>
            <button onClick={() => router.push("/artist/me")}>My Profile</button>
            <Link
              href="/open-calls"
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.2)",
                textDecoration: "none",
                color: "inherit",
                fontWeight: 700,
              }}
            >
              Full list →
            </Link>
          </div>
        </div>

      {/* Country tabs */}
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
                border: "1px solid rgba(255,255,255,0.2)",
                background: active ? "rgba(255,255,255,0.12)" : "transparent",
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
        <p style={{ marginTop: 14 }}>Loading…</p>
      ) : error ? (
        <div
          style={{
            marginTop: 14,
            border: "1px solid rgba(255,80,80,0.5)",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <b>Error:</b> {error}
        </div>
      ) : (
        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {filtered.map((o) => (
            <div
              key={o.id}
              onClick={() => router.push(`/open-calls/${o.id}`)}
              role="button"
              style={{
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 14,
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
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    contactGallery(o.id, o.galleryId);
                  }}
                  disabled={contactingId === o.id}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "1px solid #111",
                    background: "#111",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {contactingId === o.id ? "Creating chat…" : "Message gallery"}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/open-calls/${o.id}`);
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.2)",
                    background: "#fff",
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  View details
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p style={{ opacity: 0.8 }}>
              No open calls for this country yet.
            </p>
          )}
        </div>
      )}
      {contactError && (
        <div style={{ marginTop: 12, color: "#c00" }}>{contactError}</div>
      )}
      </div>
    </>
  );
}