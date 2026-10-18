# Growth yield V1

Decision: `ROB_GROWTH_ENGINE_V1_READY`

Autopilot was already merged in PR #41 (`78194143079fe191dec21be7cc5732c35c281945`). Demand separation was merged in PR #42 (`b021639e7c5dcdc450415d0a07693c8a28f74582`). This change adds institution-first discovery and stops two internal check strings from ranking the frontier. No daily cron was added.

## Demand

`SEARCH_NO_RESULT` rows before `2026-10-15T14:28:15.000Z` stay `LEGACY_MIXED`. They are not deleted.

`pending check name` (2026-10-15T16:42:09Z) and `zzzz no artist` (2026-10-15T16:41:47Z) were stored as `SEARCH_NO_RESULT` after that split. They are internal check strings, so reads classify them `INVALID_QUERY`. The rows remain. `김홍도` is not on that list: two post-split searches still count as real visitor demand.

Frontier after that filter, once Lee Seung Jio had 13 exhibitions:

1. park-hyun-ki
2. Kim Hyung Dae
3. 김홍도
4. Kim, Guirin
5. artist-44
6. artist-71
7. artist-78
8. bowon-han

`pending check name` and `zzzz no artist` are absent.

## Discovery

Kukje Gallery's public artist directory matched Lee Seung Jio and only that exact alias. The chronology parser reads rows under Selected Solo Exhibitions and Selected Group Exhibitions when a heading names the artist. Biography, untitled lines, and press are skipped. Tate result pages are fetched only as hints and are kept only when the page contains an exact alias. Sitemap indexes for Gallery Hyundai, Cleveland, and Guggenheim did not contain alias URLs. No crawler gate was loosened.

The first 11-target dry run found 11 new high-confidence exhibitions, all for Lee Seung Jio, from `https://www.kukjegallery.com/artists/view?seq=413`. Two already recorded Kukje rows stayed exact. Twelve National Academy of Arts lines stayed in review.

## Import

The 11 new rows were previewed with 0 review, 0 unresolved names, and exact identity `lee-seung-jio`. Production write, without a code deploy:

- exhibitions 11
- participations 11
- aliases 0
- relinks 0

Backup: `history-before-growth-2026-10-18T01-58-24-265Z.json`, sha256 `1e79c077b09c3266fe6e90995583f2d89534282aa7b4c8da40a444cae7f3779e`.

Repeat preview: 11 exact. Repeat import: 0 exhibitions, 0 participations, 0 aliases, 0 relinks. Cache invalidation completed. The public artist page shows 13 exhibitions, Explore lists Lee Seung Jio 2010–2025, and the sitemap contains the new exhibition URLs.

## Graph

| | Before | After |
| --- | ---: | ---: |
| Public artists | 17 | 17 |
| Low density | 4 | 3 |
| History ready | 9 | 9 |
| Rich history | 4 | 5 |
| Public exhibitions | 63 | 74 |
| Public participations | 117 | 128 |
| Largest component | 13 | 13 |
| Shared exhibitions | 19 | 19 |
| Direct pairs | 59 | 59 |
| Documented 2-hop paths | 143 | 143 |
| 3-artist routes | 267 | 278 |
| Isolated artists | 4 | 4 |
| Unresolved labels | 7 | 7 |

The connected-artist gap to 30 is 17. The exhibition gap to 150 is 76. Shared exhibitions did not increase because the new rows name only Lee Seung Jio. The limiting factor is still source yield for the next frontier names, not ranking.
