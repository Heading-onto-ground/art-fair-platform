# FULL PRODUCT PROTOTYPE V3

Phase P4. No new public-web collection. No human-test round. Production ROB was not changed.

Status: **FULL_PRODUCT_PROTOTYPE_V3_READY**

This is a working product prototype inside the pilot. It is not market validation and it is not production-ready.

Preserved verdicts:

- INTERNATIONAL_CANARY_BELOW_THRESHOLD
- INTERNATIONAL_SEARCH_RESCUE_BELOW_THRESHOLD
- PRODUCT_EXPERIENCE_READY_FOR_HUMAN_TEST
- HYBRID_MODEL_READY_FOR_HUMAN_TEST

`view/` and `view-v2/` are unchanged checkpoints. Rebuild with:

```bash
npx tsx experiments/art-history-pilot/scripts/build-view-v3.ts
```

Open `experiments/art-history-pilot/view-v3/index.html` through a local static server. `file://` is blocked. The page embeds `window.ROB_CATALOG`. `app.js` and `styles.css` are hand-written and are not overwritten by the builder.

Preview screens: `reports/screenshots/`.

## 1. Product architecture

Hash routes, no network calls, no analytics.

| Route | Page |
| --- | --- |
| `#/` | Search-first home |
| `#/explore` | Artists, exhibitions, spaces |
| `#/rankings` | Ranking shells |
| `#/now` | Dated current and recent exhibitions |
| `#/about` | One-sentence product about |
| `#/start`, `#/start/new` | Start your history / create a DEMO artist |
| `#/artist/:id` | History, Connections, Works, About |
| `#/artist/:id/add` | Add exhibition |
| `#/artist/:id/correct` | Suggest a correction |
| `#/exhibition/:id` | Exhibition entity |
| `#/space/:id` | Space as strata |
| `#/curators` | Honest empty curator state |

Catalog from accepted International 25 data, as of the builder on 8 October 2026:

- 25 artists
- 468 accepted exhibitions
- 263 spaces
- 0 curators
- Lee Ufan 130, Park Seo-Bo 87, Lee Bae 67, Haegue Yang 58, Ha Chong-Hyun 52
- Empty histories: Lee Bul, Kimsooja, Minouk Lim, Mire Lee, siren eun young jung, Ayoung Kim, Moon Kyungwon, Nikki S. Lee

Every accepted record stays `PILOT_ONLY` / `production_clearance = UNRESOLVED`. First-party rows stay in `localStorage` key `rob-art-history-v3`.

## 2. Home

First viewport:

ROB

Search an artist.
See their journey.

The search field is the hero. Explore, Rankings, and Now sit below the fold. A quiet line offers “Are you an artist? Start your history →”. NOW is not the hero. There is no Follow.

A small dot beside the ROB mark is the only guide placeholder. It is not a character.

## 3. Search

Search matches the English canonical name, the Korean or native name, and verified aliases from the identity sidecar. A result shows the name, native name, birth year when that year is verified, the documented exhibition count, and the History Signature. Popularity is not shown.

`이우환` returns Lee Ufan, born 1936, 130 documented exhibitions. Local DEMO artists, if any exist in this browser, appear under “In this browser” and are labeled DEMO.

## 4. Artist

Header: canonical name, native name, and a verified identity line when one exists. Lee Ufan shows 이우환 and Born 1936. Kim Beom has no verified birth year, so none is printed.

Tabs: History (default), Connections, Works, About. There is no Overview tab and no Follow button.

The document title for an artist is `{Name}: Exhibition History & Connections | ROB`.

## 5. History visualization

Desktop is a horizontal line from the earliest accepted year to the latest. Each accepted event is a circle.

- Filled circle: month or day precision
- Open circle: year-only precision

Events that share the same plotted position stack upward as separate circles. A year with six exhibitions is six circles, not a numeral. Undated events are listed and are not plotted as a year. `2018` is never drawn as `2018-01-01`.

