"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { F, S } from "@/lib/design";

type Exhibition = {
  galleryName: string;
  theme: string;
  country: string;
  city: string;
  acceptedAt: string;
};

export default function ArtistPublicPage() {
  const { artistId } = useParams<{ artistId: string }>();
  const [data, setData] = useState<{ name: string; exhibitions: Exhibition[] } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/artist/public/${artistId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!d || d.error) setNotFound(true); else setData(d); })
      .catch(() => setNotFound(true));
  }, [artistId]);

  if (notFound) {
    return (
      <main style={{ maxWidth: 600, margin: "80px auto", padding: "0 32px", textAlign: "center" }}>
        <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>Exhibition history is not public.</p>
      </main>
    );
  }

  if (!data) {
    return <main style={{ maxWidth: 600, margin: "80px auto", padding: "0 32px" }}><p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>Loading...</p></main>;
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "64px 40px" }}>
      <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8A8A8A" }}>
        Exhibition History
      </span>
      <h1 style={{ fontFamily: S, fontSize: 40, fontWeight: 300, color: "#1A1A1A", marginTop: 8, marginBottom: 8 }}>
        {data.name}
      </h1>
      <p style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2", letterSpacing: "0.08em", marginBottom: 48 }}>
        {artistId}
      </p>

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

      <p style={{ marginTop: 48, fontFamily: F, fontSize: 10, color: "#C8C0B4", letterSpacing: "0.06em" }}>
        ROLE OF BRIDGE — Artist Platform
      </p>
    </main>
  );
}
