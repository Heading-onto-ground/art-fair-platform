"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { F, S } from "@/lib/design";

type Exhibition = {
  galleryName: string;
  theme: string;
  country: string;
  city: string;
  acceptedAt: string;
};

type SeriesItem = {
  id: string;
  title: string;
  description?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  works?: string | null;
};

type ArtEventItem = {
  id: string;
  eventType: "exhibition" | "collaboration" | "publication" | "series_start" | "residency" | "award" | "grant" | "opencall_result" | "press";
  title: string;
  year: number;
  description?: string | null;
};

const EVENT_LABEL: Record<string, string> = {
  exhibition: "Exhibition",
  collaboration: "Collaboration",
  publication: "Publication",
  series_start: "Series",
  residency: "Residency",
  award: "Award",
  grant: "Grant",
  opencall_result: "Open Call",
  press: "Press",
};

const EVENT_COLOR: Record<string, string> = {
  exhibition: "#8B7355",
  collaboration: "#5A7A5A",
  publication: "#5A5A8B",
  series_start: "#8B5A5A",
  residency: "#4A7A8B",
  award: "#8B7A2A",
  grant: "#2A7A5A",
  opencall_result: "#7A4A8B",
  press: "#6A6A6A",
};

export default function ArtistPublicClient() {
  const { artistId } = useParams<{ artistId: string }>();
  const [data, setData] = useState<{
    name: string;
    userId?: string | null;
    workNote?: string | null;
    trustScore?: number;
    trustLevel?: "basic" | "verified" | "trusted";
    exhibitions: Exhibition[];
    series: SeriesItem[];
    artEvents: ArtEventItem[];
  } | null>(null);
  const [me, setMe] = useState<{ session?: { userId: string; role: string } } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/artist/public/${artistId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!d || d.error) setNotFound(true); else setData(d); })
      .catch(() => setNotFound(true));
    fetch(`/api/follow?artistId=${encodeURIComponent(artistId)}`)
      .then(r => r.json())
      .then(d => { setFollowing(d.following); setFollowCount(d.count); })
      .catch(() => {});
    fetch("/api/metrics/public-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artistId }),
    }).catch(() => {});
    fetch("/api/auth/me?lite=1", { credentials: "include" })
      .then(r => r.json())
      .then(d => setMe(d))
      .catch(() => setMe(null));
  }, [artistId]);

  async function toggleFollow() {
    if (followLoading) return;
    setFollowLoading(true);
    const method = following ? "DELETE" : "POST";
    const res = await fetch("/api/follow", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artistId }),
    }).catch(() => null);
    if (res?.ok) {
      const d = await res.json().catch(() => null);
      if (d) { setFollowing(d.following); setFollowCount(d.count); }
    }
    setFollowLoading(false);
  }

  if (notFound) {
    return (
      <>
        <TopBar />
        <main style={{ maxWidth: 600, margin: "80px auto", padding: "0 32px", textAlign: "center" }}>
          <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>Exhibition history is not public.</p>
        </main>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <TopBar />
        <main style={{ maxWidth: 600, margin: "80px auto", padding: "0 32px" }}><p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>Loading...</p></main>
      </>
    );
  }

  const trust =
    data.trustLevel === "trusted"
      ? { label: "Trusted", color: "#2E6B45", bg: "#EDF7F1", border: "#D6EAD8" }
      : data.trustLevel === "verified"
        ? { label: "Verified", color: "#7A6030", bg: "#FFF6E8", border: "#EFD9B7" }
        : { label: "Basic", color: "#8A8580", bg: "#F5F3F0", border: "#ECEAE6" };

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "64px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8A8A8A" }}>
          Exhibition History
        </span>
        <button
          onClick={toggleFollow}
          disabled={followLoading}
          style={{ padding: "8px 18px", border: following ? "1px solid #1A1A1A" : "1px solid #E8E3DB", background: following ? "#1A1A1A" : "#FFFFFF", color: following ? "#FFFFFF" : "#4A4A4A", fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: followLoading ? "wait" : "pointer", opacity: followLoading ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8 }}
        >
          {following ? "Following" : "Follow"}
          {followCount > 0 && <span style={{ fontSize: 9, opacity: 0.7, padding: "1px 6px", background: following ? "rgba(255,255,255,0.2)" : "#F5F0EB" }}>{followCount}</span>}
        </button>
      </div>
      <h1 style={{ fontFamily: S, fontSize: 40, fontWeight: 300, color: "#1A1A1A", marginTop: 8, marginBottom: 8 }}>
        {data.name}
      </h1>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", color: trust.color, background: trust.bg, border: `1px solid ${trust.border}`, padding: "3px 8px" }}>
          {trust.label}
        </span>
        <span style={{ fontFamily: F, fontSize: 10, color: "#8A8580" }}>
          Trust score {Math.max(0, Math.min(100, Number(data.trustScore ?? 0)))}
        </span>
      </div>
      <p style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2", letterSpacing: "0.08em", marginBottom: 32 }}>
        {artistId}
      </p>

      {data.workNote && (
        <div style={{ marginBottom: 36, padding: "20px 24px", border: "1px solid #E8E3DB", background: "#FDFBF7" }}>
          <p style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8B7355", marginBottom: 10 }}>Work Note</p>
          <p style={{ fontFamily: F, fontSize: 13, color: "#4A4540", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>{data.workNote}</p>
        </div>
      )}

      {/* Add Exhibition CTA: 본인 타임라인일 때 (작가 retention) */}
      {me?.session?.role === "artist" && me?.session?.userId === data?.userId && (
        <div style={{ marginBottom: 32, padding: "20px 24px", border: "2px solid #2563EB", background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)", borderRadius: 14 }}>
          <p style={{ fontFamily: F, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#2563EB", marginBottom: 8 }}>
            Add Your Recent Exhibition
          </p>
          <p style={{ fontFamily: F, fontSize: 12, color: "#1E40AF", marginBottom: 14, lineHeight: 1.5 }}>
            전시를 등록하면 여기 타임라인에 자동으로 쌓입니다.
          </p>
          <Link
            href="/exhibitions/new"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "#2563EB", color: "#FFFFFF", fontFamily: F, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", borderRadius: 8 }}
          >
            + Add Exhibition
          </Link>
        </div>
      )}

      {data.exhibitions.length > 0 && (() => {
        const latest = data.exhibitions.reduce((a, b) =>
          new Date(a.acceptedAt) > new Date(b.acceptedAt) ? a : b
        );
        return (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 32, padding: "8px 14px", border: "1px solid #D4C9B8", background: "#FDFBF8" }}>
            <span style={{ fontSize: 13, lineHeight: 1 }}>✦</span>
            <div>
              <p style={{ margin: 0, fontFamily: F, fontSize: 10, fontWeight: 600, color: "#8B7355", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                ROB Verified Exhibition History
              </p>
              <p style={{ margin: "2px 0 0", fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>
                Last updated: {new Date(latest.acceptedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
      })()}

      {data.exhibitions.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 40, flexWrap: "wrap" }}>
          <a
            href={`mailto:?subject=${encodeURIComponent(`ROB Verified Exhibition History - ${data.name}`)}&body=${encodeURIComponent(`Hi,\nHere is my verified exhibition history on ROB:\nhttps://rob-roleofbridge.com/artist/public/${artistId}\n`)}`}
            style={{ padding: "9px 16px", border: "1px solid #D4C9B8", background: "#FDFBF8", fontFamily: F, fontSize: 10, fontWeight: 600, color: "#8B7355", letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}
          >
            Invite a Gallery →
          </a>
          <Link
            href="/open-calls"
            style={{ padding: "9px 16px", border: "1px solid #E8E3DB", background: "#FFFFFF", fontFamily: F, fontSize: 10, fontWeight: 600, color: "#6A6660", letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}
          >
            Explore Open Calls →
          </Link>
        </div>
      )}

      {data.exhibitions.length === 0 ? (
        <p style={{ fontFamily: S, fontSize: 16, fontStyle: "italic", color: "#B0AAA2" }}>No exhibitions yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
          {data.exhibitions.map((ex, i) => (
            <div key={i} style={{ background: "#FFFFFF", padding: "24px 28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355" }}>
                    {String(i + 1).padStart(2, "0")} · {ex.country} / {ex.city}
                  </span>
                  <h3 style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: "#1A1A1A", margin: "6px 0 4px" }}>
                    {ex.galleryName}
                  </h3>
                  <p style={{ fontFamily: F, fontSize: 13, color: "#6A6660", margin: 0 }}>{ex.theme}</p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#B0AAA2" }}>
                    Accepted
                  </span>
                  <div style={{ fontFamily: S, fontSize: 14, color: "#1A1A1A", marginTop: 4 }}>
                    {ex.acceptedAt ? new Date(ex.acceptedAt).toLocaleDateString() : "-"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.artEvents && data.artEvents.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <p style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8B7355", marginBottom: 20 }}>Activity Timeline</p>
          <div style={{ position: "relative", paddingLeft: 24 }}>
            <div style={{ position: "absolute", left: 7, top: 0, bottom: 0, width: 1, background: "#E8E3DB" }} />
            {data.artEvents.map((ev) => (
              <div key={ev.id} style={{ position: "relative", marginBottom: 24, paddingLeft: 20 }}>
                <div style={{ position: "absolute", left: -1, top: 5, width: 9, height: 9, borderRadius: "50%", background: EVENT_COLOR[ev.eventType] ?? "#8A8580", border: "2px solid #FDFBF7" }} />
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: EVENT_COLOR[ev.eventType] ?? "#8A8580", background: "rgba(139,115,85,0.07)", padding: "2px 8px" }}>
                    {EVENT_LABEL[ev.eventType] ?? ev.eventType}
                  </span>
                  <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>{ev.year}</span>
                </div>
                <p style={{ fontFamily: S, fontSize: 18, fontWeight: 400, color: "#1A1A1A", margin: "4px 0 2px" }}>{ev.title}</p>
                {ev.description && <p style={{ fontFamily: F, fontSize: 12, color: "#6A6660", margin: 0, lineHeight: 1.6 }}>{ev.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.series && data.series.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <p style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8B7355", marginBottom: 16 }}>Artwork Series</p>
          <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
            {data.series.map((s, i) => (
              <div key={s.id} style={{ background: "#FFFFFF", padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#B0AAA2" }}>{String(i + 1).padStart(2, "0")}</span>
                  <h3 style={{ fontFamily: S, fontSize: 18, fontWeight: 400, color: "#1A1A1A", margin: 0 }}>{s.title}</h3>
                  {(s.startYear || s.endYear) && <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>{s.startYear ?? "?"} — {s.endYear ?? "present"}</span>}
                </div>
                {s.description && <p style={{ fontFamily: F, fontSize: 12, color: "#6A6660", margin: "0 0 8px" }}>{s.description}</p>}
                {s.works && <p style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2", margin: 0, whiteSpace: "pre-wrap" }}>{s.works}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ marginTop: 48, fontFamily: F, fontSize: 10, color: "#C8C0B4", letterSpacing: "0.06em" }}>
        ROLE OF BRIDGE — Artist Platform
      </p>
    </main>
    </>
  );
}