The History Signature is a compact row of bars from the accepted year counts. It appears in search, the artist header, and Explore. Empty careers use a flat placeholder, not decorative dots.

Mobile, at 720px and below, hides the horizontal line and uses a vertical timeline: year, circle, title, place. It is a different layout, not a shrunk desktop track.

## 6. Moment / connections

Clicking a circle opens a Moment panel. It does not navigate away. The panel shows the title, date, space, city, curator when one is named, other documented artists, and the provenance state. Around the event, only documented neighbors are drawn. Undocumented relationships are not drawn.

Choosing another artist moves into that history and keeps the path:

You came here through {Exhibition}

Back returns to the previous artist with that moment open again.

Verified path: Lee Ufan → The Making of Modern Korean Art… (Tina Kim Gallery, New York) → Park Seo-Bo → Back to Lee Ufan.

Connections, as a tab, is a grouped list: Artists, Spaces, Curators. Artist rows use “documented shared exhibitions” and list the exhibitions. The optional Map is a local circle, capped at 12 nodes, with a further step for the next exhibitions. It does not load a global graph. Words such as “close connection” or “influenced by” are not used.

## 7. Exhibition

An exhibition page shows the title, dates, space, city and country, participants, curator, sources, and how many artist histories contain the record. Participants link into those histories. The space links to the space page. There is no copied exhibition essay.

Title: `{Exhibition}: Artists, Space & History | ROB`.

## 8. Space

A space page is chronological strata: year, then the exhibitions recorded there, then the artists on each record. Kukje Gallery shows 22 documented exhibitions in this pilot, from 2026 down to 2008. Coverage that is thin stays thin. Spaces are not fuzzy-merged, so the same gallery under two spellings can remain two spaces.

Title: `{Space}: Exhibitions & Artists | ROB`.

## 9. Curator

No curator name was accepted on the current records. The curator route says so and does not invent a person. A curator page is created only when a record names one.

## 10. Explore

Explore is an editorial list of artists, exhibitions, and spaces. Filters that the data can support are decade, city, and country. Decades present: 1950s through 2020s. Cities and countries are the values stored on records. Missing metadata is not filled in. The layout is a directory, not a filter dashboard.

## 11. Rankings

Four shells, all inactive:

- Oldest Living Artists — living status is not verified, so no names are listed
- Highest Auction Records — no verified auction records
- Most Expensive per cm² — no verified price or dimension records
- Most Searched Artists — this pilot does not record public search counts

Each says “Coming from verified data”. There are no numeric ranks and no ROB Artist Score. The page says “ROB does not score artistic quality.”

## 12. Now

As of 8 October 2026, only month or day ranges that include that date are current. Year-only dates are never current.

Current:

- Anicka Yi, Message from the Mud, 2026-05-17 – 2026-11-09
- OUSSSMOS, 2026-09-05 – 2026-12-27

Recently dated:

- 서도호: Walk the House, 2025-05-01 – 2025-10-26

No other events were invented.

## 13. Start your history

The flow stays in this browser. It does not create a ROB account.

Search yourself. If the page exists, Claim this page. If it does not, create an artist record with name, optional native name, birth year, city, and official website. The new page is labeled DEMO. The history starts empty, with “Add your first exhibition”.

Verified: a fictional “Demo River Artist / 데모 강” was created, then an exhibition “River Notes” (2024, Demo Hall, Seoul) was added with participants Lee Ufan and “Unresolved River Person”. Lee Ufan linked. The unknown name stayed “Unresolved participant” and was not merged and did not create an account. The official documented count stayed 0 on the demo page and 130 on Lee Ufan. The local row is marked “1 added in this browser.”

## 14. Claim

“Claim this page” stores a prototype flag. The page says “Prototype claim. Identity is not verified in this demo.” After that, Add exhibition and Suggest correction are available. A correction is a note in this browser. The official record is not rewritten. Production auth is not connected.

