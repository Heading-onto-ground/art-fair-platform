# INTERNATIONAL 25 SEARCH-DISCOVERY RESCUE

Phase P2-A. Production ROB was not changed. Domestic 50 and Emerging 25 were not collected. The frozen 100 and the threshold were not changed.

The earlier official-index canary stays **INTERNATIONAL_CANARY_BELOW_THRESHOLD**. Its research label is **OFFICIAL_INDEX_DISCOVERY_INSUFFICIENT**. That label is not a new pass/fail score. It says the previous method followed names inside current official indexes. It did not test whether a public search engine could point at an official page that the index no longer links.

This file is the separate rescue test. Status: **INTERNATIONAL_SEARCH_RESCUE_BELOW_THRESHOLD**

Retrieved 2026-10-08T09:15:42Z. Records: `data/claims/exhibitions.json`. Run log: `data/manifest/search-rescue.json`. Every stored row has `usage_status = PILOT_ONLY` and `production_clearance = UNRESOLVED`.

## What the test asked

Can bounded web search find official pages that, once opened, document enough exhibition history for the frozen International 25?

The bar is unchanged: median at least 8 accepted exhibitions per artist, which requires at least 13 of 25 artists at 8 or more. The cohort was not replaced.

## How discovery worked

Search was a phone book. A snippet could suggest a URL. No date, title, venue, artist, or curator was stored from a snippet. The client then opened the official page, honored robots.txt, and kept a row only when the fetched page itself contained the fact.

Eighteen artists were below 8 before this test. Each one received the same cap: at most 10 discovery queries and 10 candidate URLs. The run used 19 queries and 54 URLs. Lee Bul had 2 queries. Everyone else in the rescue set had 1. No artist was searched past the cap.

`reviewMinutes` is null. The fetches were automated inside the cap. A timed human review was not measured, so no minute value was invented. A reviewer can fill `data/review/time-log.json` later. The 45-minute operational warning is not triggered by an unmeasured clock.

## Access

| Outcome | URLs |
| --- | ---: |
| Page opened | 43 |
| Robots unreadable, queued, not extracted | 8 |
| HTTP 403, not bypassed | 2 |
| HTTP 404 | 1 |

The eight queued URLs are kimsooja.com exhibitions and biography, UCCA Anicka Yi, MFAH Anicka Yi, korean-pavilion.or.kr, sirenjung.com, and both geumhyungjeong.com pages. MoMA calendar and UMMA returned 403. Kunsthal Aarhus returned 404. None of those were treated as verified.

Nine opened pages produced accepted rows. Thirty-four opened pages produced none. The usual reason was that the fetched HTML had no title, date, and venue cluster together. Several of those museum pages are client-rendered. Their search snippets were not copied in to fill the gap.

Accepted pages:

| Page | New accepted rows |
| --- | ---: |
| Johyun Gallery, Lee Bae biography | 65, plus 3 attached to an existing key |
| yeesookyung.com/cv | 25 |
| Esther Schipper, Lee Bae | 2 |
| The Page Gallery, Im Heung-soon | 2 |
| Storm King, Anicka Yi | 1 |
| Lévy Gorvy, Chung Sang-Hwa New York | 1 |
| Chapter II press page for Kim Beom at Leeum | 1 |
| ICA London, Geumhyung Jeong | 1 |
| Art Sonje, Kyungah Ham | 1 |

GREEN and YELLOW were not recolored. Pace stayed REVIEW_REQUIRED and was not fetched. Ocula, K-ARTNOW, artsandculture.co.kr, and PDFs were not used as evidence.

## Scorecard

Counts below are after one exact canonical merge. Two Kukje pages described the same 2025 Tina Kim Gallery exhibition, with the same title, year, venue, and the same two artists. Those two rows are now one exhibition with two source URLs. Five other pairs share a gallery name, a year, and a venue, but the title is only the gallery name. Those stayed separate. Merging them would treat two artists' undated-title CV lines as one show.

Median: **2**. Artists at 8 or more: **9**. The bar is 13. The test is four artists short.

