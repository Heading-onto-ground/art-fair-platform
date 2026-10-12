# ROB identity alias report

Reviewed 2026-10-12. Lookup uses lowercase, trimmed, collapsed whitespace, Unicode NFKC, and hyphen variants turned into spaces. Letters are not deleted. A shorter name does not match a longer one.

Each alias belongs to one ArtistEntity. Matching is exact on the normalized form of a verified label. There is no fuzzy merge.

## Verified artists

| Artist | Canonical | Native | Extra aliases | Alias source |
| --- | --- | --- | --- | --- |
| lee-ufan | Lee Ufan | 이우환 | Lee U-Fan, Lee U Fan | ROB identity review 2026-10-12 |
| park-seo-bo | Park Seo-Bo | 박서보 | Park Seobo. Park Seo Bo matches the canonical form after hyphen normalization and is not stored again. | ROB identity review 2026-10-12 |
| ha-chong-hyun | Ha Chong-Hyun | 하종현 | Ha Chonghyun. Ha Chong Hyun matches the canonical form. | ROB identity review 2026-10-12 |
| chung-sang-hwa | Chung Sang-Hwa | 정상화 | Chung Sanghwa. Chung Sang Hwa matches the canonical form. | ROB identity review 2026-10-12 |
| yun-hyong-keun | Yun Hyong-keun | 윤형근 | Yun Hyongkeun. Yun Hyong-Keun matches the canonical form. | PKM Gallery estate page for the native name and birth year 1928. Park Seo-Bo Foundation biography for Yun Hyong-Keun. The 1992 Ingong Gallery title already in ROB for Yun Hyongkeun. |
| kim-tschang-yeul | Kim Tschang-Yeul | 김창열 | Kim Tschangyeul. Kim Tschang-yeul matches the canonical form. | PYO Gallery artist page, including the heading KIM Tschangyeul 김창열 and birth year 1929. |
| chung-chang-sup | Chung Chang-Sup | 정창섭 | Chung Chang-Sub | Tina Kim Gallery page for When Process Becomes Form, 2016, which prints Chung Chang-Sup (1927–2011). Encyves Wiki English name Chung Chang-sub for the same person, 정창섭, 1927–2011. |
| kim-whanki | Kim Whanki |  | Canonical form only. | Same Tina Kim Gallery page, Kim Whanki (1913–1974). |
| kwon-young-woo | Kwon Young-Woo |  | Canonical form only. | Same Tina Kim Gallery page, Kwon Young-Woo (1926–2013). |
| kim-guiline | Kim Guiline | 김기린 | Kim Gui-line | Kukje Gallery exhibition page for The Art of Dansaekhwa, 2014, including the Korean participant list 김기린. Gallery Hyundai artist page, Kim Guiline (1936–2021). Seoul Museum of Art collection page, Kim Gui-line, born 1936. |

Normalized lookup examples: `Lee U-Fan` and `Lee U Fan` both become `lee u fan`. `Lee Ufan` stays `lee ufan` and matches only because that spelling is the canonical name. `Lee Fan` does not match.

Alias URLs are not separate pages. A slug built from an alias label resolves to the canonical artist slug.

## Names that stay unresolved

| Name | Possible candidate | Decision |
| --- | --- | --- |
| Chung Chang-Sub | Chung Chang-Sup | Resolved to the existing entity. Encyves Wiki records the English name Chung Chang-sub for 정창섭, 1927–2011, the same birth and death years already recorded for Chung Chang-Sup. The comma-free alias was added explicitly. Normalization alone still does not equate the two spellings. |
| Kim, Guirin | Kim Guiline | Kept unresolved. Kim Guiline was created from the Kukje spelling Kim Guiline and the Korean name 김기린. No source equated the comma spelling Kim, Guirin with that person. |
| Park, Seo-Bo | Park Seo-Bo | Not matched. The comma is kept, so this is not the verified hyphen form. |
| Yun, Hyong-Keun | Yun Hyong-keun | Not matched, for the same comma reason. |
| Kim Tschang-Yeul on the 2025 Tina Kim letters exhibition | Kim Tschang-Yeul | Not linked. The exhibition title names letter authors. His participations in the 1992, 1994, and 2009 exhibitions are linked. |
| Kim Whanki on that same 2025 exhibition | Kim Whanki | Not linked. His participation in the 2016 Brussels exhibition is linked. |
| Kim Hyung Dae | none | Left unresolved. |
| Youn Myeungro | none | Left unresolved. |
