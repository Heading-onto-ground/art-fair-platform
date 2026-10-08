# CORE EXPERIENCE REFINEMENT

Phase P4.1. Visual refinement only. No new product areas. No new public-web collection. No production migration.

Status: **CORE_EXPERIENCE_REFINED**

This is not market validation and it is not production-ready.

Baseline remains **FULL_PRODUCT_PROTOTYPE_V3_READY**. `view/` and `view-v2/` are unchanged. Production ROB was not changed.

## 1. Baseline

P4 is the frozen product shell: Home, Search, Explore, Rankings shell, Now, Space, Curator states, Start your history, Claim prototype, Provenance, localStorage contribution, and mobile navigation.

P4.1 works inside `experiments/art-history-pilot/view-v3/`. Presentation rules that must stay testable live in `src/display.ts`. The client mirrors them in `view-v3/app.js` because the prototype does not fetch or import modules.

Source records were not rewritten. `data/claims/exhibitions.json` is unchanged.

## 2. Dense timeline problem

Lee Ufan has 130 documented exhibitions from 1967 to 2026, across 54 years. Drawing one full label, or one unbounded tower, for every exhibition made the career unreadable.

The first question on the page is now "When was this artist active?" The titles stay one click away.

## 3. New timeline behavior

Three deterministic levels. There is no free zoom.

| Level | What the axis shows |
| --- | --- |
| All | Full career. First year, latest year, density, gaps, clusters. No titles. |
| Decade | Ten years, with the sentence "Showing 1970–1979. The documented career runs 1967–2026." |
| Year | The same full career axis, with one year opened underneath. |

All and Year keep the whole span so the opened year stays in place. Decade is the only level that tightens the axis.

## 4. Year clustering

Each year is one mark. A year shows at most four dots. The real count is the number under a taller year (Lee Ufan has years of 5 and 6). Opening a year lists every exhibition in that year. Counts are not replaced by a fake date.

Open circles are year-only. Filled circles are a month or a day. Lee Ufan's accepted rows in this pilot are year-only, so his axis is open circles. The legend states the difference.

## 5. Moment redesign

The moment opens under the selected year on desktop, and as a bottom sheet on a narrow screen. It is not a side drawer.

Order:

1. Exhibition title
2. Date
3. Space, city, country
4. Other documented artists, the space, and a curator when one exists
5. Source, behind the provenance control

If the title and the venue are the same phrase, the phrase is printed once. The stored record is unchanged.

A moment shows at most seven satellites at first (other artists, then space, then one curator). Further artists are a `+ N artists` control. A record with only the artist and a space uses one stem. A record with no other artist says so, and does not invent a constellation.

## 6. Artist-to-artist transition

Checked path: Lee Ufan → The Making of Modern Korean Art… (Tina Kim Gallery, New York, 2025) → Park Seo-Bo.

The crossing is a paper card, about 640ms:

- Lee Ufan
- the exhibition title
- a vertical line
- Park Seo-Bo

The card then fades and Park Seo-Bo's timeline is already there. The breadcrumb appears after the motion. Reduced motion skips the card and still completes the navigation.

## 7. Back / context restoration

Back reverses that hop. Returning from Park Seo-Bo restored:

- Lee Ufan
- zoom `year`
- focus `2025`
- the same exhibition moment

The trail is one hop: previous artist / exhibition / current artist, plus "You came here through …". It does not grow into a tree.

## 8. Mobile behavior

At 390px the history is a vertical year list: year, a few dots, the true count. Tapping a year opens that year inline. Tapping an exhibition opens a bottom sheet. Tapping Park Seo-Bo closes the sheet onto his vertical timeline and keeps the same one-hop trail. There is no horizontal graph on the phone.

## 9. Display normalization

Presentation only, in `src/display.ts`.

- HTML entities decode for display. `St&auml;dtisches Museum Leverkusen` renders as Städtisches Museum Leverkusen. The JSON title is unchanged.
- Unambiguous country labels such as South Korea, Republic of Korea, ROK, 대한민국, and 한국 display as Korea. North Korea stays North Korea.
- `Tokyo G1995` is not repaired. The timeline shows the stored title. Source detail adds "Data under review".

## 10. Accessibility

Year marks expose year, true count, and precision in the accessible name. The visible legend repeats the open/filled rule. Zoom controls use `aria-pressed`. The mobile sheet is a dialog and moves focus to Close. `prefers-reduced-motion: reduce` removes the journey card and the timeline rise, and Back, year opening, and artist crossing still work.

Connection names are buttons with a pointer, a 44px target on the year rows and the phone sheet, and a small hover shift. They are not blue links.

## 11. Tests

`npx vitest run --config experiments/art-history-pilot/vitest.config.ts`

24 tests passed, including the previous pilot suite.

Added coverage:

- Lee Ufan's dated events sum to 130 inside year groups
- visible dots plus overflow equal the true count, and visible dots never exceed 4
- career span 1967–2026
- All, Decade, and Year spans
- signature columns
- HTML entity decoding, including `Br&ucirc;lée`
- `Tokyo G1995` left unchanged and marked uncertain
- Korea aliases, and North Korea left alone
- title/venue duplication omitted in the place line
- restored Back URL with event, zoom, and focus
- journey stops and reduced-motion flag
- satellite cap, with the space kept
- Park Seo-Bo remains a documented share of Lee Ufan
- Park Chan-kyong has history and Lee Bul has none

## 12. Screenshots

`reports/screenshots/core-refinement/`

1. `01-home.png`
2. `02-lee-ufan-career-overview.png`
3. `03-lee-ufan-dense-year.png` — 1978, 6 exhibitions
4. `04-moment.png` — Tina Kim Gallery, Park Seo-Bo
5. `05-connection-transition-destination.png` — Park Seo-Bo after the crossing
6. `06-back-restored-state.png` — 2025 and the same exhibition restored
7. `07-park-chan-kyong-medium-density.png` — 11 exhibitions, 1997–2026
8. `08-lee-bul-empty.png`
9. `09-mobile-history.png`
10. `10-mobile-moment.png`

The 390 layout was checked in the browser. Those two captures sit in a wider screenshot frame, so the phone column is on the left.

## 13. Remaining visual problems

- The history signature is the same density logic as the timeline, but at header size it can still read as a tight dot texture.
- On the full 1967–2026 axis, one pair of neighboring year marks still touches.
- The crossing is a title card and a fade, not a single motion that keeps the exhibition dot fixed on screen while the old timeline recedes.
- The trail prints the exhibition title in the path and again in the sentence.
- Lee Ufan's pilot dates are year-only, so filled circles do not appear on his axis.
- Strings such as "Antwerp · Germany" were left as stored when the intended correction was not unambiguous.

## 14. Recommendation for next development step

The scene to remember now works in the prototype: a long career is legible, one year opens, one exhibition shows who was there, and choosing that artist unfolds their time.

Do not add Explore, Rankings, Now, or Claim behavior next. The following step, when it is started, is a scoped production public beta of this scene. This pilot is not that beta.
