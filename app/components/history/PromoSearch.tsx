"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { pushRobEvent, pushRobEventOnce } from "@/lib/publicGrowth/analytics";
import { trackHistory, trackMissingSearch } from "@/lib/history/analytics";
import type { HistoryLocale } from "@/lib/history/locale";
import type { HistorySearchResult } from "@/lib/history/types";

export default function PromoSearch({ locale }: { locale: HistoryLocale }) {
  const ko = locale === "ko";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HistorySearchResult[] | null>(null);

  useEffect(() => {
    pushRobEventOnce("PROMO_PAGE_OPENED", locale, { language: locale, route: "/about/why-rob" });
  }, [locale]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    pushRobEvent("SEARCH_STARTED", { route: "/about/why-rob", language: locale });
    trackHistory("SEARCH_PERFORMED");
    const response = await fetch(`/api/history/search?q=${encodeURIComponent(q)}`);
    const data = await response.json().catch(() => null);
    const rows = response.ok && Array.isArray(data?.results) ? data.results : [];
    setResults(rows);
    if (rows.length === 0) {
      trackMissingSearch(q);
      pushRobEvent("SEARCH_NO_RESULT", { route: "/about/why-rob", language: locale });
    }
  }

  return (
    <>
      <form className="rh-search" onSubmit={onSubmit} role="search">
        <label className="rh-kicker" htmlFor="promo-artist-search" style={{ position: "absolute", left: -9999 }}>
          {ko ? "작가 검색" : "Search an artist"}
        </label>
        <input id="promo-artist-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ko ? "작가 이름을 입력하세요" : "Search an artist..."} autoComplete="off" />
        <button className="rh-button" type="submit">{ko ? "검색" : "Search"}</button>
      </form>
      {results && results.length === 0 ? <p>{ko ? "아직 ROB에 충분한 기록이 없습니다." : "ROB does not yet have a documented artist for that name."}</p> : null}
      {results && results.length > 0 ? (
        <ul className="rh-results">
          {results.map((artist) => (
            <li key={artist.slug}>
              <Link href={`/artists/${artist.slug}`} onClick={() => { trackHistory("SEARCH_RESULT_OPENED", `/artists/${artist.slug}`); pushRobEvent("SEARCH_RESULT_OPENED", { artist: artist.slug, route: "/about/why-rob" }); }}>
                <strong>{artist.canonicalName}</strong>
                {artist.nativeName ? <span> {artist.nativeName}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export function PromoCtas({ locale }: { locale: HistoryLocale }) {
  const ko = locale === "ko";
  return (
    <div className="rh-cta">
      <Link className="rh-button" href="/" onClick={() => pushRobEvent("CTA_START_HISTORY_CLICKED", { route: "/about/why-rob" })}>
        {ko ? "작가 검색하기" : "Search an artist"}
      </Link>
      <Link className="rh-button" href="/history/explore" onClick={() => pushRobEvent("CTA_EXPLORE_CLICKED", { route: "/about/why-rob" })}>
        {ko ? "예술 세계 둘러보기" : "Explore the art world"}
      </Link>
    </div>
  );
}
