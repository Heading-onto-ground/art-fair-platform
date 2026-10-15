# ROB frontier status

Recorded 2026-10-15, before the next production write. States come from `frontierStatus` in `lib/history/growth.ts`.

Search counts already stored as `SEARCH_NO_RESULT` include operator checks from this project. The public event and `SEARCH_NO_RESULT_OPERATOR` are now separate, and the older rows were not rewritten. Those counts are not treated as public demand.

| Artist | State | Decision |
| --- | --- | --- |
| Kim, Guirin | `UNRESOLVED_IDENTITY` | No source equates that comma spelling with an ArtistEntity. |
| Kim Hyung Dae | `SOURCE_DISCOVERY` | National Academy of Arts member 537 states 김형대, Kim Hyung Dae. A gallery note says born 1936. No entity is created. The 1994 Gallery 63 title names him and does not make him a participant. No accepted exhibition connects him to the current component. |
| Youn Myeungro | `IMPORTED` | National Academy of Arts member 359 states 윤명로, Youn Myeungro. Birth year is not on that page, so none is stored. After Drawing at Gallery Hyundai, 26 May–10 July 2016, names 윤명로. He is in the largest component with one record. `Youn Myeung-Ro` is not an alias. |
| Kim Whanki | `IMPORTED` | Three public records, including the 2015 Venice Dansaekhwa exhibition and After Drawing. Native name 김환기. |
| Kwon Young-Woo | `IMPORTED` | Seven public records. Native name 권영우. Records include Venice 2015, Cranbrook 2019, Two Breaths 2024, and three enrichments of existing exhibitions. |

`NO_GO` for this batch: attaching Kim Hyung Dae or Youn Myeungro to the 1994 title, creating Lee Seung Jio or Park Hyun-Ki, and copying a full CV.

The 1992 Ingong Gallery and 1994 Gallery 63 rows had title-only names linked as participants. The write detached those five links and marked the names `TITLE_MENTION`. Park Seo-Bo, Ha Chong-Hyun, and Chung Sang-Hwa stay on the exhibitions where the launch record listed them as participants.

The same batch was run a second time after the write. It created 0 exhibitions, 0 participations, 0 aliases, and 0 relinks. Users stayed 189 and artist profiles stayed 116.
