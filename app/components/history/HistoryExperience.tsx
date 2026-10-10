"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { trackHistory } from "@/lib/history/analytics";
import ReportIssue from "@/app/components/history/ReportIssue";
import {
  JOURNEY_MS,
  HISTORY_PENDING_OVERLAY_MS,
  careerSpan,
  clusterByDecade,
  followArtistHref,
  groupByYear,
  historyCoverageCopy,
  momentPlace,
  momentSatellites,
  parseHistoryReturn,
  returnArtistHref,
  shouldRetryScroll,
  signatureColumns,
  zoomSpan,
  type DotMark,
  type ZoomLevel,
} from "@/lib/history/display";
import type { HistoryImage } from "@/lib/history/images";
import { INITIAL_CONSTELLATION, isFilledMarker } from "@/lib/history/policy";
import type { HistoryArtistView, HistoryExhibitionView } from "@/lib/history/types";
import "./history.css";

function plural(count: number) {
  return `${count} documented shared exhibition${count === 1 ? "" : "s"}`;
}

function eventLocation(exhibition: HistoryExhibitionView) {
  return [exhibition.spaceName, exhibition.city, exhibition.country].filter(Boolean).join(" · ");
}

function returnStorageKey(from: string, via: string) {
  return `rob-history-return:${from}:${via}`;
}

function saveHistoryReturn(from: string, via: string, state: { zoom: string | null; focus: string | null; scroll: number }) {
  try {
    sessionStorage.setItem(returnStorageKey(from, via), JSON.stringify(state));
  } catch {
    // Storage can be unavailable. Zoom and year still travel on the return URL.
  }
}

function readHistoryReturn(from: string, via: string) {
  try {
    return parseHistoryReturn(sessionStorage.getItem(returnStorageKey(from, via)));
  } catch {
    return null;
  }
}

let pendingScroll: { slug: string; value: number } | null = null;

function rememberScroll(slug: string, value: number) {
  pendingScroll = { slug, value };
  try {
    sessionStorage.setItem(`rob-history-scroll:${slug}`, String(value));
  } catch {
    // The return URL still restores the artist, year, and Moment.
  }
}

