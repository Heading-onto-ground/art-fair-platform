"use client";

import { Fragment, FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import LocaleSwitch from "@/app/components/history/LocaleSwitch";
import { trackHistory, trackMissingSearch } from "@/lib/history/analytics";
import { historyCopy, type HistoryLocale } from "@/lib/history/locale";
import {
  SEARCH_CLIENT_TIMEOUT_MS,
  acceptAutocomplete,
  claimSubmit,
  finishSearch,
  reuseCompletedSearch,
  type SearchPhase,
} from "@/lib/history/searchFlow";
import type { HistorySearchResult } from "@/lib/history/types";
import "./history.css";
import "./home.css";

function operatorSearch(): boolean {
  return new URLSearchParams(window.location.search).get("operator") === "1";
}

async function fetchSearch(q: string, signal: AbortSignal): Promise<{ ok: true; results: HistorySearchResult[] } | { ok: false }> {
  const response = await fetch(`/api/history/search?q=${encodeURIComponent(q)}`, { signal, cache: "no-store" });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.unavailable || data.error) return { ok: false };
  return { ok: true, results: Array.isArray(data.results) ? data.results as HistorySearchResult[] : [] };
}

type Discovery = {
  journey: { slug: string; canonicalName: string; nativeName: string | null; exhibitionCount: number } | null;
  moment: { slug: string | null; title: string; year: number | null; place: string; artists: { slug: string; name: string }[] } | null;
  route: { id: string; artists: { slug: string; name: string }[]; exhibitions: { slug: string | null; title: string; year: number | null }[] } | null;
};

