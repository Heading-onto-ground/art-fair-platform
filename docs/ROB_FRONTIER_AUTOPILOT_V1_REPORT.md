# Graph Frontier Autopilot V1

Dry-run on 2026-10-17 against the live public graph. Nothing was written to production. No schedule was added.

The run ranked frontier targets, called Source Discovery, and passed recorded official URLs through the Trusted Crawler. Wikidata did not yield a new institution URL for this batch. New high-confidence exhibitions: 0. That is a yield result, not a ranking failure.

## Ranking

| Rank | Target | Type | Score | Exhibitions |
| --- | --- | --- | --- | --- |
| 1 | Lee Seung Jio | sparse connected | 83 | 2 |
| 2 | Park Hyun-Ki | sparse connected | 83 | 1 |
| 3 | Kim Hyung Dae | unresolved participant | 49 | 0 |
| 4 | 김홍도 | searched missing | 25 | 0 |
| 5 | Kim, Guirin | unresolved participant | 15 | 0 |
| 6 | pending check name | searched missing | 13 | 0 |
| 7 | zzzz no artist | searched missing | 13 | 0 |
| 8 | 이목 | isolated | 4 | 4 |

Youn Myeungro has 4 public exhibitions, so the sparse rule did not select him. Kim, Guirin was not linked to Kim Guiline. Kim Hyung Dae was not created as an entity.

`pending check name` and `zzzz no artist` came from stored `SEARCH_NO_RESULT` rows. They are not treated as artistic importance. Demand cleanup is the next change.

## Crawler outcomes

| Page | Result |
| --- | --- |
| Kukje, Lee Seung Jio, 2022 | `AUTO_IMPORT`, `EXACT` |
| Kukje news, Landlord Colors | `PRESS` |
| National Academy of Arts, Kim Hyung Dae | 12 chronology lines, `REVIEW` |

Lee Seung Jio resolved to painter Q12611925. The voice actor Q12612046 was rejected. Park Hyun-ki Wikidata Q20742226 was not selected: the item is a video artist and television producer, with no official site and no collection.

## Graph at the dry-run

Public artists 17. Low density 4. History ready 9. Rich history 4. Public exhibitions 63. Participations 117. Largest component 13. Shared exhibitions 19. Direct pairs 59. Documented 2-hop paths 143. Three-artist exhibition pairs 267. Isolated artists 4. Unresolved labels 7.

`imported` stayed false.
