# ROB frontier status

Recorded 2026-10-15, before the next production write. States come from `frontierStatus` in `lib/history/growth.ts`.

Search counts already stored as `SEARCH_NO_RESULT` include operator checks from this project. The public event and `SEARCH_NO_RESULT_OPERATOR` are now separate, and the older rows were not rewritten. Those counts are not treated as public demand.

| Artist | State | Decision |
| --- | --- | --- |
| Kim, Guirin | `UNRESOLVED_IDENTITY` | No source equates that comma spelling with an ArtistEntity. |
| Kim Hyung Dae | `SOURCE_DISCOVERY` | National Academy of Arts member 537 states 김형대, Kim Hyung Dae. A gallery note says born 1936. No entity is created. The 1994 Gallery 63 title names him and does not make him a participant. No accepted exhibition connects him to the current component. |
| Youn Myeungro | `CANDIDATES_READY` | National Academy of Arts member 359 states 윤명로, Youn Myeungro. Birth year is not on that page, so none is stored. After Drawing at Gallery Hyundai, 26 May–10 July 2016, names 윤명로. `Youn Myeung-Ro` is not an alias. |
| Kim Whanki | `CANDIDATES_READY` | Already in the component with one record. 김환기 is added from the Korean and English listings of After Drawing. New records are the 2015 Venice Dansaekhwa exhibition and After Drawing. |
| Kwon Young-Woo | `CANDIDATES_READY` | Already in the component with one record. 권영우 is on the Kukje Landlord Colors news page. Records: Venice 2015, Cranbrook 2019, Two Breaths 2024, and three existing-show enrichments. |

`NO_GO` for this batch: attaching Kim Hyung Dae or Youn Myeungro to the 1994 title, creating Lee Seung Jio or Park Hyun-Ki, and copying a full CV.

The 1992 Ingong Gallery and 1994 Gallery 63 rows had title-only names linked as participants. The batch detaches those links and marks the names `TITLE_MENTION`. Park Seo-Bo, Ha Chong-Hyun, and Chung Sang-Hwa stay on the exhibitions where the launch record listed them as participants.