| Artist | Before | After |
| --- | ---: | ---: |
| Lee Ufan | 131 | 130 |
| Haegue Yang | 58 | 58 |
| Do Ho Suh | 2 | 2 |
| Lee Bul | 0 | 0 |
| Kimsooja | 0 | 0 |
| Anicka Yi | 0 | 1 |
| Park Seo-Bo | 88 | 87 |
| Ha Chong-Hyun | 52 | 52 |
| Lee Bae | 0 | 67 |
| Chung Sang-Hwa | 3 | 4 |
| Kim Beom | 0 | 1 |
| Minouk Lim | 0 | 0 |
| Koo Jeong A | 1 | 1 |
| Suki Seokyeong Kang | 8 | 8 |
| Mire Lee | 0 | 0 |
| Gimhongsok | 17 | 17 |
| siren eun young jung | 0 | 0 |
| Ayoung Kim | 0 | 0 |
| Geumhyung Jeong | 0 | 1 |
| Yeesookyung | 0 | 25 |
| Kyungah Ham | 6 | 7 |
| Im Heung-soon | 0 | 2 |
| Park Chan-kyong | 11 | 11 |
| Moon Kyungwon | 0 | 0 |
| Nikki S. Lee | 0 | 0 |

Lee Ufan and Park Seo-Bo each dropped by one because the Tina Kim exhibition is no longer counted twice.

Artists rescued from below 8 to 8 or more: **Lee Bae, Yeesookyung**.

Still at zero: Lee Bul, Kimsooja, Minouk Lim, Mire Lee, siren eun young jung, Ayoung Kim, Moon Kyungwon, Nikki S. Lee.

## Unique exhibitions and incidences

| Count | Number | Meaning |
| --- | ---: | --- |
| Unique canonical exhibitions | 468 | One row per accepted exhibition |
| Artist↔exhibition incidences | 474 | One count per frozen artist on that exhibition |
| P1-M baseline | 370 unique, 377 incidences | Official-index canary, before this rescue |

The sum of the After column is 474. An exhibition that names two frozen artists is counted for each of them and once in the unique total. Six incidences sit on top of 468 exhibitions: five shows name more than one frozen artist, and one of those names three.

`search-rescue.json` also contains `incidences: 588`. That figure counts stored name strings. Many rows store both the Korean name and the English name of one person. 588 is not the incidence count.

Primary source hosts for the 468 exhibitions: Kukje 366, Johyun 65, yeesookyung.com 25, Lehmann Maupin 2, Esther Schipper 2, The Page Gallery 2, and one each from PKM, Storm King, Lévy Gorvy, Chapter II, ICA, and Art Sonje. The merged Tina Kim exhibition keeps a second Kukje URL on `additionalSources`.

Curators stored: 0. Explicit co-participants who are also in the frozen International cohort: 5 exhibitions.

Unresolved identity, unchanged and not auto-merged: Kim Beom, Mire Lee, Gimhongsok, Ayoung Kim, Yeesookyung. Yeesookyung's CV was accepted from her own site without a Wikidata QID. No birth year is shown for her in the prototype.

No separate date-conflict queue was opened. Conflicting dates were not averaged.

## Quality notes that do not move the verdict

Thirty-six of the 65 Johyun rows for Lee Bae use the gallery name as the exhibition title. The same extractor already did this for older Kukje CV lines. If those 36 were set aside, Lee Bae would still have about 31 titled rows, which is still at least 8. Yeesookyung's 25 rows do not have this pattern. Setting the 36 aside would not create a 13th artist at 8 or more.

Three stored titles still contain HTML entities (`&ucirc;`, `&Ucirc;`, `&szlig;`). The Storm King venue was stored as `©2026 Storm King Art Center`. These are extraction defects. They were not repaired by copying a search snippet.

## Verdict

The bounded search was completed. Pages were opened and new official records were stored. The original median was not met. The status is **INTERNATIONAL_SEARCH_RESCUE_BELOW_THRESHOLD**, not BLOCKED and not SUPPORTED.

Even a later manual read of the eight robots-unreadable pages would have to add four more artists to the group of nine. That work is outside this cap. The crawler should not be loosened to get there.
