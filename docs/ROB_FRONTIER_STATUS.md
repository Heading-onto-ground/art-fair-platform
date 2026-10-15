# ROB frontier status

Recorded 2026-10-15 after the chronology batch. States come from `frontierStatus` in `lib/history/growth.ts`.

Search counts already stored as `SEARCH_NO_RESULT` include operator checks from before the operator event existed. Those older rows were not rewritten. New operator checks use `SEARCH_NO_RESULT_OPERATOR` and stay out of demand ranking.

| Artist | State | Decision |
| --- | --- | --- |
| Kim, Guirin | `UNRESOLVED_IDENTITY` | No source equates that comma spelling with Kim Guiline. |
| Kim Hyung Dae | `SOURCE_DISCOVERY` | Identity is verified. The 1994 Gallery 63 title still only names him. A 2018 solo at Jennifer Baahng does not connect him to an ArtistEntity already on the graph, so no entity was created. |
| Youn Myeungro | `IMPORTED` | Four public exhibitions, 2014–2017: Traces of the Spirit, After Drawing, Plateau, and 윤명로, 그때와 지금. Birth year is still unset. `Youn Myeung-Ro` is not an alias. |
| Lee Seung Jio | `IMPORTED` | Kukje Gallery states Lee Seung Jio, 이승조, 1941–1990. Public records are After Drawing, 2016, and the Kukje solo, 1 September–30 October 2022. Death year is not a stored column. |
| Park Hyun-Ki | `IMPORTED` | The Kukje Landlord Colors note lists Park Hyun-Ki and 박현기 as participants. One public exhibition, 2019. Birth and death years are not on that page, so none are stored. |
| Kim Whanki | `IMPORTED` | Three public records. Native name 김환기. |
| Kwon Young-Woo | `IMPORTED` | Seven public records. Native name 권영우. |

The chronology batch did not relink title-only names. Kim Hyung Dae and Youn Myeungro remain `TITLE_MENTION` on the 1994 Gallery 63 record.

The same chronology file was run a second time. It created 0 exhibitions, 0 participations, 0 aliases, and 0 relinks. Users stayed 189.