export default function HistoryHome({ discovery = null, locale = "en" }: { discovery?: Discovery | null; locale?: HistoryLocale }) {
  const copy = historyCopy(locale);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HistorySearchResult[] | null>(null);
  const [suggestions, setSuggestions] = useState<HistorySearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [phase, setPhase] = useState<SearchPhase>("idle");
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const started = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  const completed = useRef<{ query: string; results: HistorySearchResult[] } | null>(null);
  const submitSeq = useRef(0);
  const submitAbort = useRef<AbortController | null>(null);
  const inflightQuery = useRef<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    const controller = new AbortController();
    if (!q) {
      setSuggestions([]);
      setOpen(false);
      completed.current = null;
      return () => controller.abort();
    }
    if (!started.current) {
      started.current = true;
      trackHistory("SEARCH_STARTED");
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const found = await fetchSearch(q, controller.signal);
          if (!acceptAutocomplete(q, query, controller.signal.aborted)) return;
          if (!found.ok) {
            setSuggestions([]);
            setOpen(false);
            return;
          }
          completed.current = { query: q, results: found.results };
          setSuggestions(found.results);
          setOpen(found.results.length > 0);
          setActive(-1);
        } catch {
          if (controller.signal.aborted) return;
          setSuggestions([]);
          setOpen(false);
        }
      })();
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
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

  function showResults(q: string, found: HistorySearchResult[]) {
    setResults(found);
    const next = finishSearch({ ok: true, results: found });
    setPhase(next);
    if (next === "empty") trackMissingSearch(q, operatorSearch());
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const claimed = claimSubmit(inflightQuery.current, query);
    if (!claimed.proceed) return;
    const q = claimed.query;
    inflightQuery.current = q;
    const seq = submitSeq.current + 1;
    submitSeq.current = seq;
    setPendingQuery(q);
    setPhase("searching");
    setResults(null);
    setOpen(false);
    trackHistory("SEARCH_PERFORMED");
    if (completed.current && reuseCompletedSearch(completed.current.query, q)) {
      showResults(q, completed.current.results);
      if (submitSeq.current === seq) {
        inflightQuery.current = null;
        setPendingQuery(null);
      }
      return;
    }
    submitAbort.current?.abort();
    const controller = new AbortController();
    submitAbort.current = controller;
    const timer = window.setTimeout(() => controller.abort(), SEARCH_CLIENT_TIMEOUT_MS);
    try {
      const found = await fetchSearch(q, controller.signal);
      if (submitSeq.current !== seq) return;
      if (!found.ok) {
        setResults(null);
        setPhase("error");
        return;
      }
      completed.current = { query: q, results: found.results };
      showResults(q, found.results);
    } catch {
      if (submitSeq.current !== seq) return;
      setResults(null);
      setPhase("error");
    } finally {
      window.clearTimeout(timer);
      if (submitSeq.current === seq) {
        inflightQuery.current = null;
        setPendingQuery(null);
      }
    }
  }

  return (
    <div className="rh-page">
      <TopBar locale={locale} />
      <main className="rh-wrap rh-home" id="main-content">
        <section className="rh-home-hero">
          <div className="rh-home-copy">
            <LocaleSwitch locale={locale} />
            <p className="rh-kicker">
              ROB <span className="rh-guide" aria-hidden="true" /> {copy.homeKicker}
            </p>
            <h1 className="rh-title">{copy.searchTitle}</h1>
            <p className="rh-lead">{copy.searchLeadFull}</p>
            <form className="rh-search" onSubmit={onSubmit} role="search">
              <div className="rh-search-wrap" ref={box}>
                <label className="rh-sr-only" htmlFor="artist-search">
                  {copy.searchLabel}
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
                  placeholder={copy.searchPlaceholder}
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
                          <span> · {copy.documentedLine(artist.exhibitionCount)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <button className="rh-button" type="submit" disabled={pendingQuery === query.trim() && phase === "searching"} aria-busy={phase === "searching"}>
                {phase === "searching" ? copy.searching : copy.searchButton}
              </button>
            </form>
            <div className="rh-search-feedback" role="status" aria-live="polite">
              {phase === "searching" ? <p>{copy.searching}</p> : null}
              {phase === "empty" ? (
                <>
                  <p>{copy.searchEmpty}</p>
                  <p>
                    <Link href="/history/start">{copy.startHistory}</Link>
                    {" · "}
                    <Link href="/history/explore">{copy.exploreWorld}</Link>
                  </p>
                </>
              ) : null}
              {phase === "error" ? <p>{copy.searchError}</p> : null}
            </div>
            {phase === "success" && results && results.length > 0 ? (
              <section className="rh-search-results" aria-live="polite">
                <div className="rh-search-results-heading">
                  <p className="rh-kicker">{copy.searchResults}</p>
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
                          {artist.birthYear ? <span>{copy.born(artist.birthYear)}</span> : null}
                          <span>{copy.documentedLine(artist.exhibitionCount)}</span>
                        </span>
                        <span className="rh-signature" aria-label={copy.historySignature}>
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
            <div className="rh-home-actions">
              <Link className="rh-home-start" href="/artists/lee-ufan" onClick={() => trackHistory("SEARCH_RESULT_OPENED", "/artists/lee-ufan")}>
                {copy.startWith} →
              </Link>
              <span>{copy.orWord}</span>
              <Link href="/history/start" onClick={() => trackHistory("START_HISTORY_CLICKED")}>
                {copy.startOwn}
              </Link>
            </div>
            {query.trim() === "" && discovery?.journey ? (
              <p className="rh-muted">
                {copy.startHere} · <Link href={`/artists/${discovery.journey.slug}`}>{discovery.journey.canonicalName}</Link>
                {discovery.journey.nativeName ? ` ${discovery.journey.nativeName}` : ""}
                {` · ${copy.documentedLine(discovery.journey.exhibitionCount)}`}
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

          <div className="rh-home-map" aria-label={copy.connectsAria}>
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
                        <span>{shown.year ?? copy.exhibitionWord}</span>
                        <strong>{shown.title}</strong>
                      </div>
                      <div className="rh-home-map-line" aria-hidden="true" />
                    </>
                  ) : null}
                  <div className={index === 0 ? "rh-home-person rh-home-person-a" : "rh-home-person rh-home-person-b"}>
                    <span>{copy.artistWord}</span>
                    <strong>{artist.name}</strong>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </section>

        <section className="rh-home-principles" aria-label={copy.howWorks}>
          <article>
            <span>01</span>
            <h2>{copy.seeTime}</h2>
            <p>{copy.seeTimeBody}</p>
          </article>
          <article>
            <span>02</span>
            <h2>{copy.openMomentTitle}</h2>
            <p>{copy.openMomentBody}</p>
          </article>
          <article>
            <span>03</span>
            <h2>{copy.crossBridge}</h2>
            <p>{copy.crossBridgeBody}</p>
          </article>
        </section>

        <section className="rh-below">
          <Link className="rh-home-panel" href="/history/explore">
            <span className="rh-kicker">{copy.explore}</span>
            <strong>{copy.browseGraph}</strong>
            <p>{copy.browseGraphBody}</p>
          </Link>
          <Link className="rh-home-panel" href="/now">
            <span className="rh-kicker">{copy.now}</span>
            <strong>{copy.seeNow}</strong>
            <p>{copy.seeNowBody}</p>
          </Link>
        </section>
      </main>
    </div>
  );
}
