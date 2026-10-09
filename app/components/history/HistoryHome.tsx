"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { trackHistory } from "@/lib/history/analytics";
import type { HistorySearchResult } from "@/lib/history/types";
import "./history.css";

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
      <main className="rh-wrap" id="main-content">
        <p className="rh-kicker">
          ROB <span className="rh-guide" aria-hidden="true" />
        </p>
        <h1 className="rh-title">Search an artist.</h1>
        <p className="rh-lead">See their journey.</p>
        <form className="rh-search" onSubmit={onSubmit} role="search">
          <label className="rh-kicker" htmlFor="artist-search" style={{ position: "absolute", left: -9999 }}>
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
        <p>
          Are you an artist?{" "}
          <Link
            href="/history/start"
            onClick={() => trackHistory("START_HISTORY_CLICKED")}
          >
            Start your history
          </Link>
        </p>
        {unavailable ? <p>History search is not available yet.</p> : null}
        {results && results.length === 0 && !unavailable ? <p>No documented artist matches that name.</p> : null}
        {results && results.length > 0 ? (
          <ul className="rh-results">
            {results.map((artist) => (
              <li key={artist.slug}>
                <Link
                  href={`/artists/${artist.slug}`}
                  onClick={() => trackHistory("SEARCH_RESULT_OPENED", `/artists/${artist.slug}`)}
                >
                  <strong>{artist.canonicalName}</strong>
                  {artist.nativeName ? <span> {artist.nativeName}</span> : null}
                  <div>
                    {artist.birthYear ? <span>Born {artist.birthYear}. </span> : null}
                    <span>{artist.exhibitionCount} documented exhibitions</span>
                  </div>
                  <span className="rh-signature" aria-hidden="true">
                    {artist.signature.map((height, index) => (
                      <i key={index} style={{ height: `${4 + height * 5}px` }} />
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <section className="rh-below">
          <Link href="/history/explore">
            <span className="rh-kicker">Explore</span>
            <p>Artists, exhibitions, and spaces with documented records.</p>
          </Link>
          <Link href="/now">
            <span className="rh-kicker">Now</span>
            <p>What is happening now stays on its own page.</p>
          </Link>
        </section>
      </main>
    </div>
  );
}
