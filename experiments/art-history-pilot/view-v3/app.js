/* Pilot product client. Rules mirror src/hybrid.ts, src/catalog.ts, and src/display.ts. No network calls. */
(function () {
  const C = window.ROB_CATALOG;
  const STORE_KEY = "rob-art-history-v3";
  const DEBUG_KEY = "rob-art-history-v3-debug";
  const EMPTY_HISTORY = "No accepted exhibition records in ROB yet.";
  const EMPTY_HELP = "Are you this artist? Help complete this history.";
  let notice = "";
  let mapDepth = 1;
  let mapFor = "";
  let shown = 24;
  let lastFocus = null;
  let journeyKey = "";
  let journeyArtist = "";
  let journeyUntil = 0;
  let momentExpanded = false;
  let momentFor = "";

  function parseHash() {
    const raw = (location.hash || "#/").replace(/^#/, "");
    const cut = raw.indexOf("?");
    const path = cut >= 0 ? raw.slice(0, cut) : raw;
    const query = cut >= 0 ? raw.slice(cut + 1) : "";
    const parts = path.split("/").filter(Boolean);
    return { parts, params: new URLSearchParams(query) };
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function compact(value) {
    return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9\uac00-\ud7a3]/g, "");
  }

  function short(value, length) {
    const text = String(value ?? "");
    return text.length > length ? `${text.slice(0, length - 1)}…` : text;
  }

  function safeUrl(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
    } catch (error) {
      return "";
    }
    return "";
  }

  function blankStore() {
    return { claims: [], people: [], events: [], reviews: [] };
  }

  function readStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "");
      if (!parsed || !Array.isArray(parsed.people) || !Array.isArray(parsed.events)) return blankStore();
      return {
        claims: Array.isArray(parsed.claims) ? parsed.claims : [],
        people: parsed.people,
        events: parsed.events,
        reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
      };
    } catch (error) {
      return blankStore();
    }
  }

  function writeStore(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  function enteredDate(raw, requested) {
    const value = String(raw ?? "").trim();
    if (!value || requested === "UNKNOWN") return { value: null, precision: "UNKNOWN" };
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { value, precision: "DAY" };
    if (/^\d{4}-\d{2}$/.test(value)) return { value, precision: "MONTH" };
    if (/^\d{4}$/.test(value)) return { value, precision: "YEAR" };
    return { value: null, precision: "UNKNOWN" };
  }

  function specificTitle(title, venue) {
    const trimmed = title.trim();
    return trimmed.length >= 24 && compact(trimmed) !== compact(venue || "");
  }

  function submissionMatch(existing, draft) {
    if (!draft.title.trim() || compact(existing.title) !== compact(draft.title)) return "NEW";
    const sameVenue = compact(existing.venue || "") && compact(existing.venue || "") === compact(draft.venue || "");
    const existingYear = String(existing.start || "").slice(0, 4);
    const draftYear = String(draft.start || "").slice(0, 4);
    const sameYear = /^\d{4}$/.test(existingYear) && existingYear === draftYear;
    if (!sameVenue || !sameYear || !specificTitle(draft.title, draft.venue)) return "REVIEW_REQUIRED";
    const left = String(existing.start || "");
    const right = String(draft.start || "");
    if (left.length > 4 && right.length > 4 && left.slice(0, 7) !== right.slice(0, 7)) return "REVIEW_REQUIRED";
    return "ATTACHED";
  }

  function classifySubmission(existing, draft) {
    if (!existing) return "NEW";
    const match = submissionMatch(existing, draft);
    if (match !== "REVIEW_REQUIRED") return match;
    const left = String(existing.start || "");
    const right = String(draft.start || "");
    const sameVenue = compact(existing.venue || "") && compact(existing.venue || "") === compact(draft.venue || "");
    const sameYear = /^\d{4}$/.test(left.slice(0, 4)) && left.slice(0, 4) === right.slice(0, 4);
    const specific = specificTitle(draft.title, draft.venue);
    if (sameVenue && sameYear && specific && left.length > 4 && right.length > 4 && left.slice(0, 7) !== right.slice(0, 7)) return "CONFLICT";
    return "REVIEW_REQUIRED";
  }

  function provenanceLabel(marks) {
    if (marks.some((mark) => mark.verification === "CONFLICT")) return "Conflict";
    const official = marks.some((mark) => mark.origin === "ROB_RESEARCHED");
    const firstParty = [...new Set(marks.map((mark) => mark.origin))].filter((origin) => origin !== "ROB_RESEARCHED");
    if (official && firstParty.length > 1) return "Multiple sources";
    if (official && firstParty[0] === "ARTIST_SUBMITTED") return "Artist + official source";
    if (official && firstParty[0] === "GALLERY_SUBMITTED") return "Gallery + official source";
    if (official && firstParty[0] === "INSTITUTION_SUBMITTED") return "Institution + official source";
    if (official) return "Official source";
    if (firstParty.includes("GALLERY_SUBMITTED")) return "Gallery added";
    if (firstParty.includes("INSTITUTION_SUBMITTED")) return "Institution added";
    return "Artist added";
  }

  function provIcon(label) {
    if (label === "Conflict") return "!";
    if (label.includes("+") || label === "Multiple sources") return "✓○";
    if (label === "Official source") return "✓";
    return "○";
  }

  function originWord(origin) {
    return {
      ROB_RESEARCHED: "ROB researched",
      ARTIST_SUBMITTED: "Artist submitted",
      GALLERY_SUBMITTED: "Gallery submitted",
      INSTITUTION_SUBMITTED: "Institution submitted",
    }[origin] || origin;
  }

  function verificationWord(verification) {
    return {
      UNVERIFIED: "Unverified",
      SOURCE_ATTACHED: "Source attached",
      CORROBORATED: "Corroborated",
      OFFICIAL_SOURCE: "Official source",
      CONFLICT: "Conflict",
      REVIEW_REQUIRED: "Needs review",
    }[verification] || verification;
  }

  function linkParticipant(name, people) {
    const target = compact(name);
    if (!target) return { kind: "REVIEW_REQUIRED", name: name.trim() };
    const hits = people.filter((person) => person.labels.some((label) => compact(label) === target));
    const ids = [...new Set(hits.map((person) => person.id))];
    if (ids.length > 1) return { kind: "REVIEW_REQUIRED", name: name.trim() };
    if (ids.length === 1) return { kind: "PILOT_ARTIST", id: ids[0], name: hits[0].labels[0] || name.trim() };
    return { kind: "UNRESOLVED_PARTICIPANT", name: name.trim() };
  }

  function directory() {
    const base = C.artists.map((artist) => ({ id: artist.id, labels: artist.labels }));
    const local = readStore().people.map((person) => ({ id: person.id, labels: [person.name, person.korean].filter(Boolean) }));
    return base.concat(local);
  }

  function personById(id) {
    const artist = C.artists.find((item) => item.id === id);
    if (artist) return artist;
    const local = readStore().people.find((item) => item.id === id);
    if (!local) return null;
    return {
      id: local.id,
      name: local.name,
      korean: local.korean || "",
      labels: [local.name, local.korean].filter(Boolean),
      aliases: [],
      birthYear: local.birthYear,
      birthVerified: false,
      identityStatus: "LOCAL_PILOT",
      qid: null,
      demo: true,
      city: local.city || "",
      website: local.website || "",
      count: 0,
      bucket: "EMPTY",
      signature: historySignature(addedEvents({ id: local.id }).map((event) => event.start || "")),
      earliest: null,
      latest: null,
      earliestId: null,
      exhibitionIds: [],
      undatedIds: [],
      marks: [],
    };
  }

  function isClaimed(id) {
    const store = readStore();
    return store.claims.includes(id) || store.people.some((person) => person.id === id);
  }

  function normalizeLocal(event) {
    const year = event.start ? Number(String(event.start).slice(0, 4)) : null;
    const precision = String(event.precision || "unknown").toLowerCase();
    return {
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      precision,
      when: event.start ? (event.end ? `${event.start} – ${event.end}` : String(event.start)) : "Date not recorded",
      year: year >= 1800 && year <= 2100 ? year : null,
      venue: event.venue || null,
      spaceId: null,
      city: event.city || null,
      country: event.country || null,
      artistIds: event.artistIds || [],
      recordedNames: event.unresolved || [],
      reviewNames: event.reviewNames || [],
      curators: event.curator ? [event.curator] : [],
      sources: event.sourceUrl ? [{ url: event.sourceUrl, retrievedAt: null }] : [],
      origin: event.origin,
      verification: event.verification,
      local: true,
      conflictNote: event.conflictNote || "",
      attachedTo: event.attachedTo || null,
    };
  }

  function exhibitionById(id) {
    const found = C.exhibitions.find((item) => item.id === id);
    if (found) return found;
    const local = readStore().events.find((item) => item.id === id);
    return local ? normalizeLocal(local) : null;
  }

  function addedEvents(person) {
    return readStore().events
      .filter((event) => (event.artistIds || []).includes(person.id) && !event.attachedTo && event.verification !== "REVIEW_REQUIRED" && event.verification !== "CONFLICT")
      .map(normalizeLocal);
  }

  function reviewEvents(person) {
    return readStore().events.filter((event) => event.verification === "REVIEW_REQUIRED" && ((event.artistIds || []).includes(person.id) || event.ownerId === person.id));
  }

  function overlays(id) {
    return readStore().events.filter((event) => event.attachedTo === id && event.verification !== "REVIEW_REQUIRED");
  }

  function provenanceFor(exhibition) {
    if (exhibition.local) {
      return provenanceLabel([{ origin: exhibition.origin, verification: exhibition.verification, sourceUrl: exhibition.sources[0] ? exhibition.sources[0].url : null }]);
    }
    const extra = overlays(exhibition.id);
    const marks = [{
      origin: "ROB_RESEARCHED",
      verification: extra.some((event) => event.verification === "CONFLICT") ? "CONFLICT" : "OFFICIAL_SOURCE",
      sourceUrl: exhibition.sources[0] ? exhibition.sources[0].url : null,
    }];
    extra.forEach((event) => marks.push({ origin: event.origin, verification: event.verification, sourceUrl: event.sourceUrl }));
    return provenanceLabel(marks);
  }

  function career(person) {
    const official = (person.exhibitionIds || []).map(exhibitionById).filter(Boolean);
    const added = addedEvents(person);
    const dated = official.concat(added).filter((event) => event.year).sort((a, b) => String(a.start).localeCompare(String(b.start)) || a.id.localeCompare(b.id));
    const undated = official.concat(added).filter((event) => !event.year);
    return { dated, undated, officialCount: person.demo ? 0 : person.count, addedCount: added.length };
  }

  function historySignature(values, bins) {
    const size = bins || 16;
    const years = values.map((value) => Number(String(value).slice(0, 4))).filter((year) => year >= 1800 && year <= 2100);
    const counts = Array.from({ length: size }, () => 0);
    if (!years.length) return counts;
    const min = Math.min.apply(null, years);
    const span = Math.max(1, Math.max.apply(null, years) - min + 1);
    years.forEach((year) => {
      const index = Math.min(size - 1, Math.floor(((year - min) / span) * size));
      counts[index] += 1;
    });
    return counts;
  }

  function assignLanes(fractions) {
    const last = [];
    return fractions.map((fraction) => {
      let lane = last.findIndex((value) => fraction - value >= 0.012);
      if (lane < 0) {
        lane = last.length;
        last.push(fraction);
      } else last[lane] = fraction;
      return lane;
    });
  }

  function timelineFraction(value, precision, minYear, maxYear) {
    const year = Number(String(value).slice(0, 4));
    const span = Math.max(1, maxYear - minYear + 1);
    const word = String(precision || "").toLowerCase();
    if (word === "year" || word === "unknown" || String(value).length === 4) return (year - minYear) / span;
    const month = Number(String(value).slice(5, 7));
    const monthIndex = month >= 1 && month <= 12 ? month - 1 : 0;
    const day = word === "day" ? Number(String(value).slice(8, 10)) : 0;
    const dayOffset = day >= 1 ? (day - 1) / 31 : 0.5;
    return (year - minYear + (monthIndex + dayOffset) / 12) / span;
  }

  function isOpenDot(event) {
    const word = String(event.precision || "").toLowerCase();
    return !event.start || word === "year" || word === "unknown" || String(event.start).length === 4;
  }

  function marksFor(events) {
    if (!events.length) return [];
    const years = events.map((event) => event.year);
    const min = Math.min.apply(null, years);
    const max = Math.max.apply(null, years);
    const items = events.map((event) => ({
      id: event.id,
      year: event.year,
      mark: isOpenDot(event) ? "open" : "filled",
      fraction: min === max ? 0.5 : timelineFraction(event.start, event.precision, min, max),
    })).sort((a, b) => a.fraction - b.fraction || a.id.localeCompare(b.id));
    const groups = [];
    items.forEach((item) => {
      const last = groups[groups.length - 1];
      if (last && Math.abs(last[0].fraction - item.fraction) < 1e-9) last.push(item);
      else groups.push([item]);
    });
    const marks = groups.map((group) => {
      const mark = group.every((item) => item.mark === "filled") ? "filled" : "open";
      if (group.length === 1) return { kind: "dot", id: group[0].id, fraction: group[0].fraction, mark, year: group[0].year, lane: 0 };
      return { kind: "cluster", ids: group.map((item) => item.id), fraction: group[0].fraction, mark, year: group[0].year, count: group.length, marks: group.map((item) => item.mark), lane: 0 };
    });
    const lanes = assignLanes(marks.map((mark) => mark.fraction));
    return marks.map((mark, index) => Object.assign({}, mark, { lane: lanes[index] }));
  }

  const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", auml: "ä", Auml: "Ä", ouml: "ö", Ouml: "Ö", uuml: "ü", Uuml: "Ü", aacute: "á", Aacute: "Á", eacute: "é", Eacute: "É", iacute: "í", oacute: "ó", uacute: "ú", agrave: "à", egrave: "è", ecirc: "ê", acirc: "â", ucirc: "û", Ucirc: "Û", ocirc: "ô", ccedil: "ç", Ccedil: "Ç", ntilde: "ñ", szlig: "ß", mdash: "—", ndash: "–", hellip: "…" };
  const COUNTRY_ALIASES = { korea: "Korea", "south korea": "Korea", "republic of korea": "Korea", rok: "Korea", "대한민국": "Korea", "한국": "Korea" };

  function decodeDisplayText(value) {
    return String(value || "").replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (entity, body) => {
      if (body.charAt(0) === "#") {
        const code = body.charAt(1) === "x" || body.charAt(1) === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
        if (!isFinite(code) || code < 0 || code > 0x10ffff) return entity;
        return String.fromCodePoint(code);
      }
      return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, body) ? NAMED_ENTITIES[body] : entity;
    });
  }

  function displayCountry(value) {
    if (!value) return null;
    const decoded = decodeDisplayText(value).trim();
    if (!decoded) return null;
    return Object.prototype.hasOwnProperty.call(COUNTRY_ALIASES, decoded.toLowerCase()) ? COUNTRY_ALIASES[decoded.toLowerCase()] : decoded;
  }

  function compactPhrase(value) {
    return decodeDisplayText(value).toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
  }

  function phrasesMatch(left, right) {
    if (!left || !right) return false;
    const a = compactPhrase(left);
    const b = compactPhrase(right);
    return a.length > 0 && a === b;
  }

  function uncertainDisplay(value) {
    if (!value) return false;
    const decoded = decodeDisplayText(value);
    if (/&(?:#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/.test(decoded)) return true;
    return /\b[A-Za-z]{1,2}\d{4}\b/.test(decoded);
  }

  function textOf(value) {
    return esc(decodeDisplayText(value || ""));
  }

  function clusterFace(count) {
    const safe = Math.max(0, count);
    const visible = Math.min(safe, 4);
    return { visible: visible, overflow: safe - visible };
  }

  function signatureColumns(counts) {
    const max = Math.max.apply(null, counts.concat(0));
    if (!max) return counts.map(() => 0);
    return counts.map((count) => (count ? Math.max(1, Math.round((count / max) * 3)) : 0));
  }

  function placeBits(event) {
    const title = decodeDisplayText(event.title || "");
    const venue = event.venue ? decodeDisplayText(event.venue) : "";
    const city = event.city ? decodeDisplayText(event.city) : "";
    const country = displayCountry(event.country) || "";
    return [phrasesMatch(title, venue) ? "" : venue, city, country].filter(Boolean);
  }

  function yearGroups(events) {
    const map = new Map();
    events.forEach((event) => {
      if (!event.year) return;
      const row = map.get(event.year) || { year: event.year, ids: [], marks: [] };
      row.ids.push(event.id);
      row.marks.push(isOpenDot(event) ? "open" : "filled");
      map.set(event.year, row);
    });
    return [...map.values()].sort((a, b) => a.year - b.year).map((row) => Object.assign({ count: row.ids.length }, row, clusterFace(row.ids.length)));
  }

  function timelineView(groups) {
    const zoom = (parseHash().params.get("zoom") || "all").toUpperCase();
    const level = zoom === "DECADE" || zoom === "YEAR" ? zoom : "ALL";
    const focus = Number(parseHash().params.get("focus")) || null;
    const first = groups[0].year;
    const last = groups[groups.length - 1].year;
    if (level === "DECADE") {
      const year = focus || last;
      const start = Math.floor(year / 10) * 10;
      return { level: level, focus: focus, start: start, end: start + 9, first: first, last: last };
    }
    return { level: level, focus: focus, start: first, end: last, first: first, last: last };
  }

  function signatureHtml(counts) {
    const cols = signatureColumns(counts || []);
    const empty = cols.every((count) => count === 0);
    const body = cols.map((count) => count ? `<span class="col">${"<i></i>".repeat(count)}</span>` : `<span class="col empty"></span>`).join("");
    return `<span class="signature${empty ? " empty" : ""}" aria-hidden="true">${body}</span>`;
  }

  function sharedPhrase(count) {
    return count === 1 ? "1 documented shared exhibition" : `${count} documented shared exhibitions`;
  }

  function go(path, replace, keepScroll) {
    const next = path.startsWith("/") ? path : `/${path}`;
    const url = `${location.pathname}${location.search}#${next}`;
    const data = { entry: true };
    if (replace) history.replaceState(data, "", url);
    else history.pushState(data, "", url);
    closeNavSearch();
    render();
    if (!keepScroll) window.scrollTo(0, 0);
  }

  function currentArtistId() {
    const { parts } = parseHash();
    return parts[0] === "artist" ? parts[1] : "";
  }

  function artistHref(id, via) {
    const params = new URLSearchParams();
    const current = parseHash().params;
    const from = currentArtistId();
    if (via) params.set("via", via);
    if (from && from !== id) {
      params.set("from", from);
      const zoom = current.get("zoom");
      const focus = current.get("focus");
      if (zoom) params.set("srcZoom", zoom);
      if (focus) params.set("srcFocus", focus);
      params.set("srcScroll", String(window.scrollY || 0));
    }
    const query = params.toString();
    return `/artist/${id}${query ? `?${query}` : ""}`;
  }

  function setNav(parts) {
    const key = parts[0] || "home";
    document.querySelectorAll("[data-nav]").forEach((link) => {
      if (link.dataset.nav === key) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.body.classList.toggle("home", parts.length === 0);
  }

  function applyTitle(parts) {
    if (parts[0] === "artist") {
      const person = personById(parts[1]);
      document.title = person ? `${person.name}: Exhibition History & Connections | ROB` : "ROB";
      return;
    }
    if (parts[0] === "exhibition") {
      const exhibition = exhibitionById(parts[1]);
      document.title = exhibition ? `${exhibition.title}: Artists, Space & History | ROB` : "ROB";
      return;
    }
    if (parts[0] === "space") {
      const space = C.spaces.find((item) => item.id === parts[1]);
      document.title = space ? `${space.name}: Exhibitions & Artists | ROB` : "ROB";
      return;
    }
    if (parts[0] === "rankings") {
      document.title = "Rankings | ROB";
      return;
    }
    document.title = "ROB";
  }

  function resultHtml(person, demo) {
    const bits = [];
    if (!demo && person.birthVerified && person.birthYear) bits.push(`Born ${person.birthYear}`);
    bits.push(demo ? "DEMO" : `${person.count} documented`);
    return `<button type="button" class="result" data-go="/artist/${esc(person.id)}">
      <span><strong>${esc(person.name)}</strong><span class="native">${esc(person.korean || "")}</span></span>
      <span class="meta">${signatureHtml(person.signature || historySignature([]))}<span class="sr">${demo ? "Demo artist" : `${person.count} documented exhibitions`}</span><span>${esc(bits.join(" · "))}</span></span>
    </button>`;
  }

  function searchHtml(query) {
    const raw = query.trim();
    if (!raw) return "";
    const base = C.artists.filter((artist) => matches(artist, raw)).slice(0, 12);
    const local = readStore().people.filter((person) => matches({ labels: [person.name, person.korean].filter(Boolean), name: person.name, korean: person.korean }, raw));
    let html = base.map((artist) => resultHtml(artist, false)).join("");
    if (local.length) {
      html += `<p class="kicker">In this browser</p>${local.map((person) => resultHtml(personById(person.id), true)).join("")}`;
    }
    if (!base.length) {
      html += `<p class="quiet-link"><button type="button" data-go="/start/new?name=${encodeURIComponent(raw)}">Can't find yourself? Start your history</button></p>`;
    }
    return html;
  }

  function matches(person, query) {
    const raw = query.trim().toLowerCase();
    if (!raw) return false;
    const labels = person.labels || [person.name, person.korean].filter(Boolean);
    if (labels.join(" ").toLowerCase().includes(raw)) return true;
    const needle = compact(raw);
    if (needle.length < 2) return false;
    return labels.some((label) => compact(label).includes(needle));
  }

  function renderHome(main) {
    main.innerHTML = `<section class="hero">
      <h1>Search an artist.<br>See their journey.</h1>
      <label class="sr" for="q">Search an artist</label>
      <input id="q" class="hero-search" type="search" placeholder="Search an artist..." autocomplete="off" value="${esc(sessionQuery())}" />
      <div id="results" class="results"></div>
      <p class="artist-link" id="start-link"><button type="button" data-go="/start">Are you an artist? Start your history →</button></p>
    </section>
    <section class="below" id="below">
      <a href="#/explore"><p class="kicker">Explore</p><h2>Artists, exhibitions, spaces.</h2></a>
      <a href="#/rankings"><p class="kicker">Rankings</p><h2>Lists that wait for verified facts.</h2></a>
      <a href="#/now"><p class="kicker">Now</p><h2>What a date can honestly call current.</h2></a>
    </section>`;
    paintHomeResults(sessionQuery());
  }

  function sessionQuery() {
    return document.querySelector("#q") ? document.querySelector("#q").value : "";
  }

  function paintHomeResults(query) {
    const results = document.querySelector("#results");
    const below = document.querySelector("#below");
    const start = document.querySelector("#start-link");
    if (!results) return;
    results.innerHTML = searchHtml(query);
    const typing = query.trim().length > 0;
    if (below) below.hidden = typing;
    if (start) start.hidden = typing;
  }

  function paintNavResults(query) {
    const results = document.querySelector("#nav-results");
    if (results) results.innerHTML = searchHtml(query);
  }

  function backButton() {
    return `<button type="button" data-back>Back</button>`;
  }

  function viaLine() {
    const { params } = parseHash();
    const via = params.get("via");
    const from = params.get("from");
    if (!via || !from) return "";
    const exhibition = exhibitionById(via);
    const fromPerson = personById(from);
    const title = exhibition ? short(decodeDisplayText(exhibition.title), 72) : "a documented exhibition";
    const fromName = fromPerson ? fromPerson.name : "Previous artist";
    return `<span class="path"><button type="button" data-back>${esc(fromName)}</button><span aria-hidden="true"> / </span><button type="button" data-event="${esc(via)}">${esc(title)}</button></span><span class="via">You came here through ${esc(title)}.</span>`;
  }

  function renderArtist(main, id, section) {
    const person = personById(id);
    if (!person) {
      main.innerHTML = `<article class="page"><h1>Artist not in this pilot.</h1></article>`;
      return;
    }
    if (mapFor !== id) {
      mapFor = id;
      mapDepth = 1;
    }
    const claimed = isClaimed(id);
    const born = person.birthVerified && person.birthYear ? `<p class="facts">Born ${esc(person.birthYear)}</p>` : "";
    const demo = person.demo ? `<p class="demo">DEMO · pilot only. This is not an identity check.</p>` : "";
    const claim = claimed
      ? `<p class="facts">Prototype claim. Identity is not verified in this demo.</p><p class="quiet-link"><button type="button" data-go="/artist/${esc(id)}/add">Add exhibition</button> · <button type="button" data-go="/artist/${esc(id)}/correct">Suggest correction</button></p>`
      : `<p class="quiet-link"><button type="button" data-claim="${esc(id)}">Claim this page</button></p>`;
    const tab = section || "history";
    main.innerHTML = `<article class="page">
      <p class="crumbs">${backButton()}${viaLine()}</p>
      ${demo}
      <h1 class="artist-name">${esc(person.name)}</h1>
      ${person.korean ? `<p class="native">${esc(person.korean)}</p>` : ""}
      ${born}
      ${claim}
      ${notice ? `<p class="facts">${esc(notice)}</p>` : ""}
      <nav class="tabs" aria-label="Artist">
        ${tabLink(id, "history", "History", tab)}
        ${tabLink(id, "connections", "Connections", tab)}
        ${tabLink(id, "works", "Works", tab)}
        ${tabLink(id, "about", "About", tab)}
      </nav>
      ${tab === "connections" ? connectionsHtml(person) : tab === "works" ? worksHtml() : tab === "about" ? aboutHtml(person) : tab === "add" ? addHtml(person) : tab === "correct" ? correctHtml(person) : historyHtml(person)}
      <aside class="debug-only"${document.body.classList.contains("debug") ? "" : " aria-hidden=\"true\""}>
        <p>id ${esc(person.id)}</p>
        <p>identity ${esc(person.identityStatus)}</p>
        <p>bucket ${esc(person.bucket)}</p>
        <p>qid ${esc(person.qid || "none")}</p>
        <p>documented ${esc(person.count)}</p>
      </aside>
    </article>`;
    notice = "";
    if ((section || "history") === "history") maybeJourney(person);
  }

  function tabLink(id, name, label, current) {
    const href = name === "history" ? `/artist/${id}` : `/artist/${id}/${name}`;
    const on = current === name || (name === "history" && current === "add") || (name === "history" && current === "correct");
    return `<a href="#${href}" ${on ? 'aria-current="page"' : ""}>${label}</a>`;
  }

  function historyHtml(person) {
    const life = career(person);
    if (!life.dated.length && !life.undated.length) {
      const next = isClaimed(person.id)
        ? `<button type="button" data-go="/artist/${esc(person.id)}/add">Add your first exhibition</button>`
        : `<button type="button" data-claim="${esc(person.id)}">${EMPTY_HELP}</button>`;
      return `<section><p>${EMPTY_HISTORY}</p><p class="quiet-link">${next}</p></section>`;
    }
    if (!life.dated.length) {
      return `<section><p class="quiet">Date not recorded</p>${life.undated.map((event) => `<button type="button" class="result" data-event="${esc(event.id)}"><span>${textOf(event.title)}</span><span class="meta">Date not recorded</span></button>`).join("")}</section>`;
    }
    const groups = yearGroups(life.dated);
    const view = timelineView(groups);
    const visibleGroups = groups.filter((group) => group.year >= view.start && group.year <= view.end);
    const axisTop = 78;
    const dots = visibleGroups.map((group) => {
      const span = Math.max(1, view.end - view.start);
      const fraction = view.start === view.end ? 0.5 : (group.year - view.start) / span;
      const left = `clamp(0px, calc(${(fraction * 100).toFixed(2)}% - 7px), calc(100% - 14px))`;
      const precision = group.marks.every((mark) => mark === "filled") ? "month or day recorded" : group.marks.every((mark) => mark === "open") ? "year only" : "mixed precision";
      const label = `${group.year}, ${group.count} documented exhibition${group.count === 1 ? "" : "s"}, ${precision}`;
      const single = group.count === 1 ? ` data-event="${esc(group.ids[0])}"` : "";
      const count = group.count > 4 ? `<span class="more">${group.count}</span>` : "";
      return `<button type="button" class="cluster${view.focus === group.year ? " is-on" : ""}" style="left:${left};top:${axisTop}px" data-year="${group.year}"${single} aria-label="${esc(label)}"><span class="stack" aria-hidden="true">${pipsHtml(group)}</span>${count}</button>`;
    }).join("");
    const addedLine = life.addedCount ? `<p class="facts">${life.addedCount} added in this browser. Documented count stays ${life.officialCount}.</p>` : "";
    const reviews = reviewEvents(person);
    const reviewHtml = reviews.length ? `<section><h2 class="section-title">Needs review</h2><p class="quiet">These are not on the timeline.</p>${reviews.map((event) => `<p>${textOf(event.title)} · ${esc(event.reviewReason || "Ambiguous match.")}</p>`).join("")}</section>` : "";
    const undatedHtml = life.undated.map((event) => `<button type="button" class="result" data-event="${esc(event.id)}"><span>${textOf(event.title)}</span><span class="meta">Date not recorded</span></button>`).join("");
    const context = view.level === "DECADE" ? `<p class="quiet">Showing ${view.start}–${view.end}. The documented career runs ${view.first}–${view.last}.</p>` : "";
    return `<section class="history-block">
      <div class="zoom" role="group" aria-label="Timeline detail">
        <button type="button" data-zoom-level="all" aria-pressed="${view.level === "ALL" ? "true" : "false"}">All</button>
        <button type="button" data-zoom-level="decade" aria-pressed="${view.level === "DECADE" ? "true" : "false"}">Decade</button>
        <button type="button" data-zoom-level="year" aria-pressed="${view.level === "YEAR" ? "true" : "false"}">Year</button>
      </div>
      <div class="career-meta">
        <div>${signatureHtml(person.demo ? historySignature(life.dated.map((event) => event.start || "")) : person.signature)}<span class="sr">History signature, ${life.officialCount} documented exhibitions, ${view.first} to ${view.last}</span>
          <p>${life.officialCount} documented exhibition${life.officialCount === 1 ? "" : "s"}</p>
          <p class="quiet">${esc(view.first)} – ${esc(view.last)}</p>
        </div>
      </div>
      ${addedLine}
      ${context}
      <div class="track-wrap" style="height:132px">
        <div class="axis" style="top:${axisTop}px"></div>
        <span class="ymin">${esc(view.start)}</span>
        <span class="ymax">${esc(view.end)}</span>
        ${dots}
      </div>
      <p class="legend">Open circles are year-only. Filled circles include a month or a day. A number is the count for that year.</p>
      ${branchHtml(groups, view)}
      <div class="vertical">${verticalYears(view.level === "DECADE" ? visibleGroups : groups, view)}</div>
      ${undatedHtml ? `<div class="undated-list"><h2 class="section-title">Date not recorded</h2>${undatedHtml}</div>` : ""}
      ${reviewHtml}
    </section>`;
  }

  function pipsHtml(group) {
    return group.marks.slice(0, group.visible).map((mark) => `<i class="pip${mark === "open" ? " open" : ""}"></i>`).join("");
  }

  function branchHtml(groups, view) {
    if (!view.focus) return `<div class="moment-slot"></div>`;
    const group = groups.find((item) => item.year === view.focus);
    if (!group) return `<div class="moment-slot"></div>`;
    const selected = parseHash().params.get("event");
    const items = group.ids.map((id) => {
      const event = exhibitionById(id);
      if (!event) return "";
      const place = placeBits(event).join(" · ");
      return `<button type="button" class="branch-item${selected === id ? " is-on" : ""}" data-event="${esc(id)}"><i class="pip${isOpenDot(event) ? " open" : ""}" aria-hidden="true"></i><span><strong>${textOf(event.title)}</strong>${place ? `<span class="native">${esc(place)}</span>` : ""}</span></button>`;
    }).join("");
    return `<div class="branch" id="year-${group.year}">
      <p class="kicker">${group.year}</p>
      <p>${group.count} documented exhibition${group.count === 1 ? "" : "s"}</p>
      <div class="branch-list">${items}</div>
      <div class="moment-slot"></div>
    </div>`;
  }

  function verticalYears(groups, view) {
    const selected = parseHash().params.get("event");
    return groups.map((group) => {
      const open = view.focus === group.year;
      const items = open ? group.ids.map((id) => {
        const event = exhibitionById(id);
        if (!event) return "";
        const place = placeBits(event).join(" · ");
        return `<button type="button" class="branch-item${selected === id ? " is-on" : ""}" data-event="${esc(id)}"><i class="pip${isOpenDot(event) ? " open" : ""}" aria-hidden="true"></i><span><strong>${textOf(event.title)}</strong>${place ? `<span class="native">${esc(place)}</span>` : ""}</span></button>`;
      }).join("") : "";
      const precision = group.marks.every((mark) => mark === "open") ? "year only" : "dated";
      const noun = group.count === 1 ? "exhibition" : "exhibitions";
      return `<div class="v-year${open ? " is-open" : ""}">
        <button type="button" class="year-head" data-year="${group.year}" aria-expanded="${open ? "true" : "false"}" aria-label="${group.year}, ${group.count} documented ${noun}, ${precision}">
          <span>${group.year}</span>
          <span class="stack" aria-hidden="true">${pipsHtml(group)}</span>
          <span class="v-count">${group.count}</span>
        </button>
        ${open ? `<div class="branch-list">${items}</div>` : ""}
      </div>`;
    }).join("");
  }

  function connectionsHtml(person) {
    const shares = new Map();
    C.exhibitions.forEach((exhibition) => {
      if (!exhibition.artistIds.includes(person.id)) return;
      exhibition.artistIds.forEach((id) => {
        if (id === person.id) return;
        shares.set(id, (shares.get(id) || []).concat(exhibition.id));
      });
    });
    addedEvents(person).forEach((exhibition) => {
      exhibition.artistIds.forEach((id) => {
        if (id === person.id) return;
        shares.set(id, (shares.get(id) || []).concat(exhibition.id));
      });
    });
    const artists = [...shares.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    const spaces = new Map();
    career(person).dated.concat(career(person).undated).forEach((exhibition) => {
      if (!exhibition.venue) return;
      const key = exhibition.spaceId || compact(exhibition.venue);
      const current = spaces.get(key) || { name: exhibition.venue, ids: [], spaceId: exhibition.spaceId };
      current.ids.push(exhibition.id);
      spaces.set(key, current);
    });
    const artistHtml = artists.length ? artists.map(([id, ids]) => {
      const other = personById(id);
      if (!other) return "";
      const rows = ids.slice(0, 4).map((exhibitionId) => {
        const exhibition = exhibitionById(exhibitionId);
        return exhibition ? `<button type="button" class="result" data-event="${esc(exhibition.id)}"><span>${esc(exhibition.title)}</span><span class="meta">${esc(exhibition.when)}</span></button>` : "";
      }).join("");
      return `<article><h3><button type="button" class="inline" data-go="${artistHref(id, ids[0])}">${esc(other.name)}</button></h3><p class="quiet">${esc(other.korean || "")}</p><p>${esc(sharedPhrase(ids.length))}</p>${rows}</article>`;
    }).join("") : `<p>No other pilot artist is named on the same accepted exhibition.</p>`;
    const spaceHtml = [...spaces.values()].sort((a, b) => b.ids.length - a.ids.length).slice(0, 12).map((space) => {
      const href = space.spaceId ? `/space/${space.spaceId}` : "";
      const name = href ? `<button type="button" class="inline" data-go="${href}">${esc(space.name)}</button>` : esc(space.name);
      return `<p>${name} · ${space.ids.length} documented</p>`;
    }).join("") || `<p>No space is named on the accepted records.</p>`;
    return `<section>
      <div class="mode">
        <button type="button" data-mode="list" aria-pressed="${mapDepth === 1 ? "true" : "false"}">List</button>
        <button type="button" data-mode="map" aria-pressed="${mapDepth > 1 ? "true" : "false"}">Map</button>
      </div>
      ${mapDepth > 1 ? mapHtml(person) : ""}
      <h2 class="section-title">Artists</h2>
      ${artistHtml}
      <h2 class="section-title">Spaces</h2>
      ${spaceHtml}
      <h2 class="section-title">Curators</h2>
      ${curatorHtml(person)}
    </section>`;
  }

  function curatorHtml(person) {
    const names = new Map();
    career(person).dated.concat(career(person).undated).forEach((exhibition) => {
      exhibition.curators.forEach((name) => names.set(name, (names.get(name) || 0) + 1));
    });
    if (!names.size) return `<p>No curator is named on the accepted records for this artist.</p>`;
    return [...names.entries()].map(([name, count]) => {
      const curator = C.curators.find((item) => item.name === name);
      const button = curator ? `<button type="button" class="inline" data-go="/curator/${esc(curator.id)}">${esc(name)}</button>` : esc(name);
      return `<p>${button} · ${count} documented</p>`;
    }).join("");
  }

  function mapHtml(person) {
    const events = (person.exhibitionIds || []).map(exhibitionById).filter(Boolean).sort((a, b) => (b.year || -1) - (a.year || -1) || a.title.localeCompare(b.title));
    const depth = mapDepth >= 3 ? 2 : 1;
    const ring = events.slice(0, depth === 1 ? 4 : 8);
    const nodes = [{ id: person.id, kind: "artist", label: person.name }];
    const edges = [];
    const seen = new Set([person.id]);
    let truncated = events.length > ring.length;
    function add(node, from) {
      if (!seen.has(node.id) && nodes.length >= 12) {
        truncated = true;
        return false;
      }
      if (!seen.has(node.id)) {
        seen.add(node.id);
        nodes.push(node);
      }
      edges.push({ from, to: node.id });
      return true;
    }
    ring.forEach((exhibition) => {
      if (!add({ id: exhibition.id, kind: "exhibition", label: exhibition.title }, person.id)) return;
      if (depth < 2) return;
      if (exhibition.spaceId && exhibition.venue) add({ id: exhibition.spaceId, kind: "space", label: exhibition.venue }, exhibition.id);
      exhibition.artistIds.forEach((id) => {
        if (id === person.id) return;
        const other = personById(id);
        if (other) add({ id, kind: "artist", label: other.name }, exhibition.id);
      });
    });
    const width = 640;
    const height = 420;
    const pos = new Map();
    pos.set(nodes[0].id, { x: 320, y: 210 });
    nodes.slice(1).forEach((node, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / Math.max(1, nodes.length - 1);
      pos.set(node.id, { x: 320 + Math.cos(angle) * 210, y: 210 + Math.sin(angle) * 150 });
    });
    const lines = edges.map((edge) => {
      const from = pos.get(edge.from);
      const to = pos.get(edge.to);
      if (!from || !to) return "";
      return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line>`;
    }).join("");
    const buttons = nodes.map((node) => {
      const point = pos.get(node.id);
      let href = "";
      if (node.kind === "artist" && node.id !== person.id) {
        const via = edges.find((edge) => edge.to === node.id);
        href = artistHref(node.id, via && via.from !== person.id ? via.from : "");
      } else if (node.kind === "exhibition") href = `/exhibition/${node.id}`;
      else if (node.kind === "space") href = `/space/${node.id}`;
      const style = `left:${(point.x / width) * 100}%;top:${(point.y / height) * 100}%`;
      if (!href) return `<span class="map-node" style="${style}">${esc(short(node.label, 42))}</span>`;
      return `<button type="button" class="map-node" style="${style}" data-go="${href}">${esc(short(node.label, 42))}</button>`;
    }).join("");
    const more = depth === 1 ? `<p class="quiet-link"><button type="button" data-action="map-more">Show the next exhibitions</button></p>` : "";
    return `<div class="map"><svg viewBox="0 0 ${width} ${height}" aria-hidden="true">${lines}</svg>${buttons}</div>
      <p class="quiet">${truncated ? "This map shows a local circle, not every record." : "Local circle of documented links."}</p>${more}`;
  }

  function worksHtml() {
    return `<section><h2 class="section-title">Works</h2><p>Works are not collected from other websites.</p><p>A claimed artist will be able to add works in a later version of this pilot. This version accepts exhibitions only.</p></section>`;
  }

  function aboutHtml(person) {
    const site = person.website && safeUrl(person.website) ? `<p><a href="${esc(safeUrl(person.website))}">Official website</a></p>` : person.website ? `<p>Official website · ${esc(person.website)}</p>` : "";
    const city = person.city ? `<p>${esc(person.city)}</p>` : "";
    const aliases = (person.aliases || []).slice(0, 12);
    const aliasHtml = aliases.length ? `<p>Names also recorded</p><p class="quiet">${aliases.map(esc).join(" · ")}</p>` : "";
    return `<section><h2 class="section-title">About</h2>${person.birthVerified && person.birthYear ? `<p>Born ${esc(person.birthYear)}</p>` : ""}${city}${site}${aliasHtml}<p>ROB keeps this page to names, dates, and exhibitions.</p></section>`;
  }

  function addHtml(person) {
    if (!isClaimed(person.id)) {
      return `<section><p>Claim this page before adding a record.</p><p class="quiet-link"><button type="button" data-claim="${esc(person.id)}">Claim this page</button></p></section>`;
    }
    return `<section><h2 class="section-title">${person.count || person.demo ? "Add to your history" : "Add your first exhibition"}</h2>
      <p class="quiet">Exhibition only. Unknown fields can stay empty. Nothing is invented.</p>
      <form id="add-form" class="form">
        ${field("title", "Exhibition title")}
        ${field("start", "Start date")}
        ${field("end", "End date")}
        <label class="field"><span>Date precision</span><select name="precision"><option value="DAY">Day</option><option value="MONTH">Month</option><option value="YEAR" selected>Year</option><option value="UNKNOWN">Unknown</option></select></label>
        ${field("venue", "Space")}
        ${field("city", "City")}
        ${field("country", "Country")}
        ${field("artists", "Participating artists")}
        ${field("curator", "Curator")}
        ${field("sourceUrl", "Source URL")}
        <label class="field"><span>Added by</span><select name="origin"><option value="ARTIST_SUBMITTED">Artist</option><option value="GALLERY_SUBMITTED">Gallery</option><option value="INSTITUTION_SUBMITTED">Institution</option></select></label>
        <p class="quiet">Prototype only. This does not sign you in.</p>
        <button class="submit" type="submit">Add exhibition</button>
      </form>
    </section>`;
  }

  function field(name, label) {
    return `<label class="field"><span>${esc(label)}</span><input name="${esc(name)}" autocomplete="off" /></label>`;
  }

  function correctHtml(person) {
    if (!isClaimed(person.id)) {
      return `<section><p>Claim this page before suggesting a correction.</p><p class="quiet-link"><button type="button" data-claim="${esc(person.id)}">Claim this page</button></p></section>`;
    }
    return `<section><h2 class="section-title">Suggest correction</h2>
      <p class="quiet">A note stays in this browser. The documented record is not rewritten.</p>
      <form id="correct-form" class="form">
        <label class="field"><span>Note</span><textarea name="note"></textarea></label>
        <button class="submit" type="submit">Save suggestion</button>
      </form>
    </section>`;
  }

  function renderExhibition(main, id) {
    const exhibition = exhibitionById(id);
    if (!exhibition) {
      main.innerHTML = `<article class="page"><h1>Exhibition not in this pilot.</h1></article>`;
      return;
    }
    const people = exhibition.artistIds.map((artistId) => personById(artistId)).filter(Boolean);
    const participants = people.map((person) => `<button type="button" class="result" data-go="${artistHref(person.id, exhibition.id)}"><span>${esc(person.name)}</span><span class="native">${esc(person.korean || "")}</span></button>`).join("");
    const recorded = (exhibition.recordedNames || []).map((name) => `<p>${esc(name)}</p>`).join("");
    const unresolved = (exhibition.reviewNames || []).map((name) => `<p>Needs review: ${esc(name)}</p>`).join("");
    const plainUnresolved = (exhibition.recordedNames || []).length && exhibition.local ? (exhibition.recordedNames || []).map((name) => `<p>Unresolved participant: ${esc(name)}</p>`).join("") : recorded;
    const title = decodeDisplayText(exhibition.title);
    const venueText = exhibition.venue ? decodeDisplayText(exhibition.venue) : "";
    const sameVenue = phrasesMatch(title, venueText);
    const space = sameVenue ? "" : exhibition.spaceId && venueText ? `<button type="button" class="inline" data-go="/space/${esc(exhibition.spaceId)}">${esc(venueText)}</button>` : venueText ? esc(venueText) : "Venue not recorded";
    const place = [exhibition.city ? decodeDisplayText(exhibition.city) : "", displayCountry(exhibition.country) || ""].filter(Boolean).join(" · ");
    const curators = exhibition.curators.length ? exhibition.curators.map((name) => {
      const curator = C.curators.find((item) => item.name === name);
      return curator ? `<button type="button" class="inline" data-go="/curator/${esc(curator.id)}">${esc(name)}</button>` : esc(name);
    }).join(", ") : "No curator is named on this record.";
    const label = provenanceFor(exhibition);
    const sources = sourceLinks(exhibition);
    main.innerHTML = `<article class="page">
      <p class="crumbs">${backButton()}</p>
      <p class="kicker">Exhibition</p>
      <h1>${esc(title)}</h1>
      <p>${esc(exhibition.when)}</p>
      ${space ? `<p>${space}</p>` : ""}
      ${place ? `<p class="quiet">${esc(place)}</p>` : ""}
      <p><button type="button" class="prov" data-prov="${esc(exhibition.id)}">${provIcon(label)} ${esc(label)}</button></p>
      <h2 class="section-title">Participants</h2>
      ${participants || "<p>No pilot artist is linked.</p>"}
      ${exhibition.local ? plainUnresolved : recorded}
      ${unresolved}
      <h2 class="section-title">Curator</h2>
      <p>${curators}</p>
      <h2 class="section-title">Sources</h2>
      ${sources || "<p>No source URL is stored on this record.</p>"}
      <h2 class="section-title">History context</h2>
      <p>Recorded in ${people.length} artist ${people.length === 1 ? "history" : "histories"} in this pilot.</p>
      <aside class="debug-only"${document.body.classList.contains("debug") ? "" : " aria-hidden=\"true\""}><p>id ${esc(exhibition.id)}</p><p>precision ${esc(exhibition.precision)}</p><p>origin ${esc(exhibition.origin || "ROB_RESEARCHED")}</p><p>sources ${exhibition.sources.length}</p></aside>
    </article>`;
  }

  function sourceLinks(exhibition) {
    const urls = exhibition.sources.map((source) => source.url);
    overlays(exhibition.id).forEach((event) => {
      if (event.sourceUrl) urls.push(event.sourceUrl);
    });
    return [...new Set(urls)].map((url) => {
      const href = safeUrl(url);
      return href ? `<p><a href="${esc(href)}">${esc(href)}</a></p>` : "";
    }).join("");
  }

  function renderSpace(main, id) {
    const space = C.spaces.find((item) => item.id === id);
    if (!space) {
      main.innerHTML = `<article class="page"><p class="crumbs">${backButton()}</p><h1>Space not in this pilot.</h1><p>Coverage is limited to venues named on accepted records.</p></article>`;
      return;
    }
    const locals = readStore().events.filter((event) => !event.attachedTo && event.verification !== "REVIEW_REQUIRED" && event.verification !== "CONFLICT" && compact(event.venue || "") === compact(space.name)).map(normalizeLocal);
    const items = space.exhibitionIds.map(exhibitionById).filter(Boolean).concat(locals);
    const groups = new Map();
    items.slice().sort((a, b) => (b.year || -1) - (a.year || -1) || a.id.localeCompare(b.id)).forEach((exhibition) => {
      const label = exhibition.year ? String(exhibition.year) : "Date not recorded";
      groups.set(label, (groups.get(label) || []).concat(exhibition));
    });
    const strata = [...groups.entries()].map(([label, rows]) => `<section class="strata"><h3>${esc(label)}</h3>${rows.map((exhibition) => {
      const names = exhibition.artistIds.map((artistId) => personById(artistId)).filter(Boolean).map((person) => person.name).join(", ");
      const shownTitle = textOf(exhibition.title);
      return `<p><button type="button" class="inline" data-go="/exhibition/${esc(exhibition.id)}">${shownTitle}</button></p><p class="quiet">${esc(names || "Artists not linked")}${exhibition.local ? " · Added in this browser" : ""}</p>`;
    }).join("")}</section>`).join("");
    const where = [space.city ? decodeDisplayText(space.city) : "", displayCountry(space.country) || ""].filter(Boolean).join(" · ");
    main.innerHTML = `<article class="page">
      <p class="crumbs">${backButton()}</p>
      <p class="kicker">Space</p>
      <h1>${esc(space.name)}</h1>
      ${where ? `<p>${esc(where)}</p>` : ""}
      <p class="quiet">${space.exhibitionIds.length} documented exhibition${space.exhibitionIds.length === 1 ? "" : "s"} in this pilot.</p>
      ${strata || "<p>No dated layer is recorded.</p>"}
    </article>`;
  }

  function renderCurator(main, id) {
    const curator = C.curators.find((item) => item.id === id);
    if (!curator) {
      main.innerHTML = `<article class="page"><p class="crumbs">${backButton()}</p><p class="kicker">Curators</p><h1>No curator names were accepted with these exhibition records.</h1><p>A curator page is added only when a record names one.</p></article>`;
      return;
    }
    const rows = curator.exhibitionIds.map(exhibitionById).filter(Boolean).map((exhibition) => `<button type="button" class="result" data-go="/exhibition/${esc(exhibition.id)}"><span>${esc(exhibition.title)}</span><span class="meta">${esc(exhibition.when)}</span></button>`).join("");
    main.innerHTML = `<article class="page"><p class="crumbs">${backButton()}</p><p class="kicker">Curator</p><h1>${esc(curator.name)}</h1>${rows}</article>`;
  }

  function renderExplore(main) {
    const { params } = parseHash();
    const decade = params.get("decade") || "";
    const city = params.get("city") || "";
    const country = params.get("country") || "";
    const artists = C.artists.map((artist) => `<a href="#/artist/${esc(artist.id)}"><span><strong>${esc(artist.name)}</strong><span class="native">${esc(artist.korean)}</span></span><span class="meta">${signatureHtml(artist.signature)}<span class="sr">${artist.count} documented exhibitions</span><span>${artist.count} documented</span></span></a>`).join("");
    const decades = `<button type="button" data-decade="" aria-pressed="${decade ? "false" : "true"}">All years</button>${C.explore.decades.map((item) => `<button type="button" data-decade="${item}" aria-pressed="${String(item) === decade ? "true" : "false"}">${item}s</button>`).join("")}`;
    const cities = `<button type="button" data-city="" aria-pressed="${city ? "false" : "true"}">All cities</button>${C.explore.cities.slice(0, 8).map((item) => `<button type="button" data-city="${esc(item.name)}" aria-pressed="${item.name === city ? "true" : "false"}">${esc(item.name)}</button>`).join("")}`;
    const countryCounts = new Map();
    C.exhibitions.forEach((exhibition) => {
      const name = displayCountry(exhibition.country);
      if (!name) return;
      countryCounts.set(name, (countryCounts.get(name) || 0) + 1);
    });
    const countryOptions = [...countryCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
    const countries = `<button type="button" data-country="" aria-pressed="${country ? "false" : "true"}">All countries</button>${countryOptions.map((item) => `<button type="button" data-country="${esc(item[0])}" aria-pressed="${item[0] === country ? "true" : "false"}">${esc(item[0])}</button>`).join("")}`;
    const filtered = C.exhibitions.filter((exhibition) => {
      if (decade && String(exhibition.decade) !== decade) return false;
      if (city && exhibition.city !== city) return false;
      if (country && displayCountry(exhibition.country) !== country) return false;
      return true;
    });
    const slice = filtered.slice(0, shown);
    const rows = slice.map((exhibition) => `<button type="button" class="result" data-go="/exhibition/${esc(exhibition.id)}"><span>${textOf(exhibition.title)}</span><span class="meta">${esc([exhibition.year, exhibition.city ? decodeDisplayText(exhibition.city) : ""].filter(Boolean).join(" · "))}</span></button>`).join("");
    const more = filtered.length > slice.length ? `<p class="quiet-link"><button type="button" data-more="1">Show more</button></p>` : "";
    const repeated = C.spaces.filter((space) => space.exhibitionIds.length >= 2).slice(0, 12);
    const once = C.spaces.filter((space) => space.exhibitionIds.length === 1).length;
    const spaceRows = repeated.map((space) => `<a href="#/space/${esc(space.id)}"><span><strong>${esc(space.name)}</strong><span class="native">${esc([space.city, space.country].filter(Boolean).join(" · "))}</span></span><span class="meta">${space.exhibitionIds.length} documented</span></a>`).join("");
    main.innerHTML = `<article class="page">
      <header class="page-head"><p class="kicker">Explore</p><h1>Artists, exhibitions, spaces.</h1></header>
      <section><h2 class="section-title">Artists</h2><div class="directory">${artists}</div></section>
      <section><h2 class="section-title">Exhibitions</h2>
        <div class="filters" aria-label="Decades">${decades}</div>
        <div class="filters" aria-label="Cities">${cities}</div>
        <div class="filters" aria-label="Countries">${countries}</div>
        ${rows || "<p>No documented exhibition matches this view.</p>"}
        ${more}
      </section>
      <section><h2 class="section-title">Spaces</h2><div class="directory">${spaceRows}</div><p class="quiet">${once} spaces are recorded once. Open an exhibition to reach them.</p></section>
    </article>`;
  }

  function renderRankings(main) {
    const blocks = C.rankings.map((item) => `<article class="ranking"><h2>${esc(item.title)}</h2><p>Coming from verified data</p><p class="quiet">${esc(item.reason)}</p></article>`).join("");
    main.innerHTML = `<article class="page"><header class="page-head"><p class="kicker">Rankings</p><h1>Lists that wait for verified facts.</h1><p class="lede">ROB does not score artistic quality.</p></header>${blocks}</article>`;
  }

  function renderNow(main) {
    const current = C.now.currentIds.map(exhibitionById).filter(Boolean);
    const recent = C.now.recentIds.map(exhibitionById).filter(Boolean);
    const list = (rows) => rows.map((exhibition) => `<button type="button" class="result" data-go="/exhibition/${esc(exhibition.id)}"><span>${esc(exhibition.title)}</span><span class="meta">${esc(exhibition.when)}</span></button>`).join("");
    const asOf = C.asOf === "2026-10-08" ? "8 October 2026" : C.asOf;
    main.innerHTML = `<article class="page">
      <header class="page-head"><p class="kicker">Now</p><h1>What is happening in art, when a date says so.</h1></header>
      <h2 class="section-title">Current</h2>
      ${current.length ? list(current) : `<p>No exhibition in this pilot has a month or day that includes ${esc(asOf)}.</p>`}
      <h2 class="section-title">Recently dated</h2>
      ${recent.length ? list(recent) : "<p>No month or day in 2025–2026 is recorded outside the current range.</p>"}
    </article>`;
  }

  function renderAbout(main) {
    main.innerHTML = `<article class="page"><header class="page-head"><p class="kicker">About</p><h1>Search an artist. See their journey.</h1></header>
      <p class="lede">ROB is a way to walk through exhibition history. One artist, one history, and the documented exhibitions that connect people and spaces.</p>
      <p>Records in this prototype stay in the pilot. They are not cleared for the live ROB site.</p>
    </article>`;
  }

  function renderStart(main, step) {
    if (step === "new") {
      const name = parseHash().params.get("name") || "";
      main.innerHTML = `<article class="page"><header class="page-head"><p class="kicker">Start your history</p><h1>Create an artist record.</h1></header>
        <p class="quiet">This stays in this browser. It does not create a ROB account. Mark the record DEMO.</p>
        <form id="create-form" class="form">
          ${field("name", "Artist name")}
          ${field("korean", "Native name")}
          ${field("birthYear", "Birth year")}
          ${field("city", "City")}
          ${field("website", "Official website")}
          <button class="submit" type="submit">Continue</button>
        </form>
      </article>`;
      const input = main.querySelector('input[name="name"]');
      if (input && name) input.value = name;
      return;
    }
    main.innerHTML = `<article class="page"><header class="page-head"><p class="kicker">Start your history</p><h1>Search yourself.</h1></header>
      <p class="quiet">This stays in this browser. It does not create a ROB account.</p>
      <label class="sr" for="self">Search yourself</label>
      <input id="self" class="hero-search" type="search" placeholder="Search an artist..." autocomplete="off" />
      <div id="self-results"></div>
      <p class="artist-link"><button type="button" data-go="/start/new">Can't find yourself? Create an artist record</button></p>
    </article>`;
  }

  function renderMissing(main) {
    main.innerHTML = `<article class="page"><h1>This page is not in the pilot.</h1><p class="quiet-link"><button type="button" data-go="/">Search an artist</button></p></article>`;
  }

  function render() {
    const { parts } = parseHash();
    const main = document.querySelector("#main");
    const artistId = parts[0] === "artist" ? parts[1] : "";
    if (artistId !== journeyArtist) journeyKey = "";
    if (parts[0] !== "artist") {
      const overlay = document.querySelector("#journey");
      if (overlay) overlay.hidden = true;
      document.body.classList.remove("traveling");
    }
    setNav(parts);
    applyTitle(parts);
    if (!parts.length) renderHome(main);
    else if (parts[0] === "explore") renderExplore(main);
    else if (parts[0] === "rankings") renderRankings(main);
    else if (parts[0] === "now") renderNow(main);
    else if (parts[0] === "about") renderAbout(main);
    else if (parts[0] === "start") renderStart(main, parts[1] || "");
    else if (parts[0] === "artist" && parts[1]) renderArtist(main, parts[1], parts[2] || "history");
    else if (parts[0] === "exhibition" && parts[1]) renderExhibition(main, parts[1]);
    else if (parts[0] === "space" && parts[1]) renderSpace(main, parts[1]);
    else if (parts[0] === "curator") renderCurator(main, parts[1] || "");
    else if (parts[0] === "curators") renderCurator(main, "");
    else renderMissing(main);
    syncMoment();
  }

  function hideMoment() {
    const moment = document.querySelector("#moment");
    moment.hidden = true;
    moment.innerHTML = "";
    moment.dataset.prov = "";
    document.querySelector("#scrim").hidden = true;
    document.body.classList.remove("modal-open");
    document.body.classList.remove("panel-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  function syncMoment() {
    const { params } = parseHash();
    const eventId = params.get("event");
    const cluster = params.get("cluster");
    const moment = document.querySelector("#moment");
    const slot = document.querySelector(".moment-slot");
    const desktop = window.matchMedia("(min-width: 721px)").matches;
    if (!eventId && !cluster) {
      if (slot) slot.innerHTML = "";
      document.body.classList.remove("panel-open");
      if (!moment.hidden) hideMoment();
      else moment.innerHTML = "";
      return;
    }
    const markup = cluster && !eventId ? clusterMarkup(cluster.split(",").filter(Boolean)) : momentMarkup(eventId);
    document.body.classList.add("panel-open");
    if (desktop && slot && eventId) {
      slot.innerHTML = `<div class="moment-card">${markup}</div>`;
      moment.hidden = true;
      moment.innerHTML = "";
      document.querySelector("#scrim").hidden = true;
      moment.setAttribute("aria-modal", "false");
      return;
    }
    const wasHidden = moment.hidden;
    if (wasHidden) lastFocus = document.activeElement;
    moment.hidden = false;
    moment.setAttribute("aria-modal", desktop ? "false" : "true");
    document.querySelector("#scrim").hidden = desktop;
    moment.innerHTML = markup;
    if (wasHidden) {
      const close = moment.querySelector("[data-action='close-moment']");
      if (close) close.focus();
    }
  }

  function clusterMarkup(ids) {
    const rows = ids.map(exhibitionById).filter(Boolean);
    const year = rows[0] && rows[0].year ? rows[0].year : "These records";
    return `<button type="button" class="text-button" data-action="close-moment">Close</button>
      <p class="kicker">Year</p>
      <h2 id="moment-title">${esc(year)}</h2>
      <p class="quiet">${rows.length} recorded exhibitions share this position.</p>
      ${rows.map((exhibition) => `<button type="button" class="result" data-event="${esc(exhibition.id)}"><span>${textOf(exhibition.title)}</span><span class="meta">${esc(exhibition.when)}</span></button>`).join("")}`;
  }

  function paintCluster(ids) {
    const rows = ids.map(exhibitionById).filter(Boolean);
    const year = rows[0] && rows[0].year ? rows[0].year : "These records";
    document.querySelector("#moment").innerHTML = `<button type="button" class="text-button" data-action="close-moment">Close</button>
      <p class="kicker">Year</p>
      <h2 id="moment-title">${esc(year)}</h2>
      <p class="quiet">${rows.length} recorded exhibitions share this position. An open circle is a year, not a month.</p>
      ${rows.map((exhibition) => `<button type="button" class="result" data-event="${esc(exhibition.id)}"><span>${esc(exhibition.title)}</span><span class="meta">${esc(exhibition.venue || exhibition.when)}</span></button>`).join("")}`;
  }

  function momentMarkup(id) {
    const exhibition = exhibitionById(id);
    if (!exhibition) return `<button type="button" class="text-button" data-action="close-moment">Close</button><h2 id="moment-title">Record not found.</h2>`;
    if (momentFor !== id) {
      momentFor = id;
      momentExpanded = false;
    }
    const lines = momentPlaceView(exhibition);
    const label = provenanceFor(exhibition);
    const opened = document.querySelector("#moment").dataset.prov === id;
    const picture = momentPicture(exhibition, momentExpanded);
    const extraArtists = (exhibition.recordedNames || []).map((name) => `<p class="quiet">${exhibition.local ? "Unresolved participant" : "Also recorded"}: ${esc(decodeDisplayText(name))}</p>`).join("");
    const review = (exhibition.reviewNames || []).map((name) => `<p class="quiet">Needs review: ${esc(name)}</p>`).join("");
    const conflict = overlays(exhibition.id).filter((event) => event.verification === "CONFLICT").map((event) => `<p>Submitted date ${esc(event.conflictNote || event.start || "")}. The documented date is unchanged.</p>`).join("");
    return `<button type="button" class="text-button" data-action="close-moment">Close</button>
      <h2 id="moment-title">${esc(lines.title)}</h2>
      <p>${esc(exhibition.when)}</p>
      ${lines.place ? `<p>${esc(lines.place)}</p>` : ""}
      ${picture}
      ${extraArtists}${review}
      <p><button type="button" class="prov" data-prov="${esc(exhibition.id)}" aria-expanded="${opened ? "true" : "false"}">${provIcon(label)} ${esc(label)}</button></p>
      ${opened ? evidenceHtml(exhibition) : ""}
      ${conflict}
      <p class="quiet-link"><button type="button" data-go="/exhibition/${esc(exhibition.id)}">Open exhibition</button></p>`;
  }

  function momentPlaceView(exhibition) {
    const title = decodeDisplayText(exhibition.title).trim();
    const venue = exhibition.venue ? decodeDisplayText(exhibition.venue).trim() : "";
    const city = exhibition.city ? decodeDisplayText(exhibition.city).trim() : "";
    const country = displayCountry(exhibition.country) || "";
    const parts = [phrasesMatch(title, venue) ? "" : venue, city, country].filter(Boolean);
    return { title: title, place: parts.length ? parts.join(" · ") : "" };
  }

  function momentPicture(exhibition, expanded) {
    const current = currentArtistId();
    const artists = [];
    exhibition.artistIds.forEach((artistId) => {
      if (artistId === current) return;
      const person = personById(artistId);
      if (person) artists.push({ label: person.name, go: artistHref(person.id, exhibition.id) });
    });
    const same = phrasesMatch(exhibition.title, exhibition.venue);
    const space = exhibition.spaceId && exhibition.venue ? { label: same ? (exhibition.city ? decodeDisplayText(exhibition.city) : "Space") : decodeDisplayText(exhibition.venue), go: `/space/${exhibition.spaceId}` } : null;
    const curator = exhibition.curators[0] ? { label: decodeDisplayText(exhibition.curators[0]), go: "/curators" } : null;
    const reserve = (space ? 1 : 0) + (curator ? 1 : 0);
    const room = Math.max(0, 7 - reserve);
    const shownArtists = expanded ? artists : artists.slice(0, room);
    const hidden = Math.max(0, artists.length - shownArtists.length);
    const nodes = shownArtists.slice();
    if (space && !same) nodes.push(space);
    else if (space && !shownArtists.length) nodes.push(space);
    if (curator) nodes.push(curator);
    const more = hidden ? `<p class="quiet-link"><button type="button" data-action="more-artists">+ ${hidden} artists</button></p>` : "";
    if (!nodes.length) return `<p class="quiet">No other documented artist is on this record.</p>${more}`;
    if (nodes.length === 1) return `<div class="stem"><span class="hub" aria-hidden="true"></span><button type="button" class="sat" data-go="${nodes[0].go}">${esc(nodes[0].label)}</button></div>${more}`;
    const slots = nodes.map((node, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / nodes.length;
      return Object.assign({}, node, { x: 50 + Math.cos(angle) * 34, y: 50 + Math.sin(angle) * 34 });
    });
    const lines = slots.map((node) => `<line x1="50" y1="50" x2="${node.x}" y2="${node.y}"></line>`).join("");
    const buttons = slots.map((node) => `<button type="button" class="sat" style="left:${node.x}%;top:${node.y}%" data-go="${node.go}">${esc(short(node.label, 48))}</button>`).join("");
    return `<div class="orbit"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg><span class="hub" style="left:50%;top:50%" aria-hidden="true"></span>${buttons}</div>${more}`;
  }

  function paintEvent(id) {
    document.querySelector("#moment").innerHTML = momentMarkup(id);
  }

  function evidenceHtml(exhibition) {
    const blocks = [];
    if (exhibition.local) {
      blocks.push(`<p>Origin · ${esc(originWord(exhibition.origin))}</p><p>Verification · ${esc(verificationWord(exhibition.verification))}</p>`);
    } else {
      blocks.push(`<p>Origin · ROB researched</p><p>Verification · ${esc(verificationWord(overlays(exhibition.id).some((event) => event.verification === "CONFLICT") ? "CONFLICT" : "OFFICIAL_SOURCE"))}</p>`);
      if (uncertainDisplay(exhibition.title) || uncertainDisplay(exhibition.venue) || uncertainDisplay(exhibition.city)) blocks.push("<p>Data under review</p>");
      overlays(exhibition.id).forEach((event) => {
        blocks.push(`<p>Origin · ${esc(originWord(event.origin))}</p><p>Verification · ${esc(verificationWord(event.verification))}</p>`);
      });
    }
    const links = [];
    exhibition.sources.forEach((source) => {
      const href = safeUrl(source.url);
      if (!href) return;
      links.push(`<p><a href="${esc(href)}">${esc(href)}</a></p>${source.retrievedAt ? `<p class="quiet">Retrieved ${esc(String(source.retrievedAt).slice(0, 10))}</p>` : ""}`);
    });
    return `<section class="evidence">${blocks.join("")}${links.join("")}<p class="quiet">This describes the record's evidence, not an artistic endorsement.</p></section>`;
  }

  function replaceQuery(mutate, keepScroll) {
    const { parts, params } = parseHash();
    mutate(params);
    const query = params.toString();
    history.replaceState({ entry: true }, "", `${location.pathname}${location.search}#/${parts.join("/")}${query ? `?${query}` : ""}`);
    render();
    if (!keepScroll) window.scrollTo(0, 0);
  }

  function openMoment(id) {
    const exhibition = exhibitionById(id);
    replaceQuery((params) => {
      params.set("event", id);
      params.delete("cluster");
      if (params.get("zoom") !== "decade") params.set("zoom", "year");
      if (exhibition && exhibition.year) params.set("focus", String(exhibition.year));
    }, true);
  }

  function openCluster(ids) {
    const { parts, params } = parseHash();
    params.delete("event");
    params.set("cluster", ids);
    const query = params.toString();
    history.replaceState({ entry: Boolean(history.state && history.state.entry) }, "", `${location.pathname}${location.search}#/${parts.join("/")}?${query}`);
    syncMoment();
  }

  function closeMoment() {
    replaceQuery((params) => {
      params.delete("event");
      params.delete("cluster");
    }, true);
    hideMoment();
  }

  function openYear(year) {
    replaceQuery((params) => {
      const next = String(year);
      const same = params.get("focus") === next && params.get("zoom") === "year";
      if (same && !params.get("event")) {
        params.delete("focus");
        params.set("zoom", "all");
      } else {
        params.set("zoom", "year");
        params.set("focus", next);
      }
      params.delete("event");
      params.delete("cluster");
    }, true);
  }

  function setZoom(level) {
    replaceQuery((params) => {
      const groups = yearGroups(career(personById(currentArtistId()) || { id: "" }).dated || []);
      const last = groups.length ? groups[groups.length - 1].year : null;
      params.set("zoom", level);
      if (level === "all") {
        params.delete("focus");
        params.delete("event");
      }
      if ((level === "decade" || level === "year") && !params.get("focus") && last) params.set("focus", String(last));
      if (level === "decade") params.delete("event");
    }, true);
  }

  function back() {
    const { params } = parseHash();
    const from = params.get("from");
    const via = params.get("via");
    if (from) {
      const next = new URLSearchParams();
      if (via) next.set("event", via);
      if (params.get("srcZoom")) next.set("zoom", params.get("srcZoom"));
      if (params.get("srcFocus")) next.set("focus", params.get("srcFocus"));
      const query = next.toString();
      const scroll = Number(params.get("srcScroll") || 0);
      go(`/artist/${from}${query ? `?${query}` : ""}`, true, true);
      window.requestAnimationFrame(() => window.scrollTo(0, scroll));
      return;
    }
    if (history.state && history.state.entry) {
      history.back();
      return;
    }
    go("/", true);
  }

  function reduceMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function maybeJourney(person) {
    const { params } = parseHash();
    const fromId = params.get("from");
    const via = params.get("via");
    const overlay = document.querySelector("#journey");
    if (!overlay || !fromId || !via) {
      if (overlay) overlay.hidden = true;
      return;
    }
    const key = `${fromId}>${person.id}:${via}`;
    const crumbs = document.querySelector(".crumbs");
    if (journeyKey === key) {
      if (Date.now() < journeyUntil && crumbs) crumbs.classList.add("is-waiting");
      return;
    }
    journeyKey = key;
    journeyArtist = person.id;
    const fromPerson = personById(fromId);
    const exhibition = exhibitionById(via);
    document.querySelector("#journey-from").textContent = fromPerson ? fromPerson.name : "";
    document.querySelector("#journey-via").textContent = exhibition ? short(decodeDisplayText(exhibition.title), 80) : "";
    document.querySelector("#journey-to").textContent = person.name;
    if (reduceMotion()) {
      overlay.hidden = true;
      return;
    }
    overlay.hidden = false;
    overlay.classList.remove("is-on");
    void overlay.offsetWidth;
    overlay.classList.add("is-on");
    if (crumbs) crumbs.classList.add("is-waiting");
    document.body.classList.add("traveling");
    journeyUntil = Date.now() + 640;
    window.setTimeout(() => {
      if (journeyKey !== key) return;
      overlay.hidden = true;
      document.body.classList.remove("traveling");
      const live = document.querySelector(".crumbs");
      if (live) live.classList.remove("is-waiting");
    }, 640);
  }

  function claim(id) {
    const store = readStore();
    if (!store.claims.includes(id)) store.claims.push(id);
    writeStore(store);
    notice = "Prototype claim. Identity is not verified in this demo.";
    render();
  }

  function saveExhibition(form) {
    const person = personById(currentArtistId());
    if (!person || !isClaimed(person.id)) return;
    const data = new FormData(form);
    const title = String(data.get("title") || "").trim();
    if (!title) {
      notice = "A title is required. Other fields can stay unknown.";
      render();
      return;
    }
    const requested = String(data.get("precision") || "YEAR");
    const typedStart = String(data.get("start") || "");
    const start = enteredDate(typedStart, requested === "UNKNOWN" && typedStart.trim() ? "YEAR" : requested);
    const end = enteredDate(data.get("end"), "YEAR");
    const draft = {
      title,
      venue: String(data.get("venue") || "").trim() || null,
      start: start.value,
    };
    const names = String(data.get("artists") || "").split(/[,\n]/).map((name) => name.trim()).filter(Boolean);
    const links = names.map((name) => linkParticipant(name, directory()));
    const artistIds = [person.id];
    const unresolved = [];
    const reviewNames = [];
    links.forEach((link) => {
      if (link.kind === "PILOT_ARTIST" && !artistIds.includes(link.id)) artistIds.push(link.id);
      if (link.kind === "UNRESOLVED_PARTICIPANT") unresolved.push(link.name);
      if (link.kind === "REVIEW_REQUIRED") reviewNames.push(link.name);
    });
    const candidates = (person.exhibitionIds || []).map(exhibitionById).filter(Boolean);
    let hit = null;
    let match = "NEW";
    candidates.forEach((event) => {
      if (hit) return;
      const result = classifySubmission(event, draft);
      if (result !== "NEW") {
        hit = event;
        match = result;
      }
    });
    const origin = String(data.get("origin") || "ARTIST_SUBMITTED");
    const sourceUrl = String(data.get("sourceUrl") || "").trim() || null;
    const event = {
      id: `L${Date.now().toString(36)}`,
      ownerId: person.id,
      title,
      start: start.value,
      end: end.value,
      precision: start.precision,
      venue: draft.venue,
      city: String(data.get("city") || "").trim() || null,
      country: String(data.get("country") || "").trim() || null,
      curator: String(data.get("curator") || "").trim() || null,
      artistIds,
      unresolved,
      reviewNames,
      sourceUrl,
      origin,
      verification: sourceUrl ? "SOURCE_ATTACHED" : "UNVERIFIED",
      attachedTo: null,
      conflictNote: null,
      reviewReason: null,
    };
    if (match === "ATTACHED" && hit) {
      event.attachedTo = hit.id;
      event.verification = "CORROBORATED";
    } else if (match === "CONFLICT" && hit) {
      event.attachedTo = hit.id;
      event.verification = "CONFLICT";
      event.conflictNote = draft.start || "";
    } else if (match === "REVIEW_REQUIRED") {
      event.verification = "REVIEW_REQUIRED";
      event.reviewReason = "Ambiguous match. Not added to the timeline.";
    }
    const store = readStore();
    store.events.push(event);
    writeStore(store);
    const openId = event.attachedTo || (event.verification === "REVIEW_REQUIRED" ? "" : event.id);
    notice = event.verification === "REVIEW_REQUIRED" ? "Saved for review in this browser. It is not on the timeline." : "";
    go(`/artist/${person.id}${openId ? `?event=${encodeURIComponent(openId)}` : ""}`);
  }

  function savePerson(form) {
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    if (!name) {
      notice = "A name is required.";
      render();
      return;
    }
    const birth = String(data.get("birthYear") || "").trim();
    const person = {
      id: `L${Date.now().toString(36)}`,
      name,
      korean: String(data.get("korean") || "").trim(),
      birthYear: /^\d{4}$/.test(birth) ? Number(birth) : null,
      city: String(data.get("city") || "").trim(),
      website: String(data.get("website") || "").trim(),
      demo: true,
    };
    const store = readStore();
    store.people.push(person);
    if (!store.claims.includes(person.id)) store.claims.push(person.id);
    writeStore(store);
    notice = "DEMO · pilot only. This is not an identity check.";
    go(`/artist/${person.id}`);
  }

  function saveCorrection(form) {
    const id = currentArtistId();
    const note = String(new FormData(form).get("note") || "").trim();
    if (!note || !id) return;
    const store = readStore();
    store.reviews.push({ id: `R${Date.now().toString(36)}`, artistId: id, note, at: new Date().toISOString() });
    writeStore(store);
    notice = "Suggestion saved in this browser. The documented record is unchanged.";
    go(`/artist/${id}`);
  }

  function mePath() {
    const store = readStore();
    const person = store.people[store.people.length - 1];
    if (person) return `/artist/${person.id}`;
    const claim = store.claims[store.claims.length - 1];
    if (claim) return `/artist/${claim}`;
    return "/start";
  }

  function closeNavSearch() {
    const form = document.querySelector("#nav-query");
    if (form) form.hidden = true;
    const button = document.querySelector("#nav-search");
    if (button) button.setAttribute("aria-expanded", "false");
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ prototype: readStore(), usageStatus: "PILOT_ONLY" }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "rob-pilot-local-data.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  document.addEventListener("click", (event) => {
    if (event.target.id === "scrim") {
      closeMoment();
      return;
    }
    const link = event.target.closest("a[href^='#/']");
    if (link && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      go(link.getAttribute("href").slice(1));
      return;
    }
    const target = event.target.closest("[data-go], [data-event], [data-cluster], [data-year], [data-zoom-level], [data-back], [data-prov], [data-claim], [data-action], [data-decade], [data-city], [data-country], [data-mode], [data-more]");
    if (!target) return;
    if (target.dataset.go) {
      event.preventDefault();
      go(target.dataset.go);
      return;
    }
    if (target.dataset.zoomLevel) {
      event.preventDefault();
      setZoom(target.dataset.zoomLevel);
      return;
    }
    if (target.dataset.event) {
      event.preventDefault();
      openMoment(target.dataset.event);
      return;
    }
    if (target.dataset.year) {
      event.preventDefault();
      openYear(target.dataset.year);
      return;
    }
    if (target.dataset.cluster) {
      event.preventDefault();
      openCluster(target.dataset.cluster);
      return;
    }
    if (target.hasAttribute("data-back")) {
      event.preventDefault();
      back();
      return;
    }
    if (target.dataset.prov) {
      event.preventDefault();
      const moment = document.querySelector("#moment");
      moment.dataset.prov = moment.dataset.prov === target.dataset.prov ? "" : target.dataset.prov;
      syncMoment();
      return;
    }
    if (target.dataset.claim) {
      event.preventDefault();
      claim(target.dataset.claim);
      return;
    }
    if (target.hasAttribute("data-decade") || target.hasAttribute("data-city") || target.hasAttribute("data-country")) {
      event.preventDefault();
      shown = 24;
      const { parts, params } = parseHash();
      if (target.hasAttribute("data-decade")) {
        if (target.dataset.decade) params.set("decade", target.dataset.decade);
        else params.delete("decade");
      }
      if (target.hasAttribute("data-city")) {
        if (target.dataset.city) params.set("city", target.dataset.city);
        else params.delete("city");
      }
      if (target.hasAttribute("data-country")) {
        if (target.dataset.country) params.set("country", target.dataset.country);
        else params.delete("country");
      }
      const query = params.toString();
      go(`/${parts.join("/")}${query ? `?${query}` : ""}`);
      return;
    }
    if (target.dataset.mode) {
      event.preventDefault();
      mapDepth = target.dataset.mode === "map" ? 2 : 1;
      render();
      return;
    }
    if (target.dataset.more) {
      event.preventDefault();
      shown += 24;
      render();
      return;
    }
    const action = target.dataset.action;
    if (action === "close-moment") closeMoment();
    if (action === "more-artists") {
      momentExpanded = true;
      syncMoment();
    }
    if (action === "map-more") {
      mapDepth = 3;
      render();
    }
    if (action === "me") go(mePath());
    if (action === "debug") {
      document.body.classList.toggle("debug", localStorage.getItem(DEBUG_KEY) !== "1");
      localStorage.setItem(DEBUG_KEY, document.body.classList.contains("debug") ? "1" : "0");
      render();
    }
    if (action === "reset") {
      if (window.confirm("Remove exhibitions and artist records added in this browser?")) {
        localStorage.removeItem(STORE_KEY);
        notice = "";
        render();
      }
    }
    if (action === "export") exportData();
  });

  document.addEventListener("submit", (event) => {
    if (event.target.id === "add-form") {
      event.preventDefault();
      saveExhibition(event.target);
    }
    if (event.target.id === "create-form") {
      event.preventDefault();
      savePerson(event.target);
    }
    if (event.target.id === "correct-form") {
      event.preventDefault();
      saveCorrection(event.target);
    }
    if (event.target.id === "nav-query") event.preventDefault();
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "q") paintHomeResults(event.target.value);
    if (event.target.id === "self") {
      const box = document.querySelector("#self-results");
      if (box) box.innerHTML = searchHtml(event.target.value);
    }
    if (event.target.id === "nav-q") paintNavResults(event.target.value);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!document.querySelector("#moment").hidden) closeMoment();
      else closeNavSearch();
    }
    if (event.key === "/" && !event.target.closest("input, textarea, select")) {
      event.preventDefault();
      const home = document.querySelector("#q");
      if (home) home.focus();
      else {
        document.querySelector("#nav-query").hidden = false;
        document.querySelector("#nav-search").setAttribute("aria-expanded", "true");
        document.querySelector("#nav-q").focus();
      }
    }
    if (event.key === "Enter" && event.target.id === "q") {
      const first = document.querySelector("#results [data-go]");
      if (first) {
        event.preventDefault();
        go(first.dataset.go);
      }
    }
  });

  document.querySelector("#nav-search").addEventListener("click", () => {
    const home = document.querySelector("#q");
    if (home) {
      home.focus();
      return;
    }
    const form = document.querySelector("#nav-query");
    form.hidden = !form.hidden;
    document.querySelector("#nav-search").setAttribute("aria-expanded", form.hidden ? "false" : "true");
    if (!form.hidden) document.querySelector("#nav-q").focus();
  });

  window.addEventListener("hashchange", render);
  window.addEventListener("popstate", render);
  if (localStorage.getItem(DEBUG_KEY) === "1") document.body.classList.add("debug");
  if (!location.hash) history.replaceState({ entry: false }, "", `${location.pathname}${location.search}#/`);
  render();
})();
