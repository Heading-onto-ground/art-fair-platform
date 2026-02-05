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
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  async function load() {
    try {
      setError(null);
      setLoading(true);

      const [ocRes, appRes] = await Promise.all([
        fetch("/api/open-calls", { cache: "no-store" }),
        fetch("/api/applications", { cache: "no-store", credentials: "include" }),
      ]);

      if (!ocRes.ok) throw new Error(`HTTP ${ocRes.status}`);

      const ocData = (await ocRes.json()) as { openCalls: OpenCall[] };
      setOpenCalls(Array.isArray(ocData.openCalls) ? ocData.openCalls : []);

      // 이미 지원한 오픈콜 ID 목록
      const appData = await appRes.json().catch(() => null);
      if (appData?.applications) {
        const ids = new Set<string>(appData.applications.map((a: any) => a.openCallId));
        setAppliedIds(ids);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load open calls");
      setOpenCalls([]);
    } finally {
      setLoading(false);
    }
  }

  async function applyToOpenCall(openCallId: string, galleryId: string) {
    setApplyingId(openCallId);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ openCallId, galleryId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.application) {
        alert(data?.error || "지원 실패");
        return;
      }
      setAppliedIds((prev) => new Set([...prev, openCallId]));
      alert("지원 완료! 갤러리의 검토를 기다려주세요.");
    } catch {
      alert("서버 오류");
    } finally {
      setApplyingId(null);
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
                {appliedIds.has(o.id) ? (
                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: 10,
                      background: "#10b981",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    ✓ 지원완료
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      applyToOpenCall(o.id, o.galleryId);
                    }}
                    disabled={applyingId === o.id}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 10,
                      border: "none",
                      background: "#6366f1",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {applyingId === o.id ? "지원중..." : "지원하기"}
                  </button>
                )}
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
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {contactingId === o.id ? "..." : "메시지"}
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
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  상세보기
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