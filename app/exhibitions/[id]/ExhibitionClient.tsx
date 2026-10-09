"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { F, S } from "@/lib/design";

type ArtistRef = {
  id: string;
  name: string;
  artistId: string;
  country?: string | null;
  city?: string | null;
  genre?: string | null;
  profileImage?: string | null;
};

type Exhibition = {
  id: string;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  city?: string | null;
  country?: string | null;
  description?: string | null;
  space?: { id: string; name: string; type?: string | null; city?: string | null; country?: string | null; website?: string | null } | null;
  curator?: { id: string; name: string; bio?: string | null; organization?: string | null } | null;
  artists: { id: string; status: string; artist: ArtistRef }[];
};

function fmt(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

export default function ExhibitionPublicPage() {
  const { id } = useParams<{ id: string }>();
  const [ex, setEx] = useState<Exhibition | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/exhibitions/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.exhibition) setEx(d.exhibition); else setNotFound(true); })
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <>
        <TopBar />
        <main style={{ maxWidth: 700, margin: "80px auto", padding: "0 32px", textAlign: "center" }}>
          <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>Exhibition not found or not public.</p>
          <Link href="/open-calls" style={{ fontFamily: F, fontSize: 10, color: "#8B7355", letterSpacing: "0.1em", textTransform: "uppercase" }}>← Open Calls</Link>
        </main>
      </>
    );
  }

  if (!ex) {
    return (
      <>
        <TopBar />
        <main style={{ maxWidth: 700, margin: "80px auto", padding: "0 32px" }}>
          <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>Loading...</p>
        </main>
      </>
    );
  }

  const dateStr = fmt(ex.startDate) && fmt(ex.endDate)
    ? `${fmt(ex.startDate)} — ${fmt(ex.endDate)}`
    : fmt(ex.startDate) ?? fmt(ex.endDate) ?? null;

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "64px 40px" }}>
        {/* Header */}
        <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8A8A8A" }}>
          Exhibition
        </span>
        <h1 style={{ fontFamily: S, fontSize: 44, fontWeight: 300, color: "#1A1A1A", marginTop: 8, marginBottom: 4 }}>
          {ex.title}
        </h1>
        {(ex.city || ex.country) && (
          <p style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2", marginBottom: 4, letterSpacing: "0.06em" }}>
            {[ex.city, ex.country].filter(Boolean).join(", ")}
          </p>
        )}
        {dateStr && (
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginBottom: 0 }}>{dateStr}</p>
        )}

        {ex.description && (
          <div style={{ marginTop: 32, padding: "20px 24px", border: "1px solid #E8E3DB", background: "#FDFBF7" }}>
            <p style={{ fontFamily: F, fontSize: 13, color: "#4A4540", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>{ex.description}</p>
          </div>
        )}

        {/* Space & Curator row */}
        <div style={{ display: "grid", gridTemplateColumns: ex.space && ex.curator ? "1fr 1fr" : "1fr", gap: 16, marginTop: 36 }}>
          {ex.space && (
            <div style={{ padding: "20px 24px", border: "1px solid #E8E3DB", background: "#FFFFFF" }}>
              <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8B7355", margin: "0 0 10px" }}>Space</p>
              <Link href={`/spaces/${ex.space.id}`} style={{ textDecoration: "none" }}><p style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: "#1A1A1A", margin: "0 0 4px" }}>{ex.space.name}</p></Link>
              {ex.space.type && <p style={{ fontFamily: F, fontSize: 11, color: "#8A8580", margin: "0 0 4px", textTransform: "capitalize" }}>{ex.space.type.replace(/_/g, " ")}</p>}
              {(ex.space.city || ex.space.country) && (
                <p style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2", margin: "0 0 8px" }}>{[ex.space.city, ex.space.country].filter(Boolean).join(", ")}</p>
              )}
              {ex.space.website && (
                <a href={ex.space.website} target="_blank" rel="noreferrer" style={{ fontFamily: F, fontSize: 10, color: "#8B7355", letterSpacing: "0.08em" }}>{ex.space.website}</a>
              )}
            </div>
          )}

          {ex.curator && (
            <div style={{ padding: "20px 24px", border: "1px solid #E8E3DB", background: "#FFFFFF" }}>
              <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8B7355", margin: "0 0 10px" }}>Curator</p>
              <Link href={`/curators/${ex.curator.id}`} style={{ textDecoration: "none" }}><p style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: "#1A1A1A", margin: "0 0 4px" }}>{ex.curator.name}</p></Link>
              {ex.curator.organization && <p style={{ fontFamily: F, fontSize: 11, color: "#8A8580", margin: "0 0 4px" }}>{ex.curator.organization}</p>}
              {ex.curator.bio && <p style={{ fontFamily: F, fontSize: 12, color: "#6A6660", margin: "0", lineHeight: 1.6 }}>{ex.curator.bio}</p>}
            </div>
          )}
        </div>

        {/* Participating Artists */}
        {ex.artists.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8B7355", marginBottom: 16 }}>
              Participating Artists ({ex.artists.length})
            </p>
            <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
              {ex.artists.map(({ artist }, i) => (
                <Link
                  key={artist.id}
                  href={`/artist/public/${artist.artistId}`}
                  style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", background: "#FFFFFF", textDecoration: "none" }}
                >
                  {artist.profileImage ? (
                    <img src={artist.profileImage} alt={artist.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#F0EBE3", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: S, fontSize: 16, color: "#8B7355" }}>{artist.name[0]}</span>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: S, fontSize: 17, fontWeight: 400, color: "#1A1A1A", margin: 0 }}>{artist.name}</p>
                    <p style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2", margin: "2px 0 0", letterSpacing: "0.06em" }}>
                      {[artist.genre, artist.city, artist.country].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span style={{ fontFamily: F, fontSize: 10, color: "#D4C9B8", letterSpacing: "0.08em" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </Link>
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
