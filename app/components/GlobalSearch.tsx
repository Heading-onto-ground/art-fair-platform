"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { F, S, colors } from "@/lib/design";

type ArtistResult = { artistId: string; name: string; genre: string; country: string | null; city: string | null; bio: string | null; profileImage: string | null };
type GalleryResult = { galleryId: string; name: string; country: string | null; city: string | null; bio: string | null; profileImage: string | null };
type OpenCallResult = { id: string; gallery: string; city: string; country: string; theme: string; deadline: string; isExternal: boolean };

type SearchResults = {
  artists: ArtistResult[];
  galleries: GalleryResult[];
  openCalls: OpenCallResult[];
  query: string;
};

type Props = {
  lang?: string;
  placeholder?: string;
};

export default function GlobalSearch({ lang = "en", placeholder }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lbl = (ko: string, en: string) => (lang === "ko" ? ko : en);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`);
        const data: SearchResults = await res.json();
        setResults(data);
        setOpen(true);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasResults = results && (results.artists.length > 0 || results.galleries.length > 0 || results.openCalls.length > 0);
  const isEmpty = results && !hasResults;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* 검색 입력 */}
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (hasResults) setOpen(true); }}
          placeholder={placeholder ?? lbl("아티스트, 갤러리, 오픈콜 검색…", "Search artists, galleries, open calls…")}
          style={{
            width: "100%",
            padding: "12px 40px 12px 14px",
            border: `1px solid ${open ? colors.accent : colors.border}`,
            background: colors.bgCard,
            fontFamily: F,
            fontSize: 13,
            color: colors.textPrimary,
            outline: "none",
            transition: "border-color 0.2s",
            boxSizing: "border-box",
          }}
        />
        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          {loading ? (
            <span style={{ fontFamily: F, fontSize: 10, color: colors.textLight }}>…</span>
          ) : (
            <span style={{ color: colors.textLight, fontSize: 14 }}>⌕</span>
          )}
        </div>
      </div>

      {/* 드롭다운 결과 */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderTop: "none",
            zIndex: 1000,
            maxHeight: 480,
            overflowY: "auto",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          {isEmpty && (
            <div style={{ padding: "20px 16px", fontFamily: F, fontSize: 13, color: colors.textMuted, textAlign: "center" }}>
              {lbl(`"${query}"에 대한 결과 없음`, `No results for "${query}"`)}
            </div>
          )}

          {results && results.artists.length > 0 && (
            <Section label={lbl("아티스트", "Artists")}>
              {results.artists.map((a) => (
                <ResultRow
                  key={a.artistId}
                  title={a.name}
                  sub={[a.genre, a.city, a.country].filter(Boolean).join(" · ")}
                  image={a.profileImage}
                  onClick={() => { setOpen(false); router.push(`/artists/${a.artistId}`); }}
                />
              ))}
            </Section>
          )}

          {results && results.galleries.length > 0 && (
            <Section label={lbl("갤러리", "Galleries")}>
              {results.galleries.map((g) => (
                <ResultRow
                  key={g.galleryId}
                  title={g.name}
                  sub={[g.city, g.country].filter(Boolean).join(", ")}
                  image={g.profileImage}
                  onClick={() => { setOpen(false); }}
                />
              ))}
            </Section>
          )}

          {results && results.openCalls.length > 0 && (
            <Section label={lbl("오픈콜", "Open Calls")}>
              {results.openCalls.map((oc) => (
                <ResultRow
                  key={oc.id}
                  title={oc.theme}
                  sub={`${oc.gallery} · ${oc.city} · ${lbl("마감", "Deadline")} ${oc.deadline}`}
                  onClick={() => { setOpen(false); router.push(`/open-calls`); }}
                />
              ))}
            </Section>
          )}

          {/* 전체 결과 보기 */}
          {hasResults && (
            <div
              onClick={() => { setOpen(false); router.push(`/discover?q=${encodeURIComponent(query)}`); }}
              style={{
                padding: "12px 16px",
                borderTop: `1px solid ${colors.borderLight}`,
                fontFamily: F,
                fontSize: 11,
                color: colors.accent,
                cursor: "pointer",
                textAlign: "center",
                letterSpacing: "0.06em",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = colors.bgSecondary; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {lbl(`"${query}" 전체 결과 보기 →`, `See all results for "${query}" →`)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ padding: "10px 16px 6px", fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.textLight, background: colors.bgPrimary, borderBottom: `1px solid ${colors.borderLight}` }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function ResultRow({ title, sub, image, onClick }: { title: string; sub: string; image?: string | null; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = colors.bgSecondary; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {/* 아바타 */}
      <div style={{ width: 32, height: 32, background: colors.bgSecondary, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {image ? (
          <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontFamily: S, fontSize: 14, color: colors.textLight }}>{title[0]}</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: F, fontSize: 13, color: colors.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <div style={{ fontFamily: F, fontSize: 11, color: colors.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
      </div>
    </div>
  );
}
