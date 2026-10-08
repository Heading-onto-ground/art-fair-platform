const PEOPLE = window.ROB_PEOPLE || [];
const LOG_KEY = "rob-art-history-pilot-log";
const STORE_KEY = "rob-art-history-pilot-hybrid";
const state = { id: null, eventId: null, via: null };
const stack = [];
const q = document.querySelector("#q");
const results = document.querySelector("#results");
const stage = document.querySelector("#stage");
const artistEl = document.querySelector("#artist");
const momentEl = document.querySelector("#moment");
const composerEl = document.querySelector("#composer");
const logEl = document.querySelector("#log");
const questions = [
  "Did you understand what ROB does?",
  "Did you want to click another artist?",
  "Was the timeline easier than a normal CV?",
  "Did you trust the information?",
  "Did the source labels help or distract?",
  "If you were an artist, would you add missing history?",
];

function readLog() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch { return []; }
}
function writeLog(entries) {
  localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(-200)));
  logEl.textContent = entries.length + " local events";
}
function log(type, detail) {
  const entries = readLog();
  entries.push({ type, detail, at: new Date().toISOString() });
  writeLog(entries);
}
function blankStore() {
  return { claims: [], people: [], events: [], reviews: [], answers: null };
}
function readStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "");
    return parsed && Array.isArray(parsed.people) ? { ...blankStore(), ...parsed } : blankStore();
  } catch {
    return blankStore();
  }
}
function writeStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
function compact(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9\uac00-\ud7a3]/g, "");
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
  const existingYear = String(existing.year || existing.start || "").slice(0, 4);
  const draftYear = String(draft.start || "").slice(0, 4);
  const sameYear = /^\d{4}$/.test(existingYear) && existingYear === draftYear;
  if (!sameVenue || !sameYear || !specificTitle(draft.title, draft.venue)) return "REVIEW_REQUIRED";
  const left = String(existing.start || "");
  const right = String(draft.start || "");
  if (left.length > 4 && right.length > 4 && left.slice(0, 7) !== right.slice(0, 7)) return "REVIEW_REQUIRED";
  return "ATTACHED";
}
function directory() {
  const local = readStore().people.map((person) => ({
    id: person.id,
    name: person.name,
    korean: person.korean || "",
    search: [person.name, person.korean, person.city, person.website].filter(Boolean).join(" "),
    birthYear: person.birthYear,
    city: person.city || "",
    website: person.website || "",
    demo: true,
    count: 0,
    bucket: "EMPTY",
    signature: Array.from({ length: 16 }, () => 0),
    earliest: null,
    events: [],
  }));
  return PEOPLE.concat(local);
}
function labelsOf(person) {
  return [person.name, person.korean].filter(Boolean);
}
function linkParticipant(name, people) {
  const target = compact(name);
  if (!target) return { kind: "REVIEW_REQUIRED", name: name.trim() };
  const hits = people.filter((person) => labelsOf(person).some((label) => compact(label) === target));
  const ids = [...new Set(hits.map((person) => person.id))];
  if (ids.length > 1) return { kind: "REVIEW_REQUIRED", name: name.trim() };
  if (ids.length === 1) return { kind: "PILOT_ARTIST", id: ids[0], name: hits[0].name };
  return { kind: "UNRESOLVED_PARTICIPANT", name: name.trim() };
}
function personById(id) {
  return directory().find((person) => person.id === id) || null;
}
function belongs(event, person) {
  if (event.artistIds && event.artistIds.includes(person.id)) return true;
  const names = [person.name, person.korean].map(compact);
  return (event.unresolved || []).some((name) => names.includes(compact(name)));
}
function whenLabel(event) {
  if (!event.start && !event.when) return "Date not recorded";
  if (event.when && event.origin === "ROB_RESEARCHED" && !event.local) return event.when;
  if (!event.start) return "Date not recorded";
  return event.end ? event.start + " – " + event.end : event.start;
}
function fraction(value, precision, min, max) {
  if (!value) return { fraction: 0, precise: false };
  const year = Number(String(value).slice(0, 4));
  const span = Math.max(1, max - min + 1);
  if (precision === "YEAR" || precision === "year" || String(value).length === 4) {
    return { fraction: (year - min) / span, precise: false };
  }
  const month = Number(String(value).slice(5, 7));
  const monthIndex = month >= 1 && month <= 12 ? month - 1 : 0;
  const day = precision === "DAY" || precision === "day" ? Number(String(value).slice(8, 10)) : 0;
  const dayOffset = day >= 1 ? (day - 1) / 31 : 0.5;
  return { fraction: (year - min + (monthIndex + dayOffset) / 12) / span, precise: precision === "DAY" || precision === "day" };
}
function visibleEvents(person) {
  const store = readStore();
  const overlays = new Map();
  store.events.forEach((event) => {
    if (event.attachedTo) overlays.set(event.attachedTo, event);
  });
  const official = (person.events || []).map((event) => {
    const overlay = overlays.get(event.id);
    if (!overlay) return event;
    if (overlay.verification === "CONFLICT") {
      return { ...event, provenance: "Conflict", verification: "CONFLICT", conflictNote: overlay.conflictNote };
    }
    const sources = event.sources.concat(overlay.sourceUrl ? [overlay.sourceUrl] : []);
    return { ...event, provenance: "Artist + official source", verification: "CORROBORATED", sources };
  });
  const added = store.events.filter((event) => !event.attachedTo && event.verification !== "REVIEW_REQUIRED" && belongs(event, person)).map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    when: whenLabel(event),
    precision: event.precision,
    year: event.start ? Number(String(event.start).slice(0, 4)) : null,
    venue: event.venue,
    city: event.city && event.city.length <= 40 ? event.city : null,
    curators: event.curator ? [event.curator] : [],
    artists: (event.artistIds || []).map((id) => ({ id, name: (personById(id) || {}).name || id })).concat((event.unresolved || []).map((name) => ({ id: null, name }))),
    sources: event.sourceUrl ? [event.sourceUrl] : [],
    reviewNames: event.reviewNames || [],
    provenance: event.origin === "GALLERY_SUBMITTED" ? "Gallery added" : event.origin === "INSTITUTION_SUBMITTED" ? "Institution added" : "Artist added",
    origin: event.origin,
    verification: event.verification,
    local: true,
    precise: false,
    fraction: 0,
  }));
  const rows = official.concat(added);
  const years = rows.map((event) => event.year).filter((year) => year);
  const min = years.length ? Math.min(...years) : 1960;
  const max = years.length ? Math.max(...years) : 2026;
  return rows.map((event) => {
    const placed = event.local ? fraction(event.start, event.precision, min, max) : event;
    return event.local ? { ...event, fraction: placed.fraction, precise: placed.precise } : event;
  }).sort((a, b) => String(a.start || a.when || "").localeCompare(String(b.start || b.when || "")));
}
function signature(counts) {
  const max = Math.max(1, ...counts);
  return '<span class="signature">' + counts.map((count) => '<i style="height:' + (count ? 6 + Math.round((count / max) * 18) : 2) + 'px"></i>').join("") + "</span>";
}
function binsFor(events) {
  const years = events.map((event) => event.year).filter((year) => year);
  const counts = Array.from({ length: 16 }, () => 0);
  if (!years.length) return counts;
  const min = Math.min(...years);
  const span = Math.max(1, Math.max(...years) - min + 1);
  years.forEach((year) => {
    const index = Math.min(15, Math.floor(((year - min) / span) * 16));
    counts[index] += 1;
  });
  return counts;
}
function showResults(query) {
  const needle = query.trim().toLowerCase();
  const found = directory().filter((person) => !needle || person.search.toLowerCase().includes(needle) || person.name.toLowerCase().includes(needle) || (person.korean || "").includes(query.trim()));
  const cards = found.slice(0, 12).map((person) =>
    '<button class="result" data-id="' + esc(person.id) + '"><span><strong>' + esc(person.name) + '</strong>' +
    (person.demo ? '<span class="demo"> DEMO · pilot only</span>' : "") +
    '<span class="korean">' + esc(person.korean || "") + '</span><small>' +
    (person.birthYear ? "b. " + esc(person.birthYear) + " · " : "") + person.count + " documented exhibitions</small></span>" +
    signature(person.signature || binsFor([])) + "</button>"
  ).join("");
  const missing = needle && found.length === 0
    ? '<p class="hint">No result. <button type="button" data-action="start">Can\'t find yourself? Start your history</button></p>'
    : "";
  results.innerHTML = cards + missing;
}
function mark(text) {
  if (text === "Conflict") return "! Conflict";
  if (text === "Artist + official source") return "✓○ Artist + official source";
  if (text === "Official source") return "✓ Official source";
  if (text === "Gallery added") return "○ Gallery added";
  if (text === "Institution added") return "○ Institution added";
  return "○ Artist added";
}
function openArtist(id, via, returning) {
  const person = personById(id);
  if (!person) return;
  const previous = state.id;
  if (!returning && previous && previous !== id) stack.push(previous);
  state.id = id;
  state.eventId = null;
  state.via = via || null;
  stage.hidden = false;
  results.hidden = true;
  momentEl.hidden = true;
  composerEl.hidden = true;
  document.title = person.name + ": Exhibition History & Connections | ROB";
  const events = visibleEvents(person);
  const store = readStore();
  const claimed = store.claims.includes(person.id) || person.demo;
  const years = [...new Set(events.map((event) => event.year).filter(Boolean))];
  const step = Math.max(1, Math.ceil(years.length / 6));
  const dots = events.map((event, index) => {
    const lift = (index % 3) * 10;
    return '<button class="dot' + (event.precise ? "" : " uncertain") + '" style="left:' + (event.fraction * 100) + '%;margin-top:-' + lift + 'px" data-event="' + esc(event.id) + '" title="' + esc(event.when) + '"></button>';
  }).join("");
  const yearMarks = years.filter((_, index) => index % step === 0).map((year) => {
    const sample = events.find((event) => event.year === year);
    return '<span class="yearmark" style="left:' + ((sample ? sample.fraction : 0) * 100) + '%">' + year + "</span>";
  }).join("");
  const vertical = events.map((event) =>
    '<article><button data-event="' + esc(event.id) + '"><span class="node' + (event.precise ? "" : " uncertain") + '"></span><strong>' + esc(event.year || "Undated") + "</strong><br>" + esc(event.title) + '<br><span class="meta">' + esc([event.venue, event.city].filter(Boolean).join(" · ")) + '</span></button><br><button class="prov" type="button" data-action="prov" data-event="' + esc(event.id) + '">' + esc(mark(event.provenance)) + "</button></article>"
  ).join("");
  const reviews = store.events.filter((event) => event.verification === "REVIEW_REQUIRED" && (event.ownerId === person.id || belongs(event, person)));
  const corrections = store.reviews.filter((review) => review.artistId === person.id);
  const localCount = events.filter((event) => event.local).length;
  artistEl.innerHTML =
    (state.via ? '<p class="crumbs"><button id="back" type="button">Back</button> You came here through ' + esc(state.via) + "</p>" : "") +
    "<h2>" + esc(person.name) + "</h2>" +
    (person.korean ? '<p class="korean">' + esc(person.korean) + "</p>" : "") +
    (person.demo ? '<p class="demo">DEMO · pilot only. This is not an identity check.</p>' : "") +
    '<p class="meta">' + (person.birthYear ? "b. " + esc(person.birthYear) + " · " : "") + person.count + " documented exhibitions" +
    (localCount ? " · " + localCount + " added in this browser" : "") +
    (events[0] && (events[0].start || events[0].when) ? " · Earliest recorded exhibition " + esc(events[0].start || events[0].when) : "") + "</p>" +
    ((person.demo || person.count === 0) ? '<p class="meta">Pilot only. Not prepared as a public SEO page.</p>' : "") +
    signature(binsFor(events)) +
    '<div class="tabs"><span>HISTORY</span><span>CONNECTIONS</span><span>WORKS</span><span>ABOUT</span></div>' +
    (claimed
      ? '<p class="meta">Prototype claim. This does not verify your identity.</p><p class="hint"><button type="button" data-action="add">Add exhibition</button> · <button type="button" data-action="correct">Suggest correction</button></p>'
      : '<p class="hint"><button type="button" data-action="claim">Claim this page</button></p>') +
    (events.length ? '<div class="track"><div class="axis"></div>' + dots + yearMarks + '</div><p class="meta">Open circles mark year-only dates.</p><div class="vertical">' + vertical + "</div>" : '<p class="empty">No accepted exhibition records in ROB yet.</p>') +
    (reviews.length ? '<p class="meta">Needs review</p><ul>' + reviews.map((event) => "<li>" + esc(event.title) + " · " + esc(event.reviewReason || "Ambiguous match") + "</li>").join("") + "</ul>" : "") +
    (corrections.length ? "<ul>" + corrections.map((review) => "<li>Correction suggested. Official record unchanged. " + esc(review.note) + "</li>").join("") + "</ul>" : "");
  if (!returning) {
    log(previous && previous !== id ? "SECOND_ARTIST_REACHED" : "ARTIST_OPENED", id);
    if (via && previous && previous !== id) log("CONNECTION_FOLLOWED", previous + "→" + id);
  }
}
function openEvent(id) {
  const person = personById(state.id);
  const event = person && visibleEvents(person).find((item) => item.id === id);
  if (!event) return;
  state.eventId = id;
  const others = (event.artists || []).filter((artist) => artist.id && artist.id !== person.id);
  const detail = [
    "Origin: " + (event.origin === "ROB_RESEARCHED" ? "ROB researched" : String(event.origin || "").toLowerCase().replace(/_/g, " ")),
    "Verification: " + String(event.verification || "").toLowerCase().replace(/_/g, " "),
  ].concat((event.sources || []).map((url) => url));
  momentEl.hidden = false;
  momentEl.innerHTML =
    "<h3>" + esc(event.title) + "</h3><p>" + esc(event.when) + " · " + esc(event.precision) + "</p><p>" + esc([event.venue, event.city].filter(Boolean).join(" · ")) + "</p>" +
    (event.curators && event.curators.length ? "<p>Curator: " + esc(event.curators.join(", ")) + "</p>" : "") +
    '<p><button class="prov" type="button" data-action="prov" data-event="' + esc(event.id) + '">' + esc(mark(event.provenance)) + "</button></p>" +
    '<div id="prov-detail"><p class="meta">' + detail.map(esc).join("<br>") + "</p></div>" +
    (event.conflictNote ? '<p class="meta">Source conflict. The official date is unchanged. ' + esc(event.conflictNote) + "</p>" : "") +
    (event.local ? (event.artists || []).filter((artist) => !artist.id).map((artist) => '<p class="meta">Unresolved participant: ' + esc(artist.name) + "</p>").join("") : "") +
    (event.reviewNames && event.reviewNames.length ? '<p class="meta">Needs review: ' + esc(event.reviewNames.join(", ")) + "</p>" : "") +
    '<div class="constellation">' + others.map((artist) => '<button data-artist="' + esc(artist.id) + '" data-via="' + esc(event.title) + '">' + esc(artist.name) + "</button>").join("") +
    (event.venue ? "<span>" + esc(event.venue) + "</span>" : "") + "</div>" +
    (event.sources && event.sources.length ? event.sources.map((url) => '<a href="' + esc(url) + '" target="_blank" rel="noreferrer">Official source ↗</a>').join(" ") : "");
  log("TIMELINE_EVENT_OPENED", id);
}
function formFields(extra) {
  return extra +
    '<label>Exhibition title<input name="title" required></label>' +
    '<label>Start date<input name="start" placeholder="2018 or 2018-03 or 2018-03-02"></label>' +
    '<label>End date<input name="end" placeholder="optional"></label>' +
    '<label>Date precision<select name="precision"><option>YEAR</option><option>MONTH</option><option>DAY</option><option>UNKNOWN</option></select></label>' +
    '<label>Venue<input name="venue"></label><label>City<input name="city"></label><label>Country<input name="country"></label>' +
    '<label>Participating artists<input name="artists" placeholder="Comma separated. Other fields can stay blank."></label>' +
    '<label>Curator<input name="curator"></label><label>Source URL<input name="sourceUrl"></label><label>Notes<textarea name="notes"></textarea></label>' +
    '<label>Who is adding this?<select name="origin"><option value="ARTIST_SUBMITTED">Artist</option><option value="GALLERY_SUBMITTED">Gallery</option><option value="INSTITUTION_SUBMITTED">Institution</option></select></label>' +
    '<button type="submit">Save exhibition</button>';
}
function openComposer(mode) {
  composerEl.hidden = false;
  if (mode === "start") {
    composerEl.innerHTML = '<form id="start-form"><p>Prototype only. This does not create a ROB account.</p><label>Artist name<input name="name" required></label><label>Native name<input name="korean"></label><label>Birth year<input name="birthYear" placeholder="YYYY"></label><label>City<input name="city"></label><label>Official website<input name="website"></label><button type="submit">Start your history</button></form>';
    return;
  }
  if (mode === "correct") {
    composerEl.innerHTML = '<form id="correct-form"><p>Suggest a correction. The official record stays as it is.</p><label>Note<textarea name="note" required></textarea></label><button type="submit">Save suggestion</button></form>';
    return;
  }
  composerEl.innerHTML = '<form id="add-form"><p>Add an exhibition to this prototype history. Blank fields stay unknown.</p>' + formFields("") + "</form>";
}
function saveExhibition(form) {
  const person = personById(state.id);
  if (!person) return;
  const data = new FormData(form);
  const title = String(data.get("title") || "").trim();
  if (!title) return;
  const start = enteredDate(data.get("start"), data.get("precision"));
  const end = enteredDate(data.get("end"), "YEAR");
  const draft = {
    title,
    venue: String(data.get("venue") || "").trim() || null,
    start: start.value,
    city: String(data.get("city") || "").trim() || null,
    country: String(data.get("country") || "").trim() || null,
  };
  const names = String(data.get("artists") || "").split(",").map((name) => name.trim()).filter(Boolean);
  const people = directory();
  const links = names.map((name) => linkParticipant(name, people));
  const artistIds = [person.id];
  const unresolved = [];
  const reviewNames = [];
  links.forEach((link) => {
    if (link.kind === "PILOT_ARTIST" && !artistIds.includes(link.id)) artistIds.push(link.id);
    if (link.kind === "UNRESOLVED_PARTICIPANT") unresolved.push(link.name);
    if (link.kind === "REVIEW_REQUIRED") reviewNames.push(link.name);
  });
  const candidates = visibleEvents(person).filter((event) => !event.local);
  const hit = candidates.find((event) => submissionMatch(event, draft) !== "NEW");
  const match = hit ? submissionMatch(hit, draft) : "NEW";
  const origin = String(data.get("origin") || "ARTIST_SUBMITTED");
  const sourceUrl = String(data.get("sourceUrl") || "").trim() || null;
  const event = {
    id: "L" + Date.now().toString(36),
    ownerId: person.id,
    title,
    start: start.value,
    end: end.value,
    precision: start.precision,
    venue: draft.venue,
    city: draft.city,
    country: draft.country,
    curator: String(data.get("curator") || "").trim() || null,
    artistIds,
    unresolved,
    reviewNames,
    sourceUrl,
    notes: String(data.get("notes") || "").trim() || null,
    origin,
    verification: sourceUrl ? "SOURCE_ATTACHED" : "UNVERIFIED",
    attachedTo: null,
    conflictNote: null,
    reviewReason: null,
  };
  if (match === "ATTACHED" && hit) {
    event.attachedTo = hit.id;
    event.verification = "CORROBORATED";
  } else if (match === "REVIEW_REQUIRED" && hit) {
    const monthConflict = hit.start && draft.start && String(hit.start).length > 4 && String(draft.start).length > 4 && String(hit.start).slice(0, 7) !== String(draft.start).slice(0, 7);
    if (monthConflict) {
      event.attachedTo = hit.id;
      event.verification = "CONFLICT";
      event.conflictNote = "Submitted date " + draft.start + ".";
    } else {
      event.verification = "REVIEW_REQUIRED";
      event.reviewReason = "Ambiguous match. Not added to the timeline.";
    }
  }
  const store = readStore();
  store.events.push(event);
  writeStore(store);
  log("EXHIBITION_ADDED", event.id);
  composerEl.hidden = true;
  openArtist(person.id, state.via, true);
  if (event.attachedTo && event.verification !== "REVIEW_REQUIRED") openEvent(event.attachedTo);
  else if (event.verification !== "REVIEW_REQUIRED" && event.verification !== "CONFLICT") openEvent(event.id);
}
function savePerson(form) {
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  if (!name) return;
  const birth = String(data.get("birthYear") || "").trim();
  const person = {
    id: "L" + Date.now().toString(36),
    name,
    korean: String(data.get("korean") || "").trim(),
    birthYear: /^\d{4}$/.test(birth) ? Number(birth) : null,
    city: String(data.get("city") || "").trim(),
    website: String(data.get("website") || "").trim(),
  };
  const store = readStore();
  store.people.push(person);
  store.claims.push(person.id);
  writeStore(store);
  log("START_HISTORY_CLICKED", person.id);
  openArtist(person.id, null, false);
}
function renderQuestions() {
  const saved = readStore().answers || {};
  questions.forEach((prompt, index) => {
    const row = document.createElement("p");
    row.textContent = (index + 1) + ". " + prompt;
    const choice = document.createElement("div");
    for (let score = 1; score <= 5; score += 1) {
      const id = "q" + index + "-" + score;
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "q" + index;
      input.value = String(score);
      input.id = id;
      if (String(saved["q" + index]) === String(score)) input.checked = true;
      const label = document.createElement("label");
      label.setAttribute("for", id);
      label.append(input, " " + score);
      choice.append(label);
    }
    document.querySelector("#questions").append(row, choice);
  });
  const note = document.createElement("label");
  note.textContent = "7. What confused you?";
  const area = document.createElement("textarea");
  area.name = "confused";
  area.value = saved.confused || "";
  note.append(area);
  document.querySelector("#questions").append(note);
}
document.body.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]");
  if (action) {
    const name = action.dataset.action;
    if (name === "start") { log("START_HISTORY_CLICKED", "search"); stage.hidden = false; openComposer("start"); return; }
    if (name === "claim") {
      const store = readStore();
      if (state.id && !store.claims.includes(state.id)) store.claims.push(state.id);
      writeStore(store);
      log("CLAIM_DEMO_CLICKED", state.id);
      openArtist(state.id, state.via, true);
      return;
    }
    if (name === "add") { openComposer("add"); return; }
    if (name === "correct") { openComposer("correct"); return; }
    if (name === "prov") { openEvent(action.dataset.event); return; }
  }
  const result = event.target.closest("[data-id]");
  if (result) { openArtist(result.dataset.id, null, false); return; }
  const exhibition = event.target.closest("[data-event]");
  if (exhibition && !event.target.closest("[data-action]")) { openEvent(exhibition.dataset.event); return; }
  const next = event.target.closest("[data-artist]");
  if (next) { openArtist(next.dataset.artist, next.dataset.via, false); return; }
  if (event.target.id === "back") {
    const prev = stack.pop();
    if (prev) { log("RETURNED_TO_PREVIOUS_ARTIST", prev); openArtist(prev, null, true); }
  }
  if (event.target.closest("#moment a")) log("SOURCE_OPENED", event.target.getAttribute("href"));
});
document.body.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.id === "start-form") savePerson(event.target);
  if (event.target.id === "add-form") saveExhibition(event.target);
  if (event.target.id === "correct-form") {
    const note = new FormData(event.target).get("note");
    const store = readStore();
    store.reviews.push({ artistId: state.id, eventId: state.eventId, note: String(note || ""), at: new Date().toISOString() });
    writeStore(store);
    composerEl.hidden = true;
    openArtist(state.id, state.via, true);
  }
});
q.addEventListener("input", () => {
  results.hidden = false;
  showResults(q.value);
  log("SEARCH_PERFORMED", q.value.slice(0, 80));
});
document.querySelector("#start").addEventListener("click", () => {
  log("START_HISTORY_CLICKED", "header");
  stage.hidden = false;
  openComposer("start");
});
document.querySelector("#clear").addEventListener("click", () => { localStorage.removeItem(LOG_KEY); writeLog([]); });
document.querySelector("#clear-hybrid").addEventListener("click", () => {
  localStorage.removeItem(STORE_KEY);
  if (state.id) openArtist(state.id, null, true);
});
document.querySelector("#export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ log: readLog(), prototype: readStore() }, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "rob-pilot-session-log.json";
  link.click();
});
document.querySelector("#save-answers").addEventListener("click", () => {
  const answers = { confused: document.querySelector('textarea[name="confused"]').value };
  questions.forEach((_, index) => {
    const chosen = document.querySelector('input[name="q' + index + '"]:checked');
    answers["q" + index] = chosen ? Number(chosen.value) : null;
  });
  const store = readStore();
  store.answers = answers;
  writeStore(store);
  logEl.textContent = readLog().length + " local events · answers saved";
});
showResults("");
writeLog(readLog());
renderQuestions();
