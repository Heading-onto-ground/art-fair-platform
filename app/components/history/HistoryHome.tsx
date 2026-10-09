"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { trackHistory } from "@/lib/history/analytics";
import type { HistorySearchResult } from "@/lib/history/types";
import "./history.css";
import "./home.css";

export default function HistoryHome() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HistorySearchResult[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
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
              <label className="rh-sr-only" htmlFor="artist-search">
                Search an artist
              </label>
              <input
                id="artist-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search an artist..."
                autoComplete="off"
              />
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
            <p className="rh-home-path">
              <span>Lee Ufan</span>
              <span aria-hidden="true">→</span>
              <span>Exhibition</span>
              <span aria-hidden="true">→</span>
              <span>Park Seo-Bo</span>
            </p>
          </div>

          <div className="rh-home-map" aria-label="ROB connects artists through documented exhibition moments">
            <div className="rh-home-person rh-home-person-a">
              <span>Artist</span>
              <strong>Lee Ufan</strong>
            </div>
            <div className="rh-home-map-line" aria-hidden="true" />
            <div className="rh-home-event">
              <span>Exhibition</span>
              <strong>A documented moment</strong>
            </div>
            <div className="rh-home-map-line" aria-hidden="true" />
            <div className="rh-home-person rh-home-person-b">
              <span>Artist</span>
              <strong>Park Seo-Bo</strong>
            </div>
          </div>
        </section>

        {unavailable ? <p className="rh-search-state">History search is not available yet.</p> : null}
        {results && results.length === 0 && !unavailable ? <p className="rh-search-state">No documented artist matches that name yet.</p> : null}
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
