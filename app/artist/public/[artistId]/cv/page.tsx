"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { F, S } from "@/lib/design";

const EVENT_LABEL: Record<string, string> = {
  exhibition: "Exhibition", collaboration: "Collaboration", publication: "Publication",
  series_start: "Series", residency: "Residency", award: "Award",
  grant: "Grant", opencall_result: "Open Call", press: "Press",
};

type CVData = {
  name: string; artistId: string; workNote?: string | null;
  country?: string | null; city?: string | null; genre?: string | null;
  startedYear?: number | null; instagram?: string | null; website?: string | null;
  exhibitions: { galleryName: string; theme: string; country: string; city: string; acceptedAt: string }[];
  series: { id: string; title: string; description?: string | null; startYear?: number | null; endYear?: number | null }[];
  artEvents: { id: string; eventType: string; title: string; year: number; description?: string | null }[];
};

export default function CVPage() {
  const { artistId } = useParams<{ artistId: string }>();
  const [data, setData] = useState<CVData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/artist/public/${artistId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!d || d.error) setNotFound(true); else setData(d); })
      .catch(() => setNotFound(true));
  }, [artistId]);

  if (notFound) return (
    <main style={{ maxWidth: 680, margin: "80px auto", padding: "0 32px", textAlign: "center" }}>
      <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>CV not available.</p>
    </main>
  );

  if (!data) return (
    <main style={{ maxWidth: 680, margin: "80px auto", padding: "0 32px" }}>
      <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>Loading...</p>
    </main>
  );

  const sortedEvents = [...data.artEvents].sort((a, b) => b.year - a.year);
  const grouped = sortedEvents.reduce<Record<string, typeof sortedEvents>>((acc, ev) => {
    const type = ev.eventType;
    acc[type] = acc[type] || [];
    acc[type].push(ev);
    return acc;
  }, {});

  const typeOrder = ["exhibition", "residency", "award", "grant", "opencall_result", "collaboration", "publication", "press", "series_start"];

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          main { padding: 20px !important; max-width: 100% !important; }
        }
      `}</style>
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "64px 40px", background: "#FDFBF7", minHeight: "100vh" }}>
        {/* Print button */}
        <div className="no-print" style={{ marginBottom: 32, display: "flex", gap: 12 }}>
          <button onClick={() => window.print()} style={{ padding: "10px 20px", border: "1px solid #1A1A1A", background: "#1A1A1A", color: "#FFFFFF", fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
            Print / Save PDF
          </button>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); }} style={{ padding: "10px 20px", border: "1px solid #E8E3DB", background: "#FFFFFF", color: "#4A4A4A", fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
            Copy Link
          </button>
        </div>

        {/* Header */}
        <div style={{ borderBottom: "2px solid #1A1A1A", paddingBottom: 24, marginBottom: 32 }}>
          <h1 style={{ fontFamily: S, fontSize: 48, fontWeight: 300, color: "#1A1A1A", margin: 0 }}>{data.name}</h1>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 12 }}>
            {data.genre && <span style={{ fontFamily: F, fontSize: 11, color: "#4A4A4A" }}>{data.genre}</span>}
            {(data.city || data.country) && <span style={{ fontFamily: F, fontSize: 11, color: "#4A4A4A" }}>{[data.city, data.country].filter(Boolean).join(", ")}</span>}
            {data.startedYear && <span style={{ fontFamily: F, fontSize: 11, color: "#8A8580" }}>Active since {data.startedYear}</span>}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
            {data.website && <a href={data.website} target="_blank" rel="noreferrer" style={{ fontFamily: F, fontSize: 11, color: "#8B7355", textDecoration: "none" }}>{data.website}</a>}
            {data.instagram && <a href={data.instagram} target="_blank" rel="noreferrer" style={{ fontFamily: F, fontSize: 11, color: "#8B7355", textDecoration: "none" }}>{data.instagram}</a>}
          </div>
        </div>

        {/* Statement */}
        {data.workNote && (
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355", marginBottom: 12 }}>Statement</h2>
            <p style={{ fontFamily: F, fontSize: 13, color: "#4A4540", lineHeight: 1.9, whiteSpace: "pre-wrap", margin: 0 }}>{data.workNote}</p>
          </div>
        )}

        {/* Activity by category */}
        {typeOrder.filter(t => grouped[t]?.length).map(type => (
          <div key={type} style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355", marginBottom: 12, borderBottom: "1px solid #E8E3DB", paddingBottom: 8 }}>
              {EVENT_LABEL[type] ?? type}
            </h2>
            <div style={{ display: "grid", gap: 10 }}>
              {grouped[type].map(ev => (
                <div key={ev.id} style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
                  <span style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2", flexShrink: 0, width: 36 }}>{ev.year}</span>
                  <div>
                    <span style={{ fontFamily: F, fontSize: 13, color: "#1A1A1A" }}>{ev.title}</span>
                    {ev.description && <p style={{ fontFamily: F, fontSize: 11, color: "#8A8580", margin: "2px 0 0", lineHeight: 1.5 }}>{ev.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Exhibition history */}
        {data.exhibitions.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355", marginBottom: 12, borderBottom: "1px solid #E8E3DB", paddingBottom: 8 }}>
              Selected Exhibitions (via ROB)
            </h2>
            <div style={{ display: "grid", gap: 10 }}>
              {data.exhibitions.map((ex, i) => (
                <div key={i} style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
                  <span style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2", flexShrink: 0, width: 36 }}>
                    {new Date(ex.acceptedAt).getFullYear()}
                  </span>
                  <div>
                    <span style={{ fontFamily: F, fontSize: 13, color: "#1A1A1A" }}>{ex.galleryName}</span>
                    <span style={{ fontFamily: F, fontSize: 11, color: "#8A8580" }}> · {ex.theme}</span>
                    {(ex.city || ex.country) && <span style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2" }}> · {[ex.city, ex.country].filter(Boolean).join(", ")}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Series */}
        {data.series.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355", marginBottom: 12, borderBottom: "1px solid #E8E3DB", paddingBottom: 8 }}>
              Artwork Series
            </h2>
            <div style={{ display: "grid", gap: 10 }}>
              {data.series.map(s => (
                <div key={s.id} style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
                  <span style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2", flexShrink: 0, width: 36 }}>
                    {s.startYear ?? "—"}
                  </span>
                  <div>
                    <span style={{ fontFamily: F, fontSize: 13, color: "#1A1A1A" }}>{s.title}</span>
                    {s.endYear && s.endYear !== s.startYear && <span style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2" }}> – {s.endYear}</span>}
                    {s.description && <p style={{ fontFamily: F, fontSize: 11, color: "#8A8580", margin: "2px 0 0" }}>{s.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ borderTop: "1px solid #E8E3DB", paddingTop: 20, marginTop: 40 }}>
          <p style={{ fontFamily: F, fontSize: 10, color: "#C8C0B4", letterSpacing: "0.06em", margin: 0 }}>
            ROLE OF BRIDGE — {data.artistId} — {new Date().getFullYear()}
          </p>
        </div>
      </main>
    </>
  );
}
