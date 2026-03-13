"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";

type Space = { id: string; name: string; type?: string | null; city?: string | null; country?: string | null; website?: string | null };
type Artist = { id: string; name: string; artistId: string; country?: string | null; genre?: string | null; profileImage?: string | null };
type Exhibition = { id: string; title: string; startDate?: string | null; endDate?: string | null; curator?: { id: string; name: string; organization?: string | null } | null; artists: { artist: Artist }[] };

function yr(d?: string | null) { return d ? new Date(d).getFullYear() : null; }

export default function SpacePage() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useLanguage();
  const router = useRouter();
  const [space, setSpace] = useState<Space | null>(null);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/spaces/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.space) { setSpace(d.space); setExhibitions(d.exhibitions ?? []); }
        else setNotFound(true);
      }).catch(() => setNotFound(true));
  }, [id]);

  if (notFound) return <><TopBar /><main style={{ maxWidth: 700, margin: "80px auto", padding: "0 32px", textAlign: "center" }}><p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>Space not found.</p><Link href="/discover" style={{ fontFamily: F, fontSize: 10, color: "#8B7355", letterSpacing: "0.1em", textTransform: "uppercase" }}>← Discover</Link></main></>;
  if (!space) return <><TopBar /><div style={{ padding: 60, textAlign: "center", fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>Loading…</div></>;

  // unique artists
  const artistMap = new Map<string, Artist>();
  for (const ex of exhibitions) for (const ea of ex.artists) artistMap.set(ea.artist.artistId, ea.artist);
  const artists = Array.from(artistMap.values());

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ marginBottom: 8 }}>
          <button onClick={() => router.back()} style={{ fontFamily: F, fontSize: 10, color: "#8A8580", letterSpacing: "0.1em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", padding: 0 }}>← Back</button>
        </div>
        <div style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355", marginBottom: 12, marginTop: 24 }}>
          {space.type ?? (lang === "ko" ? "공간" : "Space")}
        </div>
        <h1 style={{ fontFamily: S, fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 300, color: "#1A1A1A", margin: 0 }}>{space.name}</h1>
        <div style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap" }}>
          {space.city && <span>{space.city}</span>}
          {space.country && <span>{space.country}</span>}
          {space.website && <a href={space.website} target="_blank" rel="noopener noreferrer" style={{ color: "#8B7355" }}>{space.website}</a>}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 32, marginTop: 32, paddingBottom: 32, borderBottom: "1px solid #E8E3DB" }}>
          <div><div style={{ fontFamily: S, fontSize: 32, fontWeight: 300, color: "#1A1A1A" }}>{exhibitions.length}</div><div style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8A8580" }}>{lang === "ko" ? "전시" : "Exhibitions"}</div></div>
          <div><div style={{ fontFamily: S, fontSize: 32, fontWeight: 300, color: "#1A1A1A" }}>{artists.length}</div><div style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8A8580" }}>{lang === "ko" ? "작가" : "Artists"}</div></div>
        </div>

        {/* Exhibitions */}
        <div style={{ marginTop: 40, marginBottom: 48 }}>
          <h2 style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355", marginBottom: 20 }}>
            {lang === "ko" ? "전시 목록" : "Exhibitions"}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#E8E3DB" }}>
            {exhibitions.map(ex => (
              <Link key={ex.id} href={`/exhibitions/${ex.id}`} style={{ background: "#FDFBF7", padding: "20px 24px", textDecoration: "none", display: "block" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F5F0E8"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#FDFBF7"; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: S, fontSize: 18, fontWeight: 400, color: "#1A1A1A", marginBottom: 6 }}>{ex.title}</div>
                    {ex.curator && <div style={{ fontFamily: F, fontSize: 10, color: "#8A8580" }}>{lang === "ko" ? "큐레이터" : "Curated by"}: <Link href={`/curators/${ex.curator.id}`} onClick={e => e.stopPropagation()} style={{ color: "#8B7355" }}>{ex.curator.name}</Link></div>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                      {ex.artists.slice(0, 5).map(ea => (
                        <span key={ea.artist.artistId} style={{ fontFamily: F, fontSize: 10, color: "#4A4A4A", background: "#F0EBE3", padding: "2px 8px" }}>{ea.artist.name}</span>
                      ))}
                      {ex.artists.length > 5 && <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>+{ex.artists.length - 5}</span>}
                    </div>
                  </div>
                  {yr(ex.startDate) && <div style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2", whiteSpace: "nowrap" }}>{yr(ex.startDate)}</div>}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Artists */}
        {artists.length > 0 && (
          <div>
            <h2 style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355", marginBottom: 20 }}>
              {lang === "ko" ? "참여 작가" : "Artists"}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 1, background: "#E8E3DB" }}>
              {artists.map(a => (
                <Link key={a.artistId} href={`/artist/public/${a.artistId}`} style={{ background: "#FDFBF7", padding: "16px 20px", textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F5F0E8"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#FDFBF7"; }}>
                  {a.profileImage ? <img src={a.profileImage} alt={a.name} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#E8E3DB", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S, fontSize: 14, color: "#8A8580", flexShrink: 0 }}>{a.name[0]}</div>}
                  <div>
                    <div style={{ fontFamily: F, fontSize: 12, fontWeight: 500, color: "#1A1A1A" }}>{a.name}</div>
                    <div style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>{a.country}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