function scrollTargetFor(slug: string): number | null {
  if (pendingScroll?.slug === slug) return pendingScroll.value;
  try {
    const raw = sessionStorage.getItem(`rob-history-scroll:${slug}`);
    const value = Number(raw);
    return raw && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function clearScrollTarget(slug: string) {
  if (pendingScroll?.slug === slug) pendingScroll = null;
  try {
    sessionStorage.removeItem(`rob-history-scroll:${slug}`);
  } catch {
    // Leaving the stored offset is harmless on the next visit.
  }
}

function sourceCredit(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.endsWith("wikimedia.org") ? "Wikimedia Commons" : new URL(url).hostname;
  } catch {
    return null;
  }
}

const HERO_LOAD_MS = 8000;

function HistoryStill({ image, onFail }: { image: HistoryImage; onFail?: () => void }) {
  const credit = sourceCredit(image.sourceUrl);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!onFail) return;
    const node = imgRef.current;
    // A cached image can finish before React attaches onLoad/onError.
    if (node?.complete) {
      if (node.naturalWidth === 0) onFail();
      return;
    }
    const timer = window.setTimeout(() => {
      const current = imgRef.current;
      if (current?.complete && current.naturalWidth > 0) return;
      onFail();
    }, HERO_LOAD_MS);
    return () => window.clearTimeout(timer);
  }, [image.url, onFail]);
  return (
    <figure className="rh-still">
      <img
        ref={imgRef}
        src={image.url}
        srcSet={image.srcSet || undefined}
        sizes={image.srcSet ? "(max-width: 800px) 62vw, 360px" : undefined}
        width={image.width ?? undefined}
        height={image.height ?? undefined}
        alt={image.alt}
        decoding="async"
        fetchPriority={onFail ? "high" : undefined}
        onError={() => onFail?.()}
      />
      {image.attribution || image.license || credit ? (
        <figcaption>
          {image.attribution ? <span>{image.attribution}</span> : null}
          {image.license && image.licenseUrl ? <a href={image.licenseUrl}>{image.license}</a> : null}
          {credit && image.sourceUrl ? <a href={image.sourceUrl}>{credit}</a> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

export default function HistoryExperience({ artist }: { artist: HistoryArtistView }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"history" | "connections" | "works" | "about">("history");
  const [expanded, setExpanded] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [journeyOn, setJourneyOn] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [failedHeroUrl, setFailedHeroUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hero = artist.heroImage && failedHeroUrl !== artist.heroImage.url ? artist.heroImage : null;
  const dropHero = useCallback(() => {
    if (artist.heroImage) setFailedHeroUrl(artist.heroImage.url);
  }, [artist.heroImage]);

  const from = searchParams.get("from");
  const via = searchParams.get("via");
  const zoomParam = (searchParams.get("zoom") || "all").toUpperCase();
  const zoom: ZoomLevel = zoomParam === "DECADE" || zoomParam === "YEAR" ? zoomParam : "ALL";
  const focusValue = Number(searchParams.get("focus"));
  const focus = Number.isFinite(focusValue) ? focusValue : null;
  const eventKey = searchParams.get("event");

  const groups = useMemo(
    () =>
      groupByYear(
        artist.exhibitions.map((exhibition) => ({
          id: exhibition.id,
          year: exhibition.year,
          mark: (isFilledMarker(exhibition.precision) ? "filled" : "open") as DotMark,
        })),
      ),
    [artist.exhibitions],
  );
  const span = careerSpan(groups);
  const windowSpan = span ? zoomSpan(zoom, focus, span.first, span.last) : null;
  const visibleGroups = windowSpan ? groups.filter((group) => group.year >= windowSpan.start && group.year <= windowSpan.end) : groups;
  const selected = artist.exhibitions.find((exhibition) => exhibition.id === eventKey || exhibition.slug === eventKey) ?? null;
  const viaExhibition = artist.exhibitions.find((exhibition) => exhibition.slug === via || exhibition.id === via);
  const signature = signatureColumns(groups.map((group) => group.count));
  const yearEvents = focus == null ? [] : artist.exhibitions.filter((exhibition) => exhibition.year === focus);
  const coverage = useMemo(
    () =>
      historyCoverageCopy({
        count: artist.exhibitionCount,
        years: artist.exhibitions.flatMap((exhibition) => (exhibition.year == null ? [] : [exhibition.year])),
      }),
    [artist],
  );
  const presentation = coverage.presentation;
  const decadeClusters = useMemo(() => clusterByDecade(groups), [groups]);
  const chronology = useMemo(
    () =>
      [...artist.exhibitions].sort(
        (left, right) => (left.year ?? 9999) - (right.year ?? 9999) || left.title.localeCompare(right.title),
      ),
    [artist.exhibitions],
  );

  useEffect(() => {
    delete document.documentElement.dataset.nav;
    setPendingSlug(null);
  }, [artist.slug]);

  useEffect(() => () => {
    delete document.documentElement.dataset.nav;
  }, []);

  useEffect(() => {
    if (!selected) return;
    const viaKey = selected.slug || selected.id;
    for (const person of selected.artists) {
      if (person.slug && person.slug !== artist.slug) router.prefetch(followArtistHref(person.slug, artist.slug, viaKey));
    }
  }, [selected, artist.slug, router]);

  useEffect(() => {
    if (!from) return;
    const stored = via ? readHistoryReturn(from, via) : null;
    router.prefetch(returnArtistHref({
      from,
      via,
      srcZoom: stored?.zoom ?? searchParams.get("srcZoom"),
      srcFocus: stored?.focus ?? searchParams.get("srcFocus"),
    }));
  }, [from, via, router, searchParams]);

  useEffect(() => {
    trackHistory("ARTIST_OPENED", `/artists/${artist.slug}`);
    if (from) trackHistory("SECOND_ARTIST_REACHED", `/artists/${artist.slug}`);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(media.matches);
    const queryScroll = searchParams.get("scroll");
    const storedScroll = scrollTargetFor(artist.slug);
    if (storedScroll != null) clearScrollTarget(artist.slug);
    const scroll = queryScroll != null && Number.isFinite(Number(queryScroll)) ? Number(queryScroll) : storedScroll;
    const timers: number[] = [];
    let frame = 0;
    let cancelled = false;
    if (scroll != null && Number.isFinite(scroll)) {
      let attempt = 0;
      const apply = () => {
        if (cancelled) return;
        window.scrollTo(0, scroll);
        attempt += 1;
        if (Math.abs(window.scrollY - scroll) <= 2) {
          clearScrollTarget(artist.slug);
          return;
        }
        if (shouldRetryScroll(window.scrollY, scroll, attempt)) frame = requestAnimationFrame(apply);
      };
      frame = requestAnimationFrame(apply);
      for (const delay of [50, 150]) {
        timers.push(window.setTimeout(() => {
          if (cancelled) return;
          if (Math.abs(window.scrollY - scroll) > 2) window.scrollTo(0, scroll);
          else clearScrollTarget(artist.slug);
        }, delay));
      }
    }
    if (!(from && via) || media.matches) {
      return () => {
        cancelled = true;
        if (frame) cancelAnimationFrame(frame);
        for (const timer of timers) window.clearTimeout(timer);
      };
    }
    setJourneyOn(true);
    const journey = window.setTimeout(() => setJourneyOn(false), JOURNEY_MS);
    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      for (const timer of timers) window.clearTimeout(timer);
      window.clearTimeout(journey);
    };
    // The journey plays once per arrival. Zoom changes must not replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artist.slug, from, via]);

  function replaceQuery(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function setZoom(level: ZoomLevel) {
    if (level === "ALL") replaceQuery({ zoom: null, focus: null, event: null });
    else if (level === "DECADE") replaceQuery({ zoom: "decade", event: null, focus: focus ? String(focus) : span ? String(span.last) : null });
    else replaceQuery({ zoom: "year", focus: focus ? String(focus) : span ? String(span.last) : null });
  }

  function openYear(year: number, eventId?: string) {
    trackHistory(eventId ? "TIMELINE_EVENT_OPENED" : "TIMELINE_YEAR_OPENED");
    if (!eventId && focus === year && zoom === "YEAR" && !selected) {
      replaceQuery({ zoom: null, focus: null, event: null });
      return;
    }
    replaceQuery({ zoom: "year", focus: String(year), event: eventId ?? null });
    setExpanded(false);
    setSourcesOpen(false);
  }

  function markPending(slug: string) {
    document.documentElement.dataset.nav = "pending";
    setPendingSlug(slug);
  }

  function warmArtist(slug: string) {
    if (!selected || !slug) return;
    router.prefetch(followArtistHref(slug, artist.slug, selected.slug || selected.id));
  }

  function followArtist(slug: string, exhibition: HistoryExhibitionView) {
    const viaKey = exhibition.slug || exhibition.id;
    const href = followArtistHref(slug, artist.slug, viaKey);
    saveHistoryReturn(artist.slug, viaKey, {
      zoom: zoom === "ALL" ? null : zoom.toLowerCase(),
      focus: focus == null ? null : String(focus),
      scroll: window.scrollY,
    });
    markPending(slug);
    router.prefetch(href);
    trackHistory("CONNECTION_FOLLOWED", href);
    startTransition(() => {
      router.push(href);
    });
  }

  function goBack() {
    markPending("back");
    if (!from) {
      startTransition(() => {
        router.back();
      });
      return;
    }
    const stored = via ? readHistoryReturn(from, via) : null;
    const href = returnArtistHref({
      from,
      via,
      srcZoom: stored?.zoom ?? searchParams.get("srcZoom"),
      srcFocus: stored?.focus ?? searchParams.get("srcFocus"),
    });
    const rawLegacy = searchParams.get("srcScroll");
    const legacyScroll = rawLegacy == null ? null : Number(rawLegacy);
    const scrollValue = stored?.scroll ?? (legacyScroll != null && Number.isFinite(legacyScroll) ? legacyScroll : null);
    if (scrollValue != null) rememberScroll(from, scrollValue);
    router.prefetch(href);
    startTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  const place = selected
    ? momentPlace({ title: selected.title, venue: selected.spaceName, city: selected.city, country: selected.country })
    : null;
  const satellites = selected
    ? momentSatellites(
        {
          artists: selected.artists
            .filter((person) => person.slug !== artist.slug)
            .map((person) => ({ id: person.slug, kind: "artist" as const, label: person.name })),
          space: selected.spaceName ? { id: selected.spaceSlug || selected.spaceId || "space", kind: "space" as const, label: selected.spaceName } : null,
          curators: selected.curatorName
            ? [{ id: selected.curatorSlug || selected.curatorId || "curator", kind: "curator" as const, label: selected.curatorName }]
            : [],
        },
        expanded,
        INITIAL_CONSTELLATION,
      )
    : null;
  const visibleConnectedArtists = satellites?.visible.filter((node) => node.kind === "artist") ?? [];
  const summary = (
    <div className="rh-artist-summary">
      <p className="rh-count-lead">{artist.exhibitionCount}</p>
      <p className="rh-count-copy">{coverage.countNoun}</p>
      {artist.birthYear ? <p className="rh-muted">Born {artist.birthYear}</p> : null}
      {presentation === "sparse" ? null : (
        <div className="rh-signature-block">
          <div className="rh-signature" aria-label={coverage.rangeLabel ?? "Documented exhibition density"}>
            {signature.map((height, index) => (
              <i key={index} style={{ height: `${4 + height * 5}px` }} />
            ))}
          </div>
          {coverage.rangeLabel ? <p className="rh-signature-range">{coverage.rangeLabel}</p> : null}
        </div>
      )}
    </div>
  );

  return (
    <div className="rh-page" style={{ ["--rh-overlay-delay" as string]: `${HISTORY_PENDING_OVERLAY_MS}ms` }}>
      <div className="rh-progress" role="progressbar" aria-hidden={pendingSlug ? undefined : true} aria-label="Opening history">
        <span />
      </div>
      <div className="rh-nav-overlay" data-pending={isPending || pendingSlug ? "1" : "0"} aria-hidden="true">
        <p className="rh-kicker">Artist history</p>
        <div className="rh-skel rh-skel-title" />
        <div className="rh-skel rh-skel-line" />
        <div className="rh-skel rh-skel-row" />
        <div className="rh-skel rh-skel-row" />
        <div className="rh-skel rh-skel-row" />
      </div>
      <TopBar />
      {journeyOn && !reduceMotion && viaExhibition ? (
        <div className="rh-journey" role="status" aria-live="polite">
          <span className="rh-journey-label">Moving through a documented exhibition</span>
          <p>{from?.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")}</p>
          <span className="rh-line" />
          <strong>{viaExhibition.title}</strong>
          <span className="rh-line" />
          <p>{artist.canonicalName}</p>
        </div>
      ) : null}
      <main className="rh-wrap" id="main-content">
        {from ? (
          <div className="rh-trail">
            <button className="rh-back" type="button" onClick={goBack}>
              ← Back
            </button>
            {viaExhibition ? <span>You came here through <strong>{viaExhibition.title}</strong></span> : null}
          </div>
        ) : null}

        <header className={`rh-artist-header${hero ? " has-hero" : ""}`}>
          <div>
            <p className="rh-kicker">Artist history</p>
            <h1 className="rh-title">{artist.canonicalName}</h1>
            {artist.nativeName ? <p className="rh-native">{artist.nativeName}</p> : null}
            <p className="rh-partial">{coverage.partialLabel}</p>
            {hero ? summary : null}
          </div>
          {hero ? <HistoryStill image={hero} onFail={dropHero} /> : <div className="rh-artist-aside">{summary}</div>}
        </header>

        <div className="rh-tabs" role="tablist" aria-label="Artist">
          {(["history", "connections", "works", "about"] as const).map((item) => (
            <button key={item} className="rh-tab" type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)}>
              {item}
            </button>
          ))}
        </div>

        {tab === "history" ? (
          <section className="rh-history-section">
            <div className="rh-history-toolbar">
              <div>
                <p className="rh-kicker">{presentation === "sparse" ? "Documented in ROB" : "History"}</p>
                {presentation === "sparse" ? (
                  <p className="rh-gap-note">{coverage.gapNote}</p>
                ) : span && coverage.rangeLabel ? (
                  <p className="rh-timeline-summary">
                    {coverage.rangeLabel}
                    {zoom === "DECADE" && windowSpan ? <span> · viewing {windowSpan.start}–{windowSpan.end}</span> : null}
                    {presentation === "dense" && zoom === "ALL" ? <span> · clustered by decade</span> : null}
                  </p>
                ) : (
                  <p className="rh-timeline-summary">No documented exhibitions yet</p>
                )}
              </div>
              {presentation === "sparse" ? null : (
                <div className="rh-zoom" role="group" aria-label="Timeline level">
                  {(["ALL", "DECADE", "YEAR"] as const).map((level) => (
                    <button key={level} type="button" aria-pressed={zoom === level} onClick={() => setZoom(level)}>
                      {level}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {presentation === "sparse" ? (
              <ol className="rh-chronology">
                {chronology.map((exhibition) => (
                  <li key={exhibition.id}>
                    <span className="rh-chronology-year">{exhibition.year ?? "—"}</span>
                    <button
                      className={`rh-chronology-card${selected?.id === exhibition.id ? " is-selected" : ""}`}
                      type="button"
                      aria-pressed={selected?.id === exhibition.id}
                      onClick={() => openYear(exhibition.year ?? 0, exhibition.id)}
                    >
                      <strong>{exhibition.title}</strong>
                      <span>{eventLocation(exhibition) || exhibition.dateLabel}</span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <>
            <details className="rh-timeline-help">
              <summary>How to read this timeline</summary>
              <p>Open circles mark year-only records. Filled circles include a month or day. A number is the count for that year. Empty stretches are missing ROB records, not missing activity.</p>
            </details>

            <div className="rh-track-shell">
              {span && visibleGroups.length > 8 ? (
                <div className="rh-track-range" aria-hidden="true">
                  <span>{windowSpan?.start ?? span.first}</span>
                  <span>{windowSpan?.end ?? span.last}</span>
                </div>
              ) : null}
              <div className={`rh-track-wrap${visibleGroups.length > 0 && visibleGroups.length <= 8 ? " is-sparse" : ""}`}>
                <div className="rh-axis" />
                {presentation === "dense" && zoom === "ALL"
                  ? decadeClusters.map((cluster) => {
                      const left = span && span.last !== span.first ? ((cluster.decade - span.first) / (span.last - span.first)) * 100 : 0;
                      return (
                        <button
                          key={cluster.decade}
                          className="rh-cluster"
                          style={{ left: `clamp(0px, calc(${left}% - 22px), calc(100% - 44px))` }}
                          type="button"
                          aria-label={`${cluster.decade}s, ${cluster.count} documented exhibitions`}
                          onClick={() => replaceQuery({ zoom: "decade", focus: String(cluster.decade), event: null })}
                        >
                          <span className="rh-stack">
                            <span className="rh-count">{cluster.count}</span>
                          </span>
                          <span className="rh-cluster-year">{cluster.decade}</span>
                        </button>
                      );
                    })
                  : visibleGroups.map((group) => {
                  const left = windowSpan && windowSpan.end !== windowSpan.start ? ((group.year - windowSpan.start) / (windowSpan.end - windowSpan.start)) * 100 : 0;
                  const only = group.count === 1 ? artist.exhibitions.find((exhibition) => exhibition.id === group.ids[0]) : null;
                  const active = focus === group.year;
                  return (
                    <button
                      key={group.year}
                      className={`rh-cluster${active ? " is-active" : ""}`}
                      style={{ left: `clamp(0px, calc(${left}% - 22px), calc(100% - 44px))` }}
                      type="button"
                      aria-pressed={active}
                      aria-label={`${group.year}, ${group.count} exhibition${group.count === 1 ? "" : "s"}, ${group.marks.every((mark) => mark === "open") ? "year only" : "dated"}`}
                      onClick={() => openYear(group.year, only?.id)}
                    >
                      <span className="rh-stack">
                        {group.marks.slice(0, group.visible).map((mark, index) => (
                          <i key={index} className={mark === "open" ? "rh-pip open" : "rh-pip"} />
                        ))}
                        {group.count > 4 ? <span className="rh-count">{group.count}</span> : null}
                      </span>
                      <span className="rh-cluster-year">{group.year}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rh-vertical">
              {presentation === "dense" && zoom === "ALL"
                ? decadeClusters.map((cluster) => (
                    <button key={cluster.decade} className="rh-year-row" type="button" onClick={() => replaceQuery({ zoom: "decade", focus: String(cluster.decade), event: null })}>
                      <span className="rh-year-dot" aria-hidden="true" />
                      <span className="rh-year-label">{cluster.decade}</span>
                      <span className="rh-year-count">{cluster.count} documented</span>
                    </button>
                  ))
                : visibleGroups.map((group) => (
                    <button key={group.year} className={`rh-year-row${focus === group.year ? " is-active" : ""}`} type="button" onClick={() => openYear(group.year, group.count === 1 ? group.ids[0] : undefined)}>
                      <span className="rh-year-dot" aria-hidden="true" />
                      <span className="rh-year-label">{group.year}</span>
                      <span className="rh-year-count">{group.count} {group.count === 1 ? "exhibition" : "exhibitions"}</span>
                    </button>
                  ))}
            </div>
              </>
            )}

            {presentation !== "sparse" && yearEvents.length > 0 ? (
              <div className="rh-branch">
                <div className="rh-branch-heading">
                  <span>{focus}</span>
                  <span>{yearEvents.length} documented {yearEvents.length === 1 ? "exhibition" : "exhibitions"}</span>
                </div>
                <div className="rh-event-list">
                  {yearEvents.map((exhibition) => (
                    <button
                      key={exhibition.id}
                      className={`rh-event-card${selected?.id === exhibition.id ? " is-selected" : ""}`}
                      type="button"
                      aria-pressed={selected?.id === exhibition.id}
                      onClick={() => openYear(exhibition.year ?? focus ?? 0, exhibition.id)}
                    >
                      <span className="rh-event-dot" aria-hidden="true" />
                      <span className="rh-event-copy">
                        <strong>{exhibition.title}</strong>
                        <span>{eventLocation(exhibition) || exhibition.dateLabel}</span>
                      </span>
                      <span className="rh-event-arrow" aria-hidden="true">→</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {selected && place ? (
              <article className="rh-moment">
                {selected.coverImage ? <HistoryStill image={selected.coverImage} /> : null}
                <div className="rh-moment-heading">
                  <div>
                    <p className="rh-kicker">Moment</p>
                    <h2>{place.title}</h2>
                  </div>
                  <div className="rh-moment-meta">
                    <span>{selected.dateLabel}</span>
                    {place.place ? <span>{place.place}</span> : null}
                  </div>
                </div>

                {visibleConnectedArtists.length > 0 ? (
                  <p className="rh-moment-intro">Continue through this exhibition into another artist&apos;s history.</p>
                ) : (
                  <p className="rh-moment-intro">This documented moment currently connects the artist to its recorded place.</p>
                )}

                <div className="rh-constellation" aria-label="Documented connections from this exhibition">
                  <div className="rh-core-node">
                    <span>{selected.year}</span>
                    <strong>{artist.canonicalName}</strong>
                  </div>
                  <span className="rh-constellation-line" aria-hidden="true" />
                  <div className="rh-satellites">
                    {satellites?.visible.map((node) =>
                      node.kind === "artist" ? (
                        <button
                          key={node.id}
                          className={`rh-node rh-node-artist${pendingSlug === node.id ? " is-pending" : ""}`}
                          type="button"
                          aria-busy={pendingSlug === node.id}
                          onMouseEnter={() => warmArtist(node.id)}
                          onFocus={() => warmArtist(node.id)}
                          onTouchStart={() => warmArtist(node.id)}
                          onClick={() => followArtist(node.id, selected)}
                        >
                          <span className="rh-node-type">Artist</span>
                          <strong>{node.label}</strong>
                          <span className="rh-node-arrow">Enter history →</span>
                        </button>
                      ) : node.kind === "space" && selected.spaceSlug ? (
                        <Link key={node.id} className="rh-node" href={`/spaces/${selected.spaceSlug}`}>
                          <span className="rh-node-type">Space</span>
                          <strong>{node.label}</strong>
                        </Link>
                      ) : (
                        <span key={node.id} className="rh-node">
                          <span className="rh-node-type">{node.kind}</span>
                          <strong>{node.label}</strong>
                        </span>
                      ),
                    )}
                  </div>
                </div>

                {satellites && satellites.hiddenArtists > 0 ? (
                  <button className="rh-link-button" type="button" onClick={() => setExpanded(true)}>
                    Show {satellites.hiddenArtists} more {satellites.hiddenArtists === 1 ? "artist" : "artists"}
                  </button>
                ) : null}

                <div className="rh-source-row">
                  <button
                    className="rh-source-button"
                    type="button"
                    aria-expanded={sourcesOpen}
                    onClick={() => {
                      setSourcesOpen((open) => !open);
                      trackHistory("SOURCE_OPENED");
                    }}
                  >
                    {selected.provenance} <span aria-hidden="true">{sourcesOpen ? "−" : "+"}</span>
                  </button>
                </div>
                {sourcesOpen ? (
                  <div className="rh-source-panel">
                    {selected.sources.length === 0 ? <p>No source is attached.</p> : null}
                    {selected.sources.map((source) => (
                      <p key={source.id}>
                        <a href={source.url} onClick={() => trackHistory("SOURCE_OPENED")}>
                          {source.sourceName} ↗
                        </a>
                      </p>
                    ))}
                    <ReportIssue exhibitionId={selected.id} artistSlug={artist.slug} />
                    {selected.review ? <p>Data under review</p> : null}
                  </div>
                ) : null}
              </article>
            ) : null}

            <div className="rh-history-foot">
              <p>Coverage is partial.</p>
              <Link href={`/history/add?artist=${artist.slug}`} onClick={() => trackHistory("EXHIBITION_ADD_STARTED")}>
                Add an exhibition →
              </Link>
            </div>
          </section>
        ) : null}

        {tab === "connections" ? (
          <section className="rh-tab-panel">
            <div className="rh-section-heading">
              <p className="rh-kicker">Documented connections</p>
              <h2>Artists</h2>
            </div>
            {artist.artists.length === 0 ? <p>No documented shared exhibitions yet.</p> : null}
            <div className="rh-card-grid">
              {artist.artists.map((person) => (
                <article key={person.id} className="rh-card">
                  <Link className="rh-card-link" href={`/artists/${person.slug}`}>{person.name}</Link>
                  {person.nativeName ? <span className="rh-muted"> {person.nativeName}</span> : null}
                  <p>{plural(person.count)}</p>
                  <ul>
                    {person.exhibitions.map((exhibition) => (
                      <li key={exhibition.id}>{exhibition.title}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <div className="rh-section-heading">
              <p className="rh-kicker">Documented places</p>
              <h2>Spaces</h2>
            </div>
            {artist.spaces.length === 0 ? <p>No documented spaces yet.</p> : null}
            <div className="rh-card-grid">
              {artist.spaces.map((space) => (
                <article key={space.id} className="rh-card">
                  {space.slug ? <Link className="rh-card-link" href={`/spaces/${space.slug}`}>{space.name}</Link> : <span>{space.name}</span>}
                  <p>{plural(space.count)}</p>
                </article>
              ))}
            </div>
            <div className="rh-section-heading">
              <p className="rh-kicker">Documented curators</p>
              <h2>Curators</h2>
            </div>
            {artist.curators.length === 0 ? <p>No documented curator is attached.</p> : null}
            <div className="rh-card-grid">
              {artist.curators.map((curator) => (
                <article key={curator.id} className="rh-card">
                  <span>{curator.name}</span>
                  <p>{plural(curator.count)}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "works" ? (
          <section className="rh-tab-panel">
            <div className="rh-section-heading">
              <p className="rh-kicker">First-party archive</p>
              <h2>Works</h2>
            </div>
            {artist.worksHref ? <p><Link href={artist.worksHref}>Open the existing portfolio →</Link></p> : null}
            {artist.works.length === 0 ? <p>No first-party works are public on this page.</p> : null}
            <ul className="rh-list">
              {artist.works.map((work) => (
                <li key={work.id}>
                  {work.title}
                  {work.year ? ` · ${work.year}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {tab === "about" ? (
          <section className="rh-tab-panel rh-about-panel">
            <div className="rh-section-heading">
              <p className="rh-kicker">About this record</p>
              <h2>{artist.canonicalName}</h2>
            </div>
            <p>ROB maps documented exhibitions and connections through time. It does not write a biography.</p>
            {artist.birthYear ? <p>Born {artist.birthYear}</p> : null}
            {artist.city || artist.country ? <p>{[artist.city, artist.country].filter(Boolean).join(", ")}</p> : null}
            {artist.officialWebsite ? <p><a href={artist.officialWebsite}>Official website ↗</a></p> : null}
            <p>
              <Link href={`/history/start?artist=${artist.slug}`} onClick={() => trackHistory("CLAIM_STARTED")}>
                Claim this page →
              </Link>
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
