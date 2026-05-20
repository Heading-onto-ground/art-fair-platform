"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  bio?: string | null;
  startedYear?: number | null;
  profileImage?: string | null;
  trustScore?: number;
  trustLevel?: "basic" | "verified" | "trusted";
  seriesCount?: number;
  artEventCount?: number;
};
type Space = { id: string; name: string; type?: string | null; city?: string | null; country?: string | null };
type Curator = { id: string; name: string; organization?: string | null };
type Exhibition = {
  id: string;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  city?: string | null;
  country?: string | null;
  space?: Space | null;
  curator?: Curator | null;
  artists: { artist: Artist }[];
};
type Gallery = {
  userId: string;
  name: string;
  country?: string;
  city?: string;
  bio?: string;
  website?: string;
  openCallCount?: number;
  recentActivityAt?: number | null;
  recentOpenCallThemes?: string[];
};

const inp: React.CSSProperties = {
  padding: "9px 12px",
  border: "1px solid #E8E3DB",
  background: "#FDFBF7",
  color: "#1A1A1A",
  fontFamily: F,
  fontSize: 12,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
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

  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [q, setQ] = useState("");

  const [artistQuery, setArtistQuery] = useState("");
  const [artistGenre, setArtistGenre] = useState("ALL");
  const [artistCountry, setArtistCountry] = useState("ALL");
  const [artistMinYears, setArtistMinYears] = useState("0");
  const [artistMedium, setArtistMedium] = useState("");

  const [galleryQuery, setGalleryQuery] = useState("");
  const [galleryCountry, setGalleryCountry] = useState("ALL");
  const [galleryCity, setGalleryCity] = useState("ALL");

  const [activeTab, setActiveTab] = useState<"exhibitions" | "artists" | "galleries">("artists");
  const [artistMap, setArtistMap] = useState<Map<string, { artist: Artist; exhibitions: Exhibition[] }>>(new Map());
  const [allArtists, setAllArtists] = useState<Artist[]>([]);
  const [allGalleries, setAllGalleries] = useState<Gallery[]>([]);

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

  useEffect(() => {
    fetch("/api/artists?limit=500")
      .then((r) => r.json())
      .then((d) => {
        if (d?.artists) setAllArtists(d.artists);
      })
      .catch(() => {});
    fetch("/api/public/galleries")
      .then((r) => r.json())
      .then((d) => {
        if (d?.galleries) setAllGalleries(d.galleries);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, []); // eslint-disable-line

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  const artistList = Array.from(artistMap.values()).sort((a, b) => b.exhibitions.length - a.exhibitions.length);
  const artistsSource = allArtists.length > 0 ? allArtists : artistList.map((e) => e.artist);
  const artistGenres = ["ALL", ...Array.from(new Set(artistsSource.map((a) => (a.genre ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))];
  const artistCountries = ["ALL", ...Array.from(new Set(artistsSource.map((a) => (a.country ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))];

  const enrichedArtists = artistsSource
    .filter((a) => {
      const query = artistQuery.trim().toLowerCase();
      const genre = (a.genre ?? "").trim();
      const countryVal = (a.country ?? "").trim();
      const bio = String(a.bio || "").toLowerCase();
      const nowYear = new Date().getFullYear();
      const years = a.startedYear ? Math.max(0, nowYear - Number(a.startedYear) + 1) : 0;
      const minYears = Number(artistMinYears || "0");

      if (artistGenre !== "ALL" && genre !== artistGenre) return false;
      if (artistCountry !== "ALL" && countryVal !== artistCountry) return false;
      if (minYears > 0 && years < minYears) return false;
      if (artistMedium.trim()) {
        const medium = artistMedium.trim().toLowerCase();
        if (!String(genre).toLowerCase().includes(medium) && !bio.includes(medium)) return false;
      }
      if (!query) return true;
      return (
        a.name.toLowerCase().includes(query) ||
        String(genre).toLowerCase().includes(query) ||
        String(countryVal).toLowerCase().includes(query) ||
        String(a.city || "").toLowerCase().includes(query)
      );
    })
    .map((a) => ({ artist: a, exhibitions: artistMap.get(a.artistId)?.exhibitions ?? [] }))
    .sort((a, b) => b.exhibitions.length - a.exhibitions.length);

  const galleryCountries = ["ALL", ...Array.from(new Set(allGalleries.map((g) => (g.country ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))];
  const galleryCities = ["ALL", ...Array.from(new Set(allGalleries.map((g) => (g.city ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))];
  const filteredGalleries = allGalleries
    .filter((g) => {
      if (galleryCountry !== "ALL" && (g.country ?? "").trim() !== galleryCountry) return false;
      if (galleryCity !== "ALL" && (g.city ?? "").trim() !== galleryCity) return false;
      const query = galleryQuery.trim().toLowerCase();
      if (!query) return true;
      return (
        (g.name ?? "").toLowerCase().includes(query) ||
        (g.country ?? "").toLowerCase().includes(query) ||
        (g.city ?? "").toLowerCase().includes(query) ||
        (g.bio ?? "").toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const cDiff = Number(b.openCallCount ?? 0) - Number(a.openCallCount ?? 0);
      if (cDiff !== 0) return cDiff;
      return Number(b.recentActivityAt ?? 0) - Number(a.recentActivityAt ?? 0);
    });

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: "#8B7355", marginBottom: 10 }}>
            Art Graph
          </div>
          <h1 style={{ fontFamily: S, fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 300, color: "#1A1A1A", margin: 0 }}>
            {lang === "ko" ? "발견" : lang === "ja" ? "発見" : "Discover"}
          </h1>
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginTop: 10, lineHeight: 1.7 }}>
            {lang === "ko"
              ? "아티스트는 활동을 기록하고, 갤러리·큐레이터는 원하는 필터로 작가를 찾고 제안을 보낼 수 있습니다."
              : "Artists build activity records, while galleries and curators discover artists with practical filters and outreach actions."}
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <GlobalSearch lang={lang} />
        </div>

        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={lang === "ko" ? "전시명 검색" : "Search exhibitions…"} style={{ ...inp, flex: "1 1 220px" }} />
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={lang === "ko" ? "도시" : "City"} style={{ ...inp, flex: "0 1 140px" }} />
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder={lang === "ko" ? "국가 (예: KR)" : "Country (e.g. KR)"} style={{ ...inp, flex: "0 1 140px" }} />
          <button type="submit" style={{ padding: "9px 24px", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
            {lang === "ko" ? "전시 검색" : "Search"}
          </button>
        </form>

        <div style={{ display: "flex", borderBottom: "1px solid #E8E3DB", marginBottom: 20, gap: 0 }}>
          {(["artists", "galleries", "exhibitions"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "10px 20px", fontFamily: F, fontSize: 11, fontWeight: activeTab === tab ? 600 : 400, letterSpacing: "0.08em", textTransform: "uppercase", border: "none", background: "transparent", color: activeTab === tab ? "#1A1A1A" : "#B0AAA2", cursor: "pointer", borderBottom: activeTab === tab ? "2px solid #1A1A1A" : "2px solid transparent", marginBottom: -1 }}>
              {tab === "artists"
                ? (lang === "ko" ? `아티스트 (${enrichedArtists.length})` : `Artists (${enrichedArtists.length})`)
                : tab === "galleries"
                  ? (lang === "ko" ? `갤러리 (${filteredGalleries.length})` : `Galleries (${filteredGalleries.length})`)
                  : (lang === "ko" ? `전시 (${total})` : `Exhibitions (${total})`)}
            </button>
          ))}
        </div>

        {activeTab === "artists" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 0.8fr 1fr", gap: 8, marginBottom: 20 }}>
            <input value={artistQuery} onChange={(e) => setArtistQuery(e.target.value)} placeholder={lang === "ko" ? "작가명/장르 검색" : "Artist or genre"} style={inp} />
            <select value={artistGenre} onChange={(e) => setArtistGenre(e.target.value)} style={inp}>{artistGenres.map((g) => <option key={g} value={g}>{g === "ALL" ? (lang === "ko" ? "장르 전체" : "All genres") : g}</option>)}</select>
            <select value={artistCountry} onChange={(e) => setArtistCountry(e.target.value)} style={inp}>{artistCountries.map((c) => <option key={c} value={c}>{c === "ALL" ? (lang === "ko" ? "국가 전체" : "All countries") : c}</option>)}</select>
            <select value={artistMinYears} onChange={(e) => setArtistMinYears(e.target.value)} style={inp}>
              <option value="0">{lang === "ko" ? "연차 전체" : "Any years"}</option>
              <option value="3">{lang === "ko" ? "3년+" : "3+ years"}</option>
              <option value="5">{lang === "ko" ? "5년+" : "5+ years"}</option>
              <option value="10">{lang === "ko" ? "10년+" : "10+ years"}</option>
            </select>
            <input value={artistMedium} onChange={(e) => setArtistMedium(e.target.value)} placeholder={lang === "ko" ? "미디엄 키워드" : "Medium keyword"} style={inp} />
          </div>
        )}

        {activeTab === "galleries" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
            <input value={galleryQuery} onChange={(e) => setGalleryQuery(e.target.value)} placeholder={lang === "ko" ? "갤러리명/도시 검색" : "Gallery or city"} style={inp} />
            <select value={galleryCountry} onChange={(e) => setGalleryCountry(e.target.value)} style={inp}>{galleryCountries.map((c) => <option key={c} value={c}>{c === "ALL" ? (lang === "ko" ? "국가 전체" : "All countries") : c}</option>)}</select>
            <select value={galleryCity} onChange={(e) => setGalleryCity(e.target.value)} style={inp}>{galleryCities.map((c) => <option key={c} value={c}>{c === "ALL" ? (lang === "ko" ? "도시 전체" : "All cities") : c}</option>)}</select>
          </div>
        )}

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
                {exhibitions.map((ex) => (
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

        {!loading && activeTab === "galleries" && (
          <>
            {filteredGalleries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>
                {lang === "ko" ? "필터 조건에 맞는 갤러리가 없습니다." : "No galleries found for these filters."}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 1, background: "#E8E3DB" }}>
                {filteredGalleries.map((g) => (
                  <GalleryCard key={g.userId} gallery={g} lang={lang} onClick={() => router.push(`/galleries/${encodeURIComponent(g.userId)}`)} />
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
    <div onClick={onClick} style={{ background: "#FDFBF7", padding: 24, cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F5F0E8"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#FDFBF7"; }}>
      <div style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8B7355", marginBottom: 8 }}>
        {[ex.city, ex.country].filter(Boolean).join(", ")} {fmt(ex.startDate) && `· ${fmt(ex.startDate)}`}
      </div>
      <div style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: "#1A1A1A", marginBottom: 10, lineHeight: 1.3 }}>{ex.title}</div>
      {ex.space && <div style={{ fontFamily: F, fontSize: 10, color: "#8A8580", marginBottom: 6 }}>@ {ex.space.name}{ex.space.type ? ` · ${ex.space.type}` : ""}</div>}
      {ex.curator && <div style={{ fontFamily: F, fontSize: 10, color: "#8A8580", marginBottom: 8 }}>{lang === "ko" ? "큐레이터" : "Curated by"}: {ex.curator.name}</div>}
      {ex.artists.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          {ex.artists.slice(0, 4).map((ea) => (
            <span key={ea.artist.artistId} style={{ fontFamily: F, fontSize: 10, color: "#4A4A4A", background: "#F0EBE3", padding: "2px 8px" }}>
              {ea.artist.name}
            </span>
          ))}
          {ex.artists.length > 4 && <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2", padding: "2px 4px" }}>+{ex.artists.length - 4}</span>}
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
  const years = artist.startedYear ? Math.max(0, new Date().getFullYear() - Number(artist.startedYear) + 1) : 0;
  return (
    <div onClick={onClick} style={{ background: "#FDFBF7", padding: 24, cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F5F0E8"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#FDFBF7"; }}>
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
      <div style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2", marginBottom: 6 }}>
        Trust score: {Math.max(0, Math.min(100, Number(artist.trustScore ?? 0)))}
      </div>
      <div style={{ fontFamily: F, fontSize: 10, color: "#8A8580", marginBottom: 6 }}>
        {lang === "ko" ? `작업 연차 ${years || "-"}년 · 기록 ${Number(artist.artEventCount ?? 0)}건` : `${years || "-"} years · ${Number(artist.artEventCount ?? 0)} records`}
      </div>
      <div style={{ fontFamily: F, fontSize: 10, color: "#8B7355", letterSpacing: "0.08em" }}>
        {exhibitions.length} {lang === "ko" ? "연결 전시" : exhibitions.length === 1 ? "linked exhibition" : "linked exhibitions"}
      </div>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}>
        {exhibitions.slice(0, 2).map((ex) => (
          <div key={ex.id} style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>
            · {ex.title}{ex.city ? ` (${ex.city})` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function GalleryCard({ gallery, lang, onClick }: { gallery: Gallery; lang: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ background: "#FDFBF7", padding: 24, cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F5F0E8"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#FDFBF7"; }}>
      <div style={{ fontFamily: S, fontSize: 20, color: "#1A1A1A", marginBottom: 6 }}>{gallery.name}</div>
      <div style={{ fontFamily: F, fontSize: 10, color: "#8A8580", letterSpacing: "0.05em", marginBottom: 10 }}>
        {[gallery.country, gallery.city].filter(Boolean).join(" · ")}
      </div>
      <div style={{ fontFamily: F, fontSize: 10, color: "#8B7355", letterSpacing: "0.08em" }}>
        {lang === "ko" ? `활동 오픈콜 ${Number(gallery.openCallCount ?? 0)}건` : `${Number(gallery.openCallCount ?? 0)} open calls`}
      </div>
      {gallery.recentActivityAt ? (
        <div style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2", marginTop: 6 }}>
          {lang === "ko" ? "최근 활동" : "Last activity"}: {new Date(Number(gallery.recentActivityAt)).toLocaleDateString()}
        </div>
      ) : null}
      {Array.isArray(gallery.recentOpenCallThemes) && gallery.recentOpenCallThemes.length > 0 ? (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}>
          {gallery.recentOpenCallThemes.slice(0, 2).map((theme, idx) => (
            <div key={`${gallery.userId}-${idx}`} style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>
              · {theme}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
