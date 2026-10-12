"use client";

import { Fragment, FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { trackHistory } from "@/lib/history/analytics";
import type { HistorySearchResult } from "@/lib/history/types";
import "./history.css";
import "./home.css";

type Discovery = {
  journey: { slug: string; canonicalName: string; nativeName: string | null; exhibitionCount: number } | null;
  moment: { slug: string | null; title: string; year: number | null; place: string; artists: { slug: string; name: string }[] } | null;
  route: { id: string; artists: { slug: string; name: string }[]; exhibitions: { slug: string | null; title: string; year: number | null }[] } | null;
};

export default function HistoryHome({ discovery = null }: { discovery?: Discovery | null }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HistorySearchResult[] | null>(null);
  const [suggestions, setSuggestions] = useState<HistorySearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [unavailable, setUnavailable] = useState(false);
  const started = useRef(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (!started.current) {
      started.current = true;
      trackHistory("SEARCH_STARTED");
    }
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/history/search?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      const next = Array.isArray(data.results) ? data.results as HistorySearchResult[] : [];
      setSuggestions(next);
      setOpen(true);
      setActive(-1);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  function choose(artist: HistorySearchResult) {
    trackHistory("SEARCH_RESULT_OPENED", `/artists/${artist.slug}`);
    window.location.assign(`/artists/${artist.slug}`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % suggestions.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    }
    if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(suggestions[active]);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    trackHistory("SEARCH_PERFORMED");
    const response = await fetch(`/api/history/search?q=${encodeURIComponent(q)}`);
    const data = await response.json();
    if (!response.ok || data.unavailable) {
      setUnavailable(true);
      setResults([]);
      return;
    }
    setUnavailable(false);
    setResults(Array.isArray(data.results) ? data.results : []);
  }

  return (
    <div className="rh-page">
      <TopBar />
      <main className="rh-wrap rh-home" id="main-content">
        <section className="rh-home-hero">
          <div className="rh-home-copy">
            <p className="rh-kicker">
              ROB <span className="rh-guide" aria-hidden="true" /> Art history search & exploration
            </p>
            <h1 className="rh-title">Search an artist.</h1>
            <p className="rh-lead">See their journey. Follow the moments that connect one artist to another.</p>
            <form className="rh-search" onSubmit={onSubmit} role="search">
              <div className="rh-search-wrap" ref={box}>
                <label className="rh-sr-only" htmlFor="artist-search">
                  Search an artist
                </label>
                <input
                  id="artist-search"
                  value={query}
                  role="combobox"
                  aria-expanded={open}
                  aria-controls="artist-suggestions"
                  aria-activedescendant={active >= 0 ? `artist-suggestion-${active}` : undefined}
                  aria-autocomplete="list"
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Search an artist..."
                  autoComplete="off"
                />
                {open && suggestions.length > 0 ? (
                  <ul className="rh-suggest" id="artist-suggestions" role="listbox">
                    {suggestions.map((artist, index) => (
                      <li key={artist.slug} role="presentation">
                        <button
                          id={`artist-suggestion-${index}`}
                          type="button"
                          role="option"
                          aria-selected={index === active}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => choose(artist)}
                        >
                          <strong>{artist.canonicalName}</strong>
                          {artist.nativeName ? <span> {artist.nativeName}</span> : null}
                          <span> · {artist.exhibitionCount} exhibitions currently documented</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <button className="rh-button" type="submit">
                Search
              </button>
            </form>
            <div className="rh-home-actions">
              <Link className="rh-home-start" href="/artists/lee-ufan" onClick={() => trackHistory("SEARCH_RESULT_OPENED", "/artists/lee-ufan")}>
                Start with Lee Ufan →
              </Link>
              <span>or</span>
              <Link href="/history/start" onClick={() => trackHistory("START_HISTORY_CLICKED")}>
                Start your own history
              </Link>
            </div>
            {query.trim() === "" && discovery?.journey ? (
              <p className="rh-muted">
                Start here · <Link href={`/artists/${discovery.journey.slug}`}>{discovery.journey.canonicalName}</Link>
                {discovery.journey.nativeName ? ` ${discovery.journey.nativeName}` : ""}
                {` · ${discovery.journey.exhibitionCount} exhibitions currently documented`}
              </p>
            ) : null}
            {query.trim() === "" ? (
              discovery?.route ? (
                <p className="rh-home-path">
                  {discovery.route.artists.map((artist, index) => {
                    const bridge = index > 0 ? discovery.route?.exhibitions[index - 1] : null;
                    return (
                      <span key={artist.slug}>
                        {bridge ? ` → ${bridge.year ?? ""} ${bridge.title} → ` : ""}
                        <Link href={`/artists/${artist.slug}`}>{artist.name}</Link>
                      </span>
                    );
                  })}
                </p>
              ) : (
                <p className="rh-home-path">
                  <span>Lee Ufan</span>
                  <span aria-hidden="true">→</span>
                  <span>The Making of Modern Korean Art</span>
                  <span aria-hidden="true">→</span>
                  <span>Park Seo-Bo</span>
                </p>
              )
            ) : null}
            {query.trim() === "" && discovery?.moment ? (
              <p className="rh-muted">
                {discovery.moment.year ? `${discovery.moment.year} · ` : ""}
                {discovery.moment.slug ? <Link href={`/exhibitions/${discovery.moment.slug}`}>{discovery.moment.title}</Link> : discovery.moment.title}
                {discovery.moment.place ? ` · ${discovery.moment.place}` : ""}
              </p>
            ) : null}
          </div>

          <div className="rh-home-map" aria-label="ROB connects artists through documented exhibition moments">
            {(discovery?.route?.artists.length ? discovery.route.artists : [{ slug: "lee-ufan", name: "Lee Ufan" }, { slug: "park-seo-bo", name: "Park Seo-Bo" }]).map((artist, index) => {
              const bridge = discovery?.route?.exhibitions[index - 1];
              const fallbackBridge = index === 1 && !discovery?.route ? { year: 2025, title: "The Making of Modern Korean Art" } : null;
              const shown = bridge ?? fallbackBridge;
              return (
                <Fragment key={artist.slug}>
                  {index > 0 && shown ? (
                    <>
                      <div className="rh-home-map-line" aria-hidden="true" />
                      <div className="rh-home-event">
                        <span>{shown.year ?? "Exhibition"}</span>
                        <strong>{shown.title}</strong>
                      </div>
                      <div className="rh-home-map-line" aria-hidden="true" />
                    </>
                  ) : null}
                  <div className={index === 0 ? "rh-home-person rh-home-person-a" : "rh-home-person rh-home-person-b"}>
                    <span>Artist</span>
                    <strong>{artist.name}</strong>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </section>

        {unavailable ? <p className="rh-search-state">History search is not available yet.</p> : null}
        {results && results.length === 0 && !unavailable ? (
          <div className="rh-search-state">
            <p>No documented artist matches that name yet.</p>
            <p>
              <Link href="/history/start">Start your history</Link>
              {" · "}
              <Link href="/history/explore">Explore the art world</Link>
            </p>
          </div>
        ) : null}
        {results && results.length > 0 ? (
          <section className="rh-search-results" aria-live="polite">
            <div className="rh-search-results-heading">
              <p className="rh-kicker">Search results</p>
              <span>{results.length}</span>
            </div>
            <ul className="rh-results">
              {results.map((artist) => (
                <li key={artist.slug}>
                  <Link
                    className="rh-result-link"
                    href={`/artists/${artist.slug}`}
                    onClick={() => trackHistory("SEARCH_RESULT_OPENED", `/artists/${artist.slug}`)}
                  >
                    <span className="rh-result-name">
                      <strong>{artist.canonicalName}</strong>
                      {artist.nativeName ? <span>{artist.nativeName}</span> : null}
                    </span>
                    <span className="rh-result-meta">
                      {artist.birthYear ? <span>Born {artist.birthYear}</span> : null}
                      <span>{artist.exhibitionCount} exhibitions currently documented</span>
                    </span>
                    <span className="rh-signature" aria-label="History signature">
                      {artist.signature.map((height, index) => (
                        <i key={index} style={{ height: `${4 + height * 5}px` }} />
                      ))}
                    </span>
                    <span className="rh-result-arrow" aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rh-home-principles" aria-label="How ROB works">
          <article>
            <span>01</span>
            <h2>See time</h2>
            <p>Read an artist through documented exhibitions instead of a flat CV.</p>
          </article>
          <article>
            <span>02</span>
            <h2>Open a moment</h2>
            <p>Select a year or exhibition to reveal its recorded place, source, and participants.</p>
          </article>
          <article>
            <span>03</span>
            <h2>Cross the bridge</h2>
            <p>Enter another artist&apos;s history through an exhibition they actually shared.</p>
          </article>
        </section>

        <section className="rh-below">
          <Link className="rh-home-panel" href="/history/explore">
            <span className="rh-kicker">Explore</span>
            <strong>Browse the graph as it grows.</strong>
            <p>Artists, exhibitions, and spaces with documented records.</p>
          </Link>
          <Link className="rh-home-panel" href="/now">
            <span className="rh-kicker">Now</span>
            <strong>See what is happening now.</strong>
            <p>The present stays visible while today&apos;s events become tomorrow&apos;s history.</p>
          </Link>
        </section>
      </main>
    </div>
  );
}
