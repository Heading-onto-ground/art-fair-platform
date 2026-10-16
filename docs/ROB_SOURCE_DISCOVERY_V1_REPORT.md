# Source Discovery V1.1

Preview run on 2026-10-16. Trusted Crawler participation, duplicate, provenance, and import gates were not changed. Nothing was written to production.

Decision: `ROB_SOURCE_DISCOVERY_ADAPTERS_TOO_THIN`

The single blocker is that the new institution records do not satisfy the frozen completeness gate. Tate’s exhibition roster resolves explicit participants, but the page does not state a country, so the fact stays `REVIEW` / `INCOMPLETE_FACT`. Cleveland’s exhibition API has a title, dates, and venue, and does not name participants. No new adapter produced `NEW` + `AUTO_IMPORT_ELIGIBLE`.

## Baseline

Trusted Crawler V1 was squash-merged as PR #34.

| | |
| --- | --- |
| Merge SHA | `fc21c114963b86109361afecb1824c57cbb58e1a` |
| Main CI | success, run 38889261553 |
| Production deployment | 7117029929, success |

Output: `DISCOVERED_TRUSTED_SOURCE_CANDIDATES`

`imported` stayed false. `--write` and `--import` still exit `PRODUCTION_WRITE_DISABLED`. The live graph snapshot was loaded read-only.

## Identity

Participation matching is unchanged. Source discovery may use a parenthetical native label when exactly one human visual artist matches a verified alias. The parenthetical string is not stored as an alias.

| Artist | Resolved entity | Basis | Rejected |
| --- | --- | --- | --- |
| Park Seo-Bo | Q4984536 | exact alias | encyclopedia Q103961027 |
| Lee Ufan | Q399775 | exact alias | none |
| Ha Chong-Hyun | Q23068024 | exact alias | none |
| Yun Hyong-keun | Q73668649 | exact alias | encyclopedia Q103979730 |
| 이승조 | Q12611925 | structured native label | voice actor Q12612046, disambiguation Q12611923, Q12611924 |

이승조 resolves to the painter item because the label is “이승조 (화가)”, the entity is a human painter, and the native label is the verified alias 이승조. It does not resolve to the voice actor. No official source candidate was found for him, so zero candidates is the result. “이승조 (화가)” was not added as an alias.

Wrong person or institution links: 0. Search pages used as provenance: 0.

## Source candidates

| Artist | Candidates |
| --- | --- |
| Park Seo-Bo | MoMA, Art Institute of Chicago, Tate, Cleveland Museum of Art |
| Lee Ufan | Kröller-Müller, Dallas Museum of Art, nga.gov, MoMA, Tate, Kunsthaus Zürich, Guggenheim |
| Ha Chong-Hyun | MoMA, Art Institute of Chicago |
| Yun Hyong-keun | Art Institute of Chicago, Tate, Cleveland Museum of Art |
| 이승조 | 0 |

Four of five artists have at least one trusted candidate. Discovery readiness remains `ROB_SOURCE_DISCOVERY_V1_READY`.

## Adapter coverage

MoMA HTML and the Art Institute HTML site returned HTTP 403 to the crawler, so MoMA was left on the existing API adapter and Cleveland replaced it for this phase. The Art Institute’s own API did respond. New adapters are Tate, the Art Institute of Chicago, and the Cleveland Museum of Art. Guggenheim’s homepage is still the old API adapter and returned `NO_STRUCTURE`.

| Page type | What the run saw |
| --- | --- |
| EXHIBITION | Tate “Working With Nature” and “Transnational Cities”; Cleveland “Material and Immaterial” and “Juxtaposition and Juncture” |
| ARTIST_PROFILE | Tate artist pages and the Art Institute agent record. `NO_EXHIBITION_FACT` |
| COLLECTION_OBJECT | Cleveland artwork records. `NO_EXHIBITION_FACT` |
| ARCHIVE_INDEX | Tate and Cleveland homepages. `NO_EXHIBITION_FACT` |
| PRESS | none in this run |
| SOURCE_UNAVAILABLE | MoMA and artic.edu HTML |

| Exhibition | Adapter | Decision | Duplicate | Why |
| --- | --- | --- | --- | --- |
| Working With Nature: Traditional Thought in Contemporary Art from Korea, 8 April–21 June 1992, Tate Liverpool | Tate | REVIEW | NEW | Explicit roster includes Park Seo-Bo, Lee Ufan, and Yun Hyong-keun. Country is absent, so `INCOMPLETE_FACT` |
| Transnational Cities Tokyo and London | Tate | REVIEW | none | Official search result with no explicit participant roster |
| Material and Immaterial in Korean Modern and Contemporary Art, 28 April 2023–25 February 2024 | Cleveland | REVIEW | NEW | Title, dates, and venue only. `NO_PARTICIPANT_LIST` |
| Juxtaposition and Juncture in Korean Modern and Contemporary Art | Cleveland | REVIEW | NEW | Title, dates, and venue only. `NO_PARTICIPANT_LIST` |
| LEE SEUNG JIO, Kukje Gallery, 2022 | existing Kukje adapter | AUTO_IMPORT | EXACT | Already recorded. Duplicate control only |

New-adapter `AUTO_IMPORT_ELIGIBLE`: 0. `EXACT` duplicate: 1, from the frozen Kukje page. Factual exhibition records came from two new adapters, Tate and Cleveland. The Art Institute agent page was an artist profile and correctly returned `NO_EXHIBITION_FACT`.

Collection objects and prose descriptions were not turned into exhibitions. The Cleveland description text was not stored.
