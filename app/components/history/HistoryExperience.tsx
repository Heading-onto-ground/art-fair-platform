"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { trackHistory } from "@/lib/history/analytics";
import {
  JOURNEY_MS,
  careerSpan,
  groupByYear,
  momentPlace,
  momentSatellites,
  restoredArtistPath,
  signatureColumns,
  zoomSpan,
  type DotMark,
  type ZoomLevel,
} from "@/lib/history/display";
import { INITIAL_CONSTELLATION, isFilledMarker } from "@/lib/history/policy";
import type { HistoryArtistView, HistoryExhibitionView } from "@/lib/history/types";
import "./history.css";

function plural(count: number) {
  return `${count} documented shared exhibition${count === 1 ? "" : "s"}`;
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

  useEffect(() => {
    trackHistory("ARTIST_OPENED", `/artists/${artist.slug}`);
    if (from) trackHistory("SECOND_ARTIST_REACHED", `/artists/${artist.slug}`);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(media.matches);
    const rawScroll = searchParams.get("scroll");
    const scroll = Number(rawScroll);
    if (rawScroll && Number.isFinite(scroll)) requestAnimationFrame(() => window.scrollTo(0, scroll));
    if (!(from && via) || media.matches) return;
    setJourneyOn(true);
    const timer = window.setTimeout(() => setJourneyOn(false), JOURNEY_MS);
    return () => window.clearTimeout(timer);
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

  function followArtist(slug: string, exhibition: HistoryExhibitionView) {
    trackHistory("CONNECTION_FOLLOWED", `/artists/${slug}`);
    const params = new URLSearchParams();
    params.set("from", artist.slug);
    params.set("via", exhibition.slug || exhibition.id);
    if (zoom !== "ALL") params.set("srcZoom", zoom.toLowerCase());
    if (focus != null) params.set("srcFocus", String(focus));
    params.set("srcScroll", String(window.scrollY));
    router.push(`/artists/${slug}?${params.toString()}`);
  }

  function goBack() {
    if (!from) {
      router.back();
      return;
    }
    router.push(
      restoredArtistPath({
        from,
        via,
        srcZoom: searchParams.get("srcZoom"),
        srcFocus: searchParams.get("srcFocus"),
        srcScroll: searchParams.get("srcScroll"),
      }),
    );
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

  return (
    <div className="rh-page">
      <TopBar />
      {journeyOn && !reduceMotion && viaExhibition ? (
        <div className="rh-journey" role="status">
          <p>{from?.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")}</p>
          <span className="rh-line" />
          <p>{viaExhibition.title}</p>
          <span className="rh-line" />
          <p>{artist.canonicalName}</p>
        </div>
      ) : null}
      <main className="rh-wrap" id="main-content">
        {from ? (
          <p>
            <button className="rh-text-button" type="button" onClick={goBack}>
              Back
            </button>
            {viaExhibition ? <span> · You came here through {viaExhibition.title}</span> : null}
          </p>
        ) : null}
        <h1 className="rh-title">{artist.canonicalName}</h1>
        {artist.nativeName ? <p className="rh-native">{artist.nativeName}</p> : null}
        <p>
          {artist.birthYear ? `Born ${artist.birthYear}. ` : null}
          {artist.exhibitionCount} documented exhibitions
        </p>
        <div className="rh-signature" aria-hidden="true">
          {signature.map((height, index) => (
            <i key={index} style={{ height: `${4 + height * 5}px` }} />
          ))}
        </div>
        <div className="rh-tabs" role="tablist" aria-label="Artist">
          {(["history", "connections", "works", "about"] as const).map((item) => (
            <button key={item} className="rh-tab" type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)}>
              {item}
            </button>
          ))}
        </div>

        {tab === "history" ? (
          <section>
            <div className="rh-zoom" role="group" aria-label="Timeline level">
              {(["ALL", "DECADE", "YEAR"] as const).map((level) => (
                <button key={level} type="button" aria-pressed={zoom === level} onClick={() => setZoom(level)}>
                  {level}
                </button>
              ))}
            </div>
            <p className="rh-legend">Open circles are year-only. Filled circles include a month or a day. A number is the count for that year.</p>
            {span ? (
              <p>
                {artist.exhibitionCount} documented exhibitions, {span.first}–{span.last}.
                {zoom === "DECADE" && windowSpan ? ` Showing ${windowSpan.start}–${windowSpan.end}. The documented career runs ${span.first}–${span.last}.` : ""}
              </p>
            ) : (
              <p>No documented exhibitions yet.</p>
            )}
            <div className="rh-track-wrap">
              <div className="rh-axis" />
              {visibleGroups.map((group) => {
                const left = windowSpan && windowSpan.end !== windowSpan.start ? ((group.year - windowSpan.start) / (windowSpan.end - windowSpan.start)) * 100 : 0;
                const only = group.count === 1 ? artist.exhibitions.find((exhibition) => exhibition.id === group.ids[0]) : null;
                return (
                  <button
                    key={group.year}
                    className="rh-cluster"
                    style={{ left: `clamp(0px, calc(${left}% - 7px), calc(100% - 14px))` }}
                    type="button"
                    aria-label={`${group.year}, ${group.count} exhibition${group.count === 1 ? "" : "s"}, ${group.marks.every((mark) => mark === "open") ? "year only" : "dated"}`}
                    onClick={() => openYear(group.year, only?.id)}
                  >
                    <span className="rh-stack">
                      {group.marks.slice(0, group.visible).map((mark, index) => (
                        <i key={index} className={mark === "open" ? "rh-pip open" : "rh-pip"} />
                      ))}
                      {group.count > 4 ? <span className="rh-count">{group.count}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="rh-vertical">
              {visibleGroups.map((group) => (
                <button key={group.year} className="rh-year-row" type="button" onClick={() => openYear(group.year, group.count === 1 ? group.ids[0] : undefined)}>
                  <span>{group.year}</span>
                  <span>{group.count}</span>
                </button>
              ))}
            </div>
            {yearEvents.length > 0 ? (
              <div className="rh-branch">
                <p>{yearEvents.length} documented exhibitions</p>
                {yearEvents.map((exhibition) => (
                  <button key={exhibition.id} className="rh-text-button" type="button" onClick={() => openYear(exhibition.year ?? focus ?? 0, exhibition.id)}>
                    {exhibition.title}
                    {exhibition.spaceName ? ` · ${exhibition.spaceName}` : ""}
                  </button>
                ))}
              </div>
            ) : null}
            {selected && place ? (
              <article className="rh-moment">
                <h2>{place.title}</h2>
                <p>{selected.dateLabel}</p>
                {place.place ? <p>{place.place}</p> : null}
                <div className="rh-constellation">
                  {satellites?.visible.map((node) =>
                    node.kind === "artist" ? (
                      <button key={node.id} className="rh-text-button" type="button" onClick={() => followArtist(node.id, selected)}>
                        {node.label}
                      </button>
                    ) : node.kind === "space" && selected.spaceSlug ? (
                      <Link key={node.id} href={`/spaces/${selected.spaceSlug}`}>
                        {node.label}
                      </Link>
                    ) : (
                      <span key={node.id}>{node.label}</span>
                    ),
                  )}
                </div>
                {satellites && satellites.hiddenArtists > 0 ? (
                  <button className="rh-text-button" type="button" onClick={() => setExpanded(true)}>
                    + {satellites.hiddenArtists} artists
                  </button>
                ) : null}
                <p>
                  <button
                    className="rh-text-button"
                    type="button"
                    aria-expanded={sourcesOpen}
                    onClick={() => {
                      setSourcesOpen((open) => !open);
                      trackHistory("SOURCE_OPENED");
                    }}
                  >
                    {selected.provenance}
                  </button>
                </p>
                {sourcesOpen ? (
                  <div>
                    {selected.sources.length === 0 ? <p>No approved source is attached.</p> : null}
                    {selected.sources.map((source) => (
                      <p key={source.id}>
                        <a href={source.url} onClick={() => trackHistory("SOURCE_OPENED")}>
                          {source.sourceName}
                        </a>
                      </p>
                    ))}
                    {selected.review ? <p>Data under review</p> : null}
                  </div>
                ) : null}
              </article>
            ) : null}
            <p>
              <Link href={`/history/add?artist=${artist.slug}`} onClick={() => trackHistory("EXHIBITION_ADD_STARTED")}>
                Add an exhibition
              </Link>
            </p>
          </section>
        ) : null}

        {tab === "connections" ? (
          <section>
            <h2>Artists</h2>
            {artist.artists.length === 0 ? <p>No documented shared exhibitions yet.</p> : null}
            {artist.artists.map((person) => (
              <article key={person.id} className="rh-card">
                <Link href={`/artists/${person.slug}`}>{person.name}</Link>
                {person.nativeName ? <span> {person.nativeName}</span> : null}
                <p>{plural(person.count)}</p>
                <ul>
                  {person.exhibitions.map((exhibition) => (
                    <li key={exhibition.id}>{exhibition.title}</li>
                  ))}
                </ul>
              </article>
            ))}
            <h2>Spaces</h2>
            {artist.spaces.length === 0 ? <p>No documented spaces yet.</p> : null}
            {artist.spaces.map((space) => (
              <article key={space.id} className="rh-card">
                {space.slug ? <Link href={`/spaces/${space.slug}`}>{space.name}</Link> : <span>{space.name}</span>}
                <p>{plural(space.count)}</p>
              </article>
            ))}
            <h2>Curators</h2>
            {artist.curators.length === 0 ? <p>No documented curator is attached.</p> : null}
            {artist.curators.map((curator) => (
              <article key={curator.id} className="rh-card">
                <span>{curator.name}</span>
                <p>{plural(curator.count)}</p>
              </article>
            ))}
          </section>
        ) : null}

        {tab === "works" ? (
          <section>
            {artist.worksHref ? <p><Link href={artist.worksHref}>Open the existing portfolio</Link></p> : null}
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
          <section>
            <p>ROB shows documented exhibitions. It does not write a biography.</p>
            {artist.birthYear ? <p>Born {artist.birthYear}</p> : null}
            {artist.city || artist.country ? <p>{[artist.city, artist.country].filter(Boolean).join(", ")}</p> : null}
            {artist.officialWebsite ? <p><a href={artist.officialWebsite}>Official website</a></p> : null}
            <p>
              <Link href={`/history/start?artist=${artist.slug}`} onClick={() => trackHistory("CLAIM_STARTED")}>
                Claim this page
              </Link>
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
