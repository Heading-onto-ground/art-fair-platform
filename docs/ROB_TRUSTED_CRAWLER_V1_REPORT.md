# Trusted Source Auto Crawler V1

Preview run on 2026-10-16. The production graph was loaded read-only. Nothing in this run was written to production.

Decision: `ROB_TRUSTED_CRAWLER_V1_READY`

## Pages

| | Count |
| --- | --- |
| HTTP requests | 7 |
| Pages parsed | 8 evaluations, including one repeated URL served from the job cache |
| Failures | 0 |
| Facts extracted | 19 |
| Duplicates already recorded | 2 |
| New candidates | 3 |
| Review candidates | 14 |
| Unresolved explicit identities | 1 |
| AUTO_IMPORT_ELIGIBLE | 3 |
| Production writes | 0 |

Requests by domain:

| Domain | Requests |
| --- | --- |
| kukjegallery.com | 3 |
| arariogallery.com | 1 |
| galleryhyundai.com | 1 |
| mmca.go.kr | 1 |
| naa.go.kr | 1 |

The second pass of Kukje `seq=295` used the cached response and did not fetch the page again.

## Duplicate

Kukje Gallery, Lee Seung Jio, 1 September–30 October 2022.

https://www.kukjegallery.com/exhibitions/view?seq=245

`EXACT`. Already recorded. 0 new exhibitions. 0 new participations.

The same new Kukje page was parsed twice in one job. The second pass resolved `EXACT`, not `NEW`.

## New record

Kukje Gallery, Park Seo-Bo, *Changing Unchanging 변하는 변하지 않는*, 24 August–18 October 2026, Seoul.

https://www.kukjegallery.com/exhibitions/view?seq=295

Artist link `Park Seo-Bo` is an explicit participant and an exact verified identity. Venue `Kukje Gallery` matches a verified space alias. Date precision is `DAY`. Duplicate status `NEW`.

`AUTO_IMPORT_ELIGIBLE`. Preview only.

A second eligible record from the same run: MMCA, *Park Seo Bo: The Untiring Endeavorer*, 18 May–1 September 2019, Seoul. The artist field is `Park Seo Bo`. The organizer field contains the verified alias `MMCA`. Description text was not stored.

https://www.mmca.go.kr/eng/exhibitions/exhibitionsDetail.do?exhId=201905030001151

## Multiple participants

Kukje Gallery, *Korean Abstract Art: Kim Whanki and Dansaekhwa*, 8 November 2018–2 March 2019, Seoul.

https://www.kukjegallery.com/exhibitions/view?seq=214

Explicit artist links, all exact:

- Chung Chang-Sup
- Chung Sang-Hwa
- Ha Chong-Hyun
- Kim Whanki
- Kwon Young-Woo
- Lee Ufan
- Park Seo-Bo

`AUTO_IMPORT_ELIGIBLE`. An unresolved name on the same explicit list does not block the known artists. That case is covered by the unit test: Lee Ufan is eligible and `Unknown Participant` stays unresolved.

## Review, not eligible

| Page | Result |
| --- | --- |
| Arario, *Plateau*, 2016 | `REVIEW`. The heading name is not participant evidence. `YOUN Myeung-Ro` stays unresolved. |
| Gallery Hyundai, *Moon Mind*, 2026 | `REVIEW`. Christine Sun Kim is explicit and unresolved. |
| National Academy of Arts member page | 12 factual rows kept for review. Award-only lines were dropped. Rows are not participations, because a CV subject line is not an explicit participant list. |

## Policy

MMCA public pages are parsed for title, date, venue, city, country, explicit artist, and explicit curator. Prose and images are not stored. A page that cannot be fetched is `SOURCE_UNAVAILABLE`, which is separate from a rights block.

A long foundation CV is not stored as one document. Dated factual rows are selected, capped at 12, and deduplicated against the graph. They are not imported as a block.

Only `EXPLICIT_PARTICIPANT` with a deterministic identity can enter the preview batch. Title-only names do not.
