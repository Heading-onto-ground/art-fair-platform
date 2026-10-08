# SOURCE POLICY REPAIR

Phase P1-S. Production ROB was not changed. The frozen 100 were not replaced. Thresholds were not changed. Exhibition crawling was not resumed. `data/claims/exhibitions.json` still has no records. This report does not score that empty graph as a failed cohort.

Checked at 2026-10-07T17:50:03Z. Matrix: `data/policy/source-policy-matrix.json`. Identity sidecar: `data/identity/wikidata.json`. The seed file `data/seed/artists.json` was left untouched.

## 1. What was wrong with the previous policy model

`decideReuse` turned five different questions into one `approved` flag:

1. May an automated client fetch this URL?
2. Is the content licensed for reuse?
3. Is there an official structured-data interface?
4. Are there contractual or database-right limits?
5. May ROB store one small structured fact?

A `Disallow` then blocked the source as if it were a copyright refusal. An `Allow`, or a missing license badge, blocked storage as if the page had no usable facts. Wikidata's CC0 structured data was dropped because `/w/api.php` is disallowed. MMCA was held because 공공누리 type 1 applies only where the mark is attached, and that hold stopped every other source too.

Those questions are now separate columns. A robots rule is not a license. An Allow rule is not permission to reuse the page. The old function remains in `src/policy.ts` so the earlier tests still describe the mistake. It is not the collection gate.

## 2. Wikidata access path selected

Structured statements on Wikidata are CC0, including commercial reuse. That license does not make a disallowed path usable.

| Path | robots for this client | Pilot use |
| --- | --- | --- |
| `www.wikidata.org/w/api.php` | `Disallow: /w/` wins. The `mobileview` Allow does not cover this path. | Not used. The old lookup script now refuses to run. |
| `query.wikidata.org/sparql` and `/bigdata` | `Disallow` for `User-agent: *`. | Not used, even though the query service is officially documented. |
| `www.wikidata.org/wiki/Special:EntityData/{QID}.json` | `Allow: /wiki/Special:EntityData/*.` is longer than `Disallow: /wiki/Special:EntityData/` and `Disallow: /wiki/Special:`. | Selected. |
| Wikidata dumps | Official, not fetched. A full dump is not a practical request for this repair. | Not used. |

QID discovery did not call either blocked Wikidata API. For each frozen artist the script requested the English or Korean Wikipedia article under that artist's own seed names, read only `wgWikibaseItemId`, and then requested the EntityData JSON. Article paths are allowed for `User-agent: *`. Wikipedia prose was not stored.

A match is confirmed only when the entity label or alias matches the seed and the description identifies a visual artist. Flagged ambiguous names must match both the Korean label and an English seed name. Two seed rows sharing one QID would be marked ambiguous and would not merge. None did. Birth year is stored from statement precision. A year-only value does not become 1 January.

## 3. Wikidata identity completion for the frozen 100

| Cohort | Confirmed | Unresolved | Ambiguous |
| --- | ---: | ---: | ---: |
| International 25 | 20 | 5 | 0 |
| Domestic institutional 50 | 13 | 37 | 0 |
| Emerging 25 | 0 | 25 | 0 |
| Total | 33 | 67 | 0 |

Unresolved international seats: Kim Beom, Mire Lee, Gimhongsok, Ayoung Kim, Yeesookyung. No confirmed row was written back into the frozen seed.

Example, stored from EntityData rather than from the seed file: Haegue Yang, `Q1567689`, Korean label 양혜규, aliases Hae-gue Yang, Hague Yang, Yang HaeGue, birth 1971-12-12 at day precision.

Four confirmed rows have no Korean label on the entity (Anicka Yi, Kyungah Ham, Choi Jeong Hwa, Kang Seung Lee). They matched a distinctive English label and an artist description, with no conflicting Korean label. They are not merges with another seed row. A reviewer can reject them from the evidence URL without changing the resolution rule.

`participant in` (`P1344`) was counted and not turned into exhibition records.

## 4. GREEN / YELLOW / RED

30 rows. GREEN 2. YELLOW 16. RED 12.

GREEN

