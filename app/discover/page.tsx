"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import GlobalSearch from "@/app/components/GlobalSearch";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";

type Artist = {
  id: string;
  name: string;
  artistId: string;
  country?: string | null;
  city?: string | null;
  genre?: string | null;
  profileImage?: string | null;
  trustScore?: number;
  trustLevel?: "basic" | "verified" | "trusted";
};
type Space = { id: string; name: string; type?: string | null; city?: string | null; country?: string | null };
type Curator = { id: string; name: string; organization?: string | null };
type Exhibition = {
  id: string; title: string;
  startDate?: string | null; endDate?: string | null;
  city?: string | null; country?: string | null;
  space?: Space | null; curator?: Curator | null;
  artists: { artist: Artist }[];
};

const inp: React.CSSProperties = {
  padding: "9px 12px", border: "1px solid #E8E3DB", background: "#FDFBF7",
  color: "#1A1A1A", fontFamily: F, fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box",
};

function fmt(d?: string | null) {
  if (!d) return null;
  return new Date(d).getFullYear();
}

export default function DiscoverPage() {
  const { lang } = useLanguage();
  const router = useRouter();

  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // filters
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [q, setQ] = useState("");

  const [activeTab, setActiveTab] = useState<"exhibitions" | "artists">("exhibitions");

  // artist discovery from exhibitions
  const [artistMap, setArtistMap] = useState<Map<string, { artist: Artist; exhibitions: Exhibition[] }>>(new Map());

  // all registered artists
  const [allArtists, setAllArtists] = useState<Artist[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    if (country.trim()) params.set("country", country.trim());
    if (q.trim()) params.set("q", q.trim());
    params.set("limit", "60");

    const res = await fetch(`/api/exhibitions?${params}`);
    const data = await res.json().catch(() => null);
    const exs: Exhibition[] = data?.exhibitions ?? [];
    setExhibitions(exs);
    setTotal(data?.total ?? 0);

    // build artist map
    const map = new Map<string, { artist: Artist; exhibitions: Exhibition[] }>();
    for (const ex of exs) {
      for (const ea of ex.artists) {
        const a = ea.artist;
        if (!map.has(a.artistId)) map.set(a.artistId, { artist: a, exhibitions: [] });
        map.get(a.artistId)!.exhibitions.push(ex);
      }
    }
    setArtistMap(map);
    setLoading(false);
  }, [city, country, q]);

  // fetch all registered artists once on mount
  useEffect(() => {
    fetch("/api/artists?limit=300")
      .then((r) => r.json())
      .then((d) => { if (d?.artists) setAllArtists(d.artists); })
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, []); // eslint-disable-line

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  const artistList = Array.from(artistMap.values()).sort((a, b) => b.exhibitions.length - a.exhibitions.length);

  // Merge allArtists with exhibition data; filter by search query client-side
  const enrichedArtists = (allArtists.length > 0 ? allArtists : artistList.map((e) => e.artist))
    .filter((a) => !q.trim() || a.name.toLowerCase().includes(q.toLowerCase()) || (a.genre ?? "").toLowerCase().includes(q.toLowerCase()))
    .map((a) => ({ artist: a, exhibitions: artistMap.get(a.artistId)?.exhibitions ?? [] }))
    .sort((a, b) => b.exhibitions.length - a.exhibitions.length);

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: "#8B7355", marginBottom: 10 }}>
            Art Graph
          </div>
          <h1 style={{ fontFamily: S, fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 300, color: "#1A1A1A", margin: 0 }}>
            {lang === "ko" ? "발견" : lang === "ja" ? "発見" : "Discover"}
          </h1>
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginTop: 10, lineHeight: 1.7 }}>
            {lang === "ko"
              ? "전시 데이터를 통해 작가를 발견하세요. 공간, 큐레이터, 네트워크로 탐색합니다."
              : "Discover artists through exhibition data — explore by space, curator, and network."}
          </p>
        </div>

        {/* Global Search */}
        <div style={{ marginBottom: 20 }}>
          <GlobalSearch lang={lang} />
        </div>

        {/* Exhibition-specific filters */}
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={lang === "ko" ? "전시명 검색" : "Search exhibitions…"} style={{ ...inp, flex: "1 1 200px" }} />
          <input value={city} onChange={e => setCity(e.target.value)} placeholder={lang === "ko" ? "도시" : "City"} style={{ ...inp, flex: "0 1 140px" }} />
          <input value={country} onChange={e => setCountry(e.target.value)} placeholder={lang === "ko" ? "국가 (예: KR)" : "Country (e.g. KR)"} style={{ ...inp, flex: "0 1 140px" }} />
          <button type="submit" style={{ padding: "9px 24px", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
            {lang === "ko" ? "검색" : "Search"}
          </button>
        </form>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #E8E3DB", marginBottom: 28, gap: 0 }}>
          {(["exhibitions", "artists"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "10px 20px", fontFamily: F, fontSize: 11, fontWeight: activeTab === tab ? 600 : 400, letterSpacing: "0.08em", textTransform: "uppercase", border: "none", background: "transparent", color: activeTab === tab ? "#1A1A1A" : "#B0AAA2", cursor: "pointer", borderBottom: activeTab === tab ? "2px solid #1A1A1A" : "2px solid transparent", marginBottom: -1 }}>
              {tab === "exhibitions"
                ? (lang === "ko" ? `전시 (${total})` : `Exhibitions (${total})`)
                : (lang === "ko" ? `작가 (${allArtists.length || artistMap.size})` : `Artists (${allArtists.length || artistMap.size})`)}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 60, fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>
            {lang === "ko" ? "불러오는 중…" : "Loading…"}
          </div>
        )}

        {!loading && activeTab === "exhibitions" && (
          <>
            {exhibitions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>
                  {lang === "ko" ? "전시 데이터가 없습니다." : "No exhibitions found."}
                </p>
                <Link href="/exhibitions/new" style={{ fontFamily: F, fontSize: 10, color: "#8B7355", letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}>
                  + {lang === "ko" ? "첫 전시 등록하기" : "Record the first exhibition →"}
                </Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 1, background: "#E8E3DB" }}>
                {exhibitions.map(ex => (
                  <ExhibitionCard key={ex.id} ex={ex} lang={lang} onClick={() => router.push(`/exhibitions/${ex.id}`)} />
                ))}
              </div>
            )}
          </>
        )}

        {!loading && activeTab === "artists" && (
          <>
            {enrichedArtists.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>
                {lang === "ko" ? "필터 조건에 맞는 작가가 없습니다." : "No artists found for these filters."}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 1, background: "#E8E3DB" }}>
                {enrichedArtists.map(({ artist, exhibitions: exs }) => (
                  <ArtistCard key={artist.artistId} artist={artist} exhibitions={exs} lang={lang} onClick={() => router.push(`/artist/public/${artist.artistId}`)} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

function ExhibitionCard({ ex, lang, onClick }: { ex: Exhibition; lang: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ background: "#FDFBF7", padding: 24, cursor: "pointer", transition: "background 0.2s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F5F0E8"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#FDFBF7"; }}>
      <div style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8B7355", marginBottom: 8 }}>
        {[ex.city, ex.country].filter(Boolean).join(", ")} {fmt(ex.startDate) && `· ${fmt(ex.startDate)}`}
      </div>
      <div style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: "#1A1A1A", marginBottom: 10, lineHeight: 1.3 }}>{ex.title}</div>
      {ex.space && (
        <div style={{ fontFamily: F, fontSize: 10, color: "#8A8580", marginBottom: 6 }}>
          @ {ex.space.name}{ex.space.type ? ` · ${ex.space.type}` : ""}
        </div>
      )}
      {ex.curator && (
        <div style={{ fontFamily: F, fontSize: 10, color: "#8A8580", marginBottom: 8 }}>
          {lang === "ko" ? "큐레이터" : "Curated by"}: {ex.curator.name}
        </div>
      )}
      {ex.artists.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          {ex.artists.slice(0, 4).map(ea => (
            <span key={ea.artist.artistId} style={{ fontFamily: F, fontSize: 10, color: "#4A4A4A", background: "#F0EBE3", padding: "2px 8px" }}>
              {ea.artist.name}
            </span>
          ))}
          {ex.artists.length > 4 && (
            <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2", padding: "2px 4px" }}>+{ex.artists.length - 4}</span>
          )}
        </div>
      )}
    </div>
  );
}

function ArtistCard({ artist, exhibitions, lang, onClick }: { artist: Artist; exhibitions: Exhibition[]; lang: string; onClick: () => void }) {
  const trust =
    artist.trustLevel === "trusted"
      ? { label: "Trusted", color: "#2E6B45", bg: "#EDF7F1", border: "#D6EAD8" }
      : artist.trustLevel === "verified"
        ? { label: "Verified", color: "#7A6030", bg: "#FFF6E8", border: "#EFD9B7" }
        : { label: "Basic", color: "#8A8580", bg: "#F5F3F0", border: "#ECEAE6" };
  return (
    <div onClick={onClick} style={{ background: "#FDFBF7", padding: 24, cursor: "pointer", transition: "background 0.2s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F5F0E8"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#FDFBF7"; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        {artist.profileImage ? (
          <img src={artist.profileImage} alt={artist.name} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#E8E3DB", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S, fontSize: 18, color: "#8A8580" }}>
            {artist.name[0]}
          </div>
        )}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontFamily: S, fontSize: 18, fontWeight: 400, color: "#1A1A1A" }}>{artist.name}</div>
            <span style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.06em", color: trust.color, background: trust.bg, border: `1px solid ${trust.border}`, padding: "2px 7px" }}>
              {trust.label}
            </span>
          </div>
          <div style={{ fontFamily: F, fontSize: 10, color: "#8A8580", letterSpacing: "0.05em" }}>
            {[artist.country, artist.genre].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>
      <div style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2", marginBottom: 8 }}>
        Trust score: {Math.max(0, Math.min(100, Number(artist.trustScore ?? 0)))}
      </div>
      <div style={{ fontFamily: F, fontSize: 10, color: "#8B7355", letterSpacing: "0.08em" }}>
        {exhibitions.length} {lang === "ko" ? "전시" : exhibitions.length === 1 ? "exhibition" : "exhibitions"}
      </div>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}>
        {exhibitions.slice(0, 2).map(ex => (
          <div key={ex.id} style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>
            · {ex.title}{ex.city ? ` (${ex.city})` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
