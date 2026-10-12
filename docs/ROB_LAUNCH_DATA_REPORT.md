# ROB launch data report

Updated 2026-10-12 after the graph batch `graph-v1`.

Production write followed a table backup. Users stayed 189. Artist profiles stayed 116. Stored decision is `ALLOW_LIMITED` with `FACTUAL_METADATA_ONLY`. That is the stored form of FACTUAL_USE_OK.

## Counts

| Measure | Count |
| --- | ---: |
| Artist entities | 125 |
| Artists with a public exhibition | 13 |
| Rich history (12 or more) | 2 |
| History ready (3–11) | 6 |
| Low density (1–2) | 5 |
| Public exhibitions | 49 |
| Participations | 74 |
| Shared exhibitions (2 or more resolved artists) | 15 |
| Direct artist pairs | 30 |
| Three-artist routes from two different exhibitions | 32 |
| Spaces with 2 or more public exhibitions | 3 |
| Unresolved participant names | 7 |

## Documented artists

| Artist | Exhibitions | Density | Index |
| --- | ---: | --- | --- |
| Ha Chong-Hyun | 18 | RICH_HISTORY | yes |
| Park Seo-Bo | 14 | RICH_HISTORY | yes |
| Lee Ufan | 11 | HISTORY_READY | yes |
| Chung Sang-Hwa | 8 | HISTORY_READY | yes |
| Yun Hyong-keun | 7 | HISTORY_READY | yes |
| 이목 | 4 | HISTORY_READY | yes |
| Kim Tschang-Yeul | 3 | HISTORY_READY | yes |
| 최진주 | 3 | HISTORY_READY | yes |
| Bowon Han | 2 | LOW_DENSITY | no |
| Chung Chang-Sup | 1 | LOW_DENSITY | no |
| Kim Whanki | 1 | LOW_DENSITY | no |
| Kwon Young-Woo | 1 | LOW_DENSITY | no |
| 윤수 | 1 | LOW_DENSITY | no |

이목, 최진주, Bowon Han, and 윤수 were already public. They are not in the Korean exhibition cluster.

## Connected cluster

One component holds nine artists: Chung Chang-Sup, Chung Sang-Hwa, Ha Chong-Hyun, Kim Tschang-Yeul, Kim Whanki, Kwon Young-Woo, Lee Ufan, Park Seo-Bo, and Yun Hyong-keun.

A visitor can continue through real exhibitions, for example Lee Ufan, the 2005 Mainz exhibition, Park Seo-Bo, the 1992 Ingong Gallery exhibition, Yun Hyong-keun, and then Rhythm in Monochrome to Ha Chong-Hyun.

## Unresolved names

| Label | Decision |
| --- | --- |
| Chung Chang-Sub | Left unresolved. Not treated as Chung Chang-Sup. |
| Kim, Guirin | Left unresolved. Not treated as Kim Guiline. |
| Kim Hyung Dae | No identity page verified in this batch. |
| Youn Myeungro | No identity page verified in this batch. |
| Kim Tschang-Yeul on the 2025 letters exhibition | Kept as text. The title names a letter author, not a 2025 exhibitor. |
| Kim Whanki on the 2025 letters exhibition | Kept as text for the same reason. |

## Backup

`C:\Users\USER\Documents\rob-backups\history-before-graph-2026-10-12.json`

Exported 2026-10-12T09:35:41.241Z. 92,599 bytes. SHA256 `4d90c02d5d6f90606965bc4950363fd64896f9512dd71b10d0a7ecc4b69c9445`.

This is a table snapshot, not point-in-time recovery.