- Wikidata `Special:EntityData`. CC0 structured data. Official JSON path robots allows.
- data.go.kr OpenAPI 15058313, 문화체육관광부 전시정보 (국립현대미술관). The catalog page says 이용허락범위 제한 없음. Calling it requires an API key. This phase did not apply for a key and did not call it.

YELLOW, public page or catalog, reuse not explicit enough to store facts

- `www.mmca.go.kr` — 공공누리 type 1 only where that page carries the mark. Not a sitewide grant and not a sitewide ban.
- `koreaartistprize.org`
- `www.kukjegallery.com`, `www.galleryhyundai.com`, `www.pkmgallery.com`, `www.arariogallery.com`, `www.gallerybaton.com`, `www.lehmannmaupin.com`
- `www.tate.org.uk`, `www.moma.org`, `www.guggenheim.org`, `whitney.org`, `www.southbankcentre.co.uk`, `www.labiennale.org`
- `www.e-flux.com` — corroboration tier only, even if a later review changed the color
- data.go.kr file 15137158, 국립현대미술관 전시프로그램 정보. The fetched catalog HTML did not contain 이용허락범위 제한 없음, so it stays YELLOW. That may be a rendering gap, not a closed license.

RED

- Wikidata Action API and Wikidata Query Service. CC0 reuse, disallowed automated path. The license column stays CC0.
- `sema.seoul.go.kr`, `mediacityseoul.kr`, `songeun.or.kr`. Robots disallow the target. Reuse is still unspecified.
- `www.gwangjubiennale.org`, `www.pacegallery.com`, `www.victoria-miro.com`. Robots allow the site, and the terms require prior permission.
- `www.busanbiennale.org`, `www.hakgojae.com`, `www.hauserwirth.com`, `www.diaart.org`. Robots could not be read on recheck. Automation stays stopped. This is not a copyright verdict.

## 5. GREEN exhibition-capable sources

Two interfaces could create exhibition records under this policy. Neither did, in this phase.

- EntityData can carry `participant in` statements. Across the international 25, treating unresolved artists as zero, the median count is 0. Four artists have any statements: Lee Ufan 2, Haegue Yang 1, Chung Sang-Hwa 3, Moon Kyungwon 1. Domestic: Jeon Joonho 1. Emerging: 0. These are unchecked statement counts, not accepted exhibitions.
- The MMCA OpenAPI on data.go.kr is an official exhibition dataset, but it was not retrieved. Coverage of the frozen 100 is unknown. It is one museum's listings, not a career history.

No other reviewed source is GREEN.

## 6. Can the International-25 canary proceed?

The identity pass can. Twenty of the 25 now have a confirmed QID from an allowed CC0 document.

The exhibition pass cannot. GREEN data in hand does not reconstruct those careers: the Wikidata statement median is 0, and the only other GREEN exhibition interface was not called because it needs a key. YELLOW museum and gallery pages are where those histories are published, and this phase correctly stores nothing from them.

Do not score that as `PIVOT_NOT_SUPPORTED`. The cohort was not collected. Status remains incomplete. Do not start Phase 1-D.

## 7. Remaining legal and data-access blockers

- `/w/api.php` and `/sparql` stay closed for this client. EntityData can identify a person. It does not, for this 100, supply the exhibition graph.
- data.go.kr 15058313 is GREEN only as a license and access class. There is no key, and no response was stored.
- File dataset 15137158 still has no explicit reuse sentence in the HTML that was fetched.
- YELLOW pages need a separate legal reading before systematic extraction. Korean copyright law can protect a database maker. That reading was not done here.
- RED robots blocks and explicit "prior permission" terms stay blocked. Unreadable robots stay blocked.
- Emerging artists have no confirmed QID, and SongEun, the selection source for that cohort, is RED for automation. A GREEN exhibition path for those 25 was not found.
- Commercial launch still needs counsel for Korea and for the other countries whose sites are in the matrix. This repair does not provide that opinion.

Without the YELLOW sources, accepted exhibition records for all 100 artists remain 0. That is the supply measurement. The open interfaces found here support an identity layer and one key-gated MMCA dataset. They do not yet support an exhibition history for the international 25. Filling the gap by loosening the rules would answer a different question from the one this phase was meant to settle.
