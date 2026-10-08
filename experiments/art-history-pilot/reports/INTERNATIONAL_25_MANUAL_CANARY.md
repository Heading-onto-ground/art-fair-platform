# INTERNATIONAL 25 MANUAL CANARY

Phase P1-M. Production ROB was not changed. Domestic 50 and Emerging 25 were not collected. Phase 1-D was not started. The frozen 100 and the thresholds were not changed. Nothing in this file is cleared for production.

Status: **INTERNATIONAL_CANARY_BELOW_THRESHOLD**

Retrieved 2026-10-08T08:12:58Z. Records: `data/claims/exhibitions.json`. URL log: `data/manifest/international-manual.json`. Every stored row has `usage_status = PILOT_ONLY` and `production_clearance = UNRESOLVED`.

The open-data result from P1-S still stands beside this one. Open data did not restore these histories. This phase asked a different question: whether official public pages, chosen from eligible sites and reduced to explicit facts, produce an international history dense enough to clear the frozen median of 8. They do not.

## What was kept separate

GREEN was not loosened and YELLOW was not recolored. The matrix is still 30 sources: GREEN 2, YELLOW 16, RED 12.

`pilot_manual_research_status` is a different column:

| Status | Count | Meaning in this phase |
| --- | ---: | --- |
| ELIGIBLE | 14 | Public official page, no login, paywall, or CAPTCHA, and no robots block. A person may select a URL and store minimal facts inside the experiment. |
| REVIEW_REQUIRED | 3 | Gwangju Biennale, Pace, Victoria Miro. The page asks for permission first. No records. |
| INELIGIBLE | 13 | Robots disallow, unreadable robots, a blocked API path, or not an official exhibition page. No records. |

ELIGIBLE is not production permission. An Allow in robots.txt was not treated as a license. A Disallow was not treated as a copyright verdict; it only kept the client off that path. Southbank Centre returned HTTP 403 and was left alone. MoMA's artist index returned 200; no artist URL on that index was guessed.

## How URLs were chosen

No artist URL was typed from a name pattern. The client opened the public artist index or homepage of each ELIGIBLE site and kept a link only when the anchor text or the path contained that artist's seed name. Cap: 8 URLs per artist. PDF links were skipped.

Indexes opened:

| Page | HTTP | Artist pages followed |
| --- | ---: | --- |
| kukjegallery.com/artists | 200 | 9 |
| lehmannmaupin.com/artists | 200 | 1 (Do Ho Suh) |
| pkmgallery.com/artists | 200 | 1 (Koo Jeong A) |
| arariogallery.com/artists | 200 | 0 |
| gallerybaton.com/artists | 200 | 0 |
| galleryhyundai.com | 200 | 2 story pages, 0 exhibitions |
| tate.org.uk | 200 | 0 |
| guggenheim.org | 200 | 0 |
| whitney.org | 200 | 0 |
| labiennale.org | 200 | 0 |
| mmca.go.kr | 200 | 1 hash link to the homepage, 0 exhibitions |
| koreaartistprize.org | 200 | 0 |
| southbankcentre.co.uk | 403 | 0 |
| moma.org | 200 | 0 |

Thirteen artist URLs returned 200. Fourteen of the 25 artists had no selected URL at all.

## What was stored

Allowed fields only: title, dates, venue, city, country, people explicitly named on the line, source URL, and an evidence span of at most 200 characters that occurs on the page. No biography, essay, image, or PDF body was stored. No date, curator, or co-artist was filled in when the line did not say it.

Review rules rejected a line when it was a press sentence ("presents", "participates", "subject of"), HTML debris, a comma-separated list of names with no institution, a title that was only the artist's name on a dated block, or a venue that was another exhibition's title. One parsed PKM row, "Kaleidoscope Eyes" at Leeum, was rejected because the artist fact did not attach. Duplicate artist, year, title, and venue keys were skipped. No separate conflict queue was produced.

Accepted exhibitions: 370. Rejected: 1. Curator named on an accepted row: 0. Rows that name two different frozen artists: 6. Rows with more than one name string: 52, mostly the same person in Korean and English.

Source of accepted rows:

| Host | Accepted rows |
| --- | ---: |
| www.kukjegallery.com | 367 |
| www.lehmannmaupin.com | 2 |
| www.pkmgallery.com | 1 |

Nine accepted titles are longer than 90 characters. They are group-exhibition lines whose venue is on the same line, so they were kept. Some city fields keep the extra clause after the venue when the page used more commas. That residue was not rewritten into a cleaner city.

Human minutes per artist were not timed. The fetch itself, with a short delay between pages, finished in about half a minute of machine time.

## Accepted exhibitions

The count is an accepted row on which the frozen artist's own seed name appears. "Own page" is the subset taken from a URL selected for that artist. The median uses the named count. Sorted, the 13th of 25 is 0. The frozen bar is 8, which needs 13 artists at or above 8. Seven artists are at or above 8.

| ID | Artist | Named | Own page | At or above 8 |
| --- | --- | ---: | ---: | --- |
| A01 | Lee Ufan | 131 | 130 | yes |
| A02 | Haegue Yang | 58 | 58 | yes |
| A03 | Do Ho Suh | 2 | 2 | no |
| A04 | Lee Bul | 0 | 0 | no |
| A05 | Kimsooja | 0 | 0 | no |
| A06 | Anicka Yi | 0 | 0 | no |
| A07 | Park Seo-Bo | 88 | 87 | yes |
| A08 | Ha Chong-Hyun | 52 | 50 | yes |
| A09 | Lee Bae | 0 | 0 | no |
| A10 | Chung Sang-Hwa | 3 | 0 | no |
| A11 | Kim Beom | 0 | 0 | no |
| A12 | Minouk Lim | 0 | 0 | no |
| A13 | Koo Jeong A | 1 | 1 | no |
| A14 | Suki Seokyeong Kang | 8 | 8 | yes |
| A15 | Mire Lee | 0 | 0 | no |
| A16 | Gimhongsok | 17 | 17 | yes |
| A17 | siren eun young jung | 0 | 0 | no |
| A18 | Ayoung Kim | 0 | 0 | no |
| A19 | Geumhyung Jeong | 0 | 0 | no |
| A20 | Yeesookyung | 0 | 0 | no |
| A21 | Kyungah Ham | 6 | 6 | no |
| A22 | Im Heung-soon | 0 | 0 | no |
| A23 | Park Chan-kyong | 11 | 11 | yes |
| A24 | Moon Kyungwon | 0 | 0 | no |
| A25 | Nikki S. Lee | 0 | 0 | no |

Median: **0**. Artists with at least 8: **7 / 25**. Artists with none: **14 / 25**.

Chung Sang-Hwa's Kukje page was opened. Its lines did not put an institution on the same line, so his page contributed 0. The 3 named rows are lines on other artists' pages that spell his name. Ayoung Kim's only opened URL was a Gallery Hyundai story page and it contributed 0. Do Ho Suh's two rows are day-ranged Lehmann entries: "서도호: Walk the House" at Tate Modern, and "서도호: Speculations" at Art Sonje Center. A further MMCA-shaped block whose title was only his name was not stored.

Empty, with no selected URL: Lee Bul, Kimsooja, Anicka Yi, Lee Bae, Kim Beom, Minouk Lim, Mire Lee, siren eun young jung, Geumhyung Jeong, Yeesookyung, Im Heung-soon, Moon Kyungwon, Nikki S. Lee.

## Why this status

The canary is not blocked. Eligible official pages opened, and hundreds of explicit exhibition rows were stored for the artists those galleries represent.

The canary is below the threshold. The international median is 0, against a bar of 8 that was not moved. The dense histories belong to Kukje-represented artists. The other official indexes that this phase was allowed to open did not link an exhibition page for most of the 25. Missing open-data rows were not added to the score. No artist was swapped in to raise the median.

The English history shell at `view/index.html` reads these pilot rows only. It is not a production page. The earlier SEO discussion — entity pages, English UI, native-name aliases, "Wikipedia explains the artist, ROB maps the artist" — was not implemented in the app. This canary is the history those pages would need, and the history is not yet dense across the frozen 25.

## Stop

Domestic 50 and Emerging 25 stay untouched. No production migration. No Phase 1-D. GREEN remains the open-data gate. These 370 rows stay `PILOT_ONLY`.
