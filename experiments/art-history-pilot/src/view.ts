import { earliestRecordedExhibition, EARLIEST_LABEL } from "./graph";
import type { ExhibitionRecord } from "./claims";
import { isRecordedExhibition } from "./claims";
import type { SeedArtist } from "./seed";
import { compactName } from "./resolve";

export type TimelinePerson = {
  key: string;
  pilotId: string | null;
  displayName: string;
  koreanName: string;
  birthYear: number | null;
  searchText: string;
  earliest: string | null;
  events: TimelineEvent[];
};

export type TimelineEvent = {
  id: string;
  when: string;
  title: string;
  venue: string | null;
  city: string | null;
  curators: string[];
  artists: { name: string; key: string }[];
  sourceUrl: string;
};

export type TimelineData = {
  headline: "Search an artist. See their journey.";
  placeholder: "Search an artist...";
  suggestions: { key: string; label: string }[];
  people: TimelinePerson[];
};

function labels(artist: SeedArtist): string[] {
  return [artist.canonicalKoreanName, ...artist.romanizedNames, ...artist.otherAliases];
}

function matchesArtist(artist: SeedArtist, name: string): boolean {
  const target = compactName(name);
  return labels(artist).some((label) => compactName(label) === target);
}

function whenLabel(record: ExhibitionRecord): string {
  if (!record.start) return "Date not recorded";
  return record.end ? `${record.start.value} – ${record.end.value}` : record.start.value;
}

export function buildTimelineData(artists: SeedArtist[], records: ExhibitionRecord[]): TimelineData {
  const accepted = records.filter((record) => isRecordedExhibition(record));
  const people: TimelinePerson[] = artists.map((artist) => {
    const events = accepted
      .filter((record) => record.artistNames.some((name) => matchesArtist(artist, name)))
      .sort((a, b) => (b.start?.value ?? "").localeCompare(a.start?.value ?? ""));
    const earliest = earliestRecordedExhibition(accepted, events[0]?.artistNames.find((name) => matchesArtist(artist, name)) ?? artist.romanizedNames[0]);
    return {
      key: `pilot:${artist.pilotId}`,
      pilotId: artist.pilotId,
      displayName: artist.romanizedNames[0],
      koreanName: artist.canonicalKoreanName,
      birthYear: artist.birthYear,
      searchText: labels(artist).join(" "),
      earliest: earliest ? `${EARLIEST_LABEL} · ${earliest.record.start?.value}` : null,
      events: events.map((record) => ({
        id: record.id,
        when: whenLabel(record),
        title: record.title,
        venue: record.venueName,
        city: record.city,
        curators: record.curatorNames,
        artists: record.artistNames.map((name) => ({ name, key: keyForName(artists, name) })),
        sourceUrl: record.sourceUrl,
      })),
    };
  });

  for (const record of accepted) {
    for (const name of record.artistNames) {
      const key = keyForName(artists, name);
      if (people.some((person) => person.key === key)) continue;
      const events = accepted.filter((item) =>
        item.artistNames.some((artistName) => compactName(artistName) === compactName(name)),
      );
      people.push({
        key,
        pilotId: null,
        displayName: name,
        koreanName: "",
        birthYear: null,
        searchText: name,
        earliest: events[0] ? `${EARLIEST_LABEL} · ${[...events].sort((a, b) => (a.start?.value ?? "").localeCompare(b.start?.value ?? ""))[0]?.start?.value ?? ""}` : null,
        events: events.map((item) => ({
          id: item.id,
          when: whenLabel(item),
          title: item.title,
          venue: item.venueName,
          city: item.city,
          curators: item.curatorNames,
          artists: item.artistNames.map((artistName) => ({ name: artistName, key: keyForName(artists, artistName) })),
          sourceUrl: item.sourceUrl,
        })),
      });
    }
  }

  return {
    headline: "Search an artist. See their journey.",
    placeholder: "Search an artist...",
    suggestions: people.slice(0, 3).map((person) => ({ key: person.key, label: person.displayName })),
    people,
  };
}