## 15. Provenance

Quiet by default. Opening it shows origin, verification, official URLs, and a retrieved date when one is stored. There is no confidence percentage.

| Mark | Meaning |
| --- | --- |
| ✓ Official source | ROB researched, official page attached |
| ○ Artist added | Artist submission |
| ○ Gallery added | Gallery submission |
| ○ Institution added | Institution submission |
| ✓○ Artist + official source | Official row plus a confident artist submission |
| ✓○ Gallery + official source | Official row plus a gallery submission |
| ✓○ Institution + official source | Official row plus an institution submission |
| ! Conflict | Dates disagree. The official date stays |

The drawer says the label describes evidence, not an artistic endorsement.

## 16. Mobile

Checked at 1440, 1024, and 390.

- 1440 and 1024 keep the horizontal timeline. With the Moment open, the page shifts left so the line and the About link stay visible. The desktop panel does not dim the history.
- 390 uses the vertical timeline, a bottom bar (Search, Explore, Rankings, Me), and a bottom sheet for the Moment.
- Horizontal overflow was checked. At 1024, invisible timeline tooltips had widened the page; the track now clips them. At 390, `scrollWidth` matched the viewport.

## 17. Accessibility

Skip link, visible `:focus-visible` outlines, semantic buttons and links, and screen-reader labels on timeline circles (year, title or count, precision). The guide dot and the signature are `aria-hidden`; the count is in text beside them. Debug details are `aria-hidden` unless debug mode is on. `prefers-reduced-motion` stops the guide pulse and the panel animation. Keyboard input works in the search field.

## 18. SEO model

Titles are set only inside this prototype. Production sitemap and SEO were not touched.

- Artist: `{Artist}: Exhibition History & Connections | ROB`
- Exhibition: `{Exhibition}: Artists, Space & History | ROB`
- Space: `{Space}: Exhibitions & Artists | ROB`
- A future populated ranking would use `{Name} | ROB`. The shell page title stays `Rankings | ROB` because no list is populated.

Native names stay visible on the page. Density classes EMPTY, LOW_DENSITY (under 8), HISTORY_READY (under 30), and RICH_HISTORY appear only in debug mode.

## 19. Known limitations

- Many stored titles are the venue name (Sato Gallery, Kukje Gallery). The page shows them as stored, so early history can read as a list of galleries.
- Some titles still contain HTML entities (`St&auml;dtisches`) or a damaged string (`Tokyo G1995`). They were not rewritten.
- Storm King is stored with a copyright prefix in the venue. Leeum’s city field is the string “Korea”.
- Country strings are not normalized, so Korea and South Korea are separate Explore filters. Perrotin and 페로탕 갤러리 remain separate spaces.
- Curator coverage is zero.
- The local map is truncated. The list is the factual index.
- Same-year stacks on a dense career (Lee Ufan, Park Seo-Bo) get tall and can sit close to the next year.
- The Moment constellation is only as rich as the documented neighbors. A solo gallery record is a single space label.
- First-party data is per browser. Reset demo data and Export local data are in the footer. Export writes `rob-pilot-local-data.json`.
- Claim does not verify identity.
- Living status, auction prices, dimensions, and search counts are absent, so every ranking stays a shell.
- Five-person testing was not run.

## 20. Production migration implications

Do not copy this prototype into production routes, Prisma, auth, NOW, or SEO until a later decision says so.

What could move later, still as a product question rather than a clearance:

- The search-first home and the artist history as the primary object
- Moment-then-walk, with Back restoring the previous history
- Hybrid provenance labels without a confidence score
- A local contribution flow that does not rewrite official rows
- Ranking and NOW shells that stay empty until the facts exist

What must not move with it:

- The 468 pilot rows, until each record has a production clearance
- The prototype claim flag
- Browser-only DEMO artists
- Density classes as if they were launch rules
- Any artist score, follow graph, or fabricated rank

Previous experiment conclusions were not overwritten.