function keyForName(artists: SeedArtist[], name: string): string {
  const found = artists.find((artist) => matchesArtist(artist, name));
  return found ? `pilot:${found.pilotId}` : `name:${compactName(name)}`;
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function renderTimelineHtml(data: TimelineData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ROB art history pilot</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; background: #fff; color: #111; font-family: Georgia, "Iowan Old Style", "Palatino Linotype", serif; }
    main { max-width: 720px; margin: 0 auto; padding: 64px 24px 96px; }
    header p { margin: 0 0 28px; font-size: 28px; line-height: 1.25; }
    input { width: 100%; box-sizing: border-box; border: 1px solid #111; background: #fff; color: #111; font: 16px/1.4 system-ui, sans-serif; padding: 14px 16px; }
    .suggestions { display: flex; gap: 16px; flex-wrap: wrap; margin: 18px 0 8px; }
    button.link { border: 0; background: none; padding: 0; color: #111; font: inherit; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
    .results { margin-top: 18px; font-family: system-ui, sans-serif; }
    .result { display: block; width: 100%; text-align: left; border: 0; border-top: 1px solid #ddd; background: #fff; padding: 12px 0; cursor: pointer; }
    h1 { font-size: 40px; line-height: 1; margin: 28px 0 0; letter-spacing: 0.02em; }
    .sub { margin: 8px 0 0; font-family: system-ui, sans-serif; color: #333; }
    .via { margin: 22px 0; font-family: system-ui, sans-serif; font-size: 14px; }
    .earliest { font-family: system-ui, sans-serif; font-size: 14px; margin: 22px 0; }
    .event { display: grid; grid-template-columns: 16px 1fr; gap: 14px; }
    .rail { border-left: 1px solid #111; margin-left: 5px; position: relative; }
    .rail i { width: 9px; height: 9px; border: 1px solid #111; background: #111; border-radius: 50%; display: block; position: absolute; left: -6px; top: 4px; }
    .event article { padding: 0 0 28px; }
    .when { font-family: system-ui, sans-serif; font-size: 13px; letter-spacing: 0.04em; }
    .meta, .people, .source { font-family: system-ui, sans-serif; font-size: 14px; color: #222; }
    .empty { font-family: system-ui, sans-serif; margin-top: 24px; }
    footer { margin-top: 48px; font-family: system-ui, sans-serif; font-size: 12px; color: #555; }
  </style>
</head>
<body>
  <main>
    <header>
      <p>Search an artist.<br>See their journey.</p>
      <input id="q" type="search" placeholder="${data.placeholder}" autocomplete="off" />
      <div class="suggestions" id="suggestions"></div>
      <div class="results" id="results" hidden></div>
    </header>
    <section id="history" hidden></section>
    <footer>Experimental pilot. Documented records only. Production ROB is unchanged.</footer>
  </main>
  <script>
    const DATA = ${safeJson(data)};
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
    const q = document.querySelector("#q");
    const results = document.querySelector("#results");
    const history = document.querySelector("#history");
    const suggestions = document.querySelector("#suggestions");
    let via = null;

    function person(key) { return DATA.people.find((item) => item.key === key); }

    function showResults(query) {
      const needle = query.trim().toLowerCase();
      history.hidden = true;
      if (!needle) { results.hidden = true; results.innerHTML = ""; return; }
      const found = DATA.people.filter((item) => item.searchText.toLowerCase().includes(needle)).slice(0, 8);
      results.hidden = false;
      results.innerHTML = found.map((item) =>
        '<button class="result" data-key="' + esc(item.key) + '"><strong>' + esc(item.displayName) + '</strong><br>' + esc(item.koreanName) + '</button>'
      ).join("") || '<p class="empty">No artist in this 100-person pilot matches that search.</p>';
    }

    function showPerson(key) {
      const item = person(key);
      if (!item) return;
      results.hidden = true;
      history.hidden = false;
      const viaHtml = via ? '<p class="via">' + esc(via.from) + '<br>↓<br>' + esc(via.detail) + '<br>↓<br>' + esc(item.displayName) + '</p>' : "";
      const earliest = item.earliest ? '<p class="earliest">' + esc(item.earliest) + '</p>' : "";
      const events = item.events.length ? item.events.map((event) => {
        const place = [event.venue, event.city].filter(Boolean).join(" · ");
        const artists = event.artists.map((artist) =>
          '<button class="link" data-key="' + esc(artist.key) + '" data-via-title="' + esc(event.title) + '" data-via-when="' + esc(event.when) + '">' + esc(artist.name) + '</button>'
        ).join(", ");
        return '<div class="event"><div class="rail"><i></i></div><article><div class="when">' + esc(event.when) + '</div><h2>' + esc(event.title) + '</h2><p class="meta">' + esc(place) + '</p><p class="people">Participating artists<br>' + artists + '</p>' +
          (event.curators.length ? '<p class="people">Curator<br>' + event.curators.map(esc).join(", ") + '</p>' : '') +
          '<p class="source"><a href="' + esc(event.sourceUrl) + '">Official source</a></p><p class="people">Based on documented exhibitions</p></article></div>';
      }).join("") : '<p class="empty">No accepted exhibition records for this artist yet.</p>';
      history.innerHTML = viaHtml + '<h1>' + esc(item.displayName.toUpperCase()) + '</h1><p class="sub">' + esc(item.koreanName) + (item.birthYear ? ' · Born ' + esc(item.birthYear) : '') + '</p>' + earliest + '<h2>HISTORY</h2>' + events;
    }

    suggestions.innerHTML = DATA.suggestions.map((item) => '<button class="link" data-key="' + esc(item.key) + '">' + esc(item.label) + '</button>').join("");
    document.body.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-key]");
      if (!button) return;
      if (button.dataset.viaTitle) {
        const current = document.querySelector("h1");
        via = { from: current ? current.textContent : "", detail: button.dataset.viaWhen + " · " + button.dataset.viaTitle };
      } else {
        via = null;
      }
      showPerson(button.dataset.key);
    });
    q.addEventListener("input", () => showResults(q.value));
  </script>
</body>
</html>`;
}
