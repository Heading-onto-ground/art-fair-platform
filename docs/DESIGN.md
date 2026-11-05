# ROB design system

Any AI or coding agent modifying ROB UI must read `DESIGN.md` before creating or changing public-facing components.

New UI primitives require a documented reason. Do not casually invent new colors, radii, typography, motion curves, or card types.

This document describes the public history product. It is not a redesign. Labels:

- **CURRENT** — present in the rendered product or its stylesheet.
- **NORMALIZED** — the same idea already appears in several values; future UI should use the named token.
- **PROPOSED** — not shipped. Reserved for Search-triggered Discovery and the motion contract. Do not treat it as already on the site.

ROB (Role of Bridge) is an art-history exploration product. The core move is Artist → Exhibition → Artist. It is not a social network, an auction site, a celebrity portal, a giant graph toy, or a gallery marketplace.

## Principles

1. **Content before chrome.** Facts and relationships stay primary.
2. **One bridge at a time.** Guide the reader from one documented context to the next.
3. **Quiet orientation.** Motion explains where the reader came from and what they can open next.
4. **Provenance is part of the interface.** Sources stay visible.
5. **Sparse is allowed.** Do not pad missing records with decoration.
6. **No fake completeness.** Empty years are missing ROB records, not missing activity. The live artist page already says this.
7. **Archival, not antique.** Contemporary and restrained. Do not imitate a museum catalogue, and do not look like a SaaS dashboard.

## Audit before the tokens

Repeated on purpose: warm paper background `#f7f4ef`, ink `#181818`, hairline rules around `#d8d2c8`, Cormorant Garamond for titles, Inter for UI, 1px borders, almost no radius, focus ring `2px solid #181818` offset 3px, page column `1180px`.

Accidental inconsistency: `app/globals.css` tokens (`--bg-primary #FDFBF7`, accent bronze `#8B7355`) belong to the older platform chrome. Public history (`.rh-*`) mostly ignores them and uses its own hex values. Two search buttons exist: the top bar and `.rh-button`.

Legacy surfaces that are not the history language: marketplace, open-call, and studio pages that use the bronze accent and white cards.

One-off values that must not become tokens: `7px` guide dot, `9px` year dot, `240px` count column, `17px` input padding.

## Color

| Token | Value | Role | Use | Do not use |
| --- | --- | --- | --- | --- |
| `--rob-bg` | `#f7f4ef` | page | history, guide, promotion | marketing gradients |
| `--rob-bg-soft` | `#ffffff` at low opacity | selected row, suggestion | active year, selected search row | large filled panels |
| `--rob-text` | `#181818` | ink | titles, body, rules that must read as ink | muted metadata |
| `--rob-text-muted` | `#726d65` / `#8a8580` | secondary | kickers, locale off-state, year counts | long body copy |
| `--rob-line` | `#d8d2c8` / `#d6d0c6` | hairline | lists, year rows, header rule | focus |
| `--rob-line-strong` | `#232323` | input edge | search and forms | decorative boxes |
| `--rob-accent` | none in history UI | — | **PROPOSED:** do not add a second accent | bronze `#8B7355` on history pages |
| `--rob-focus` | `#181818` 2px, offset 3px | keyboard | every custom control already listed in `history.css` | hover-only affordance |
| `--rob-error` | `#8B4A4A` | **CURRENT** only on platform chrome | form failure | history facts |
| `--rob-success` | `#5A7A5A` | **CURRENT** only on platform chrome | — | fake “complete archive” badges |

**NORMALIZED** palette is black, paper, warm gray. No rainbow. The bronze accent stays on legacy platform chrome until those surfaces are intentionally brought into this system.

## Typography

Loaded in `app/layout.tsx`:

- UI sans: Inter 300–600, `var(--font-inter)`, then Inter, system sans. **CURRENT.**
- Editorial serif: Cormorant Garamond 300–700, italic, `var(--font-cormorant)`, then Georgia. **CURRENT.**
- Korean: Inter is Latin-only. Hangul falls back to the system sans. **CURRENT.** A dedicated Korean face is **PROPOSED** and not part of this pass.
- Numbers in counts use the serif display, not tabular figures. **CURRENT.**

| Style | Family | Size | Weight | Line | Tracking | Responsive |
| --- | --- | --- | --- | --- | --- | --- |
| Display / artist title `.rh-title` | serif | `clamp(54px, 8vw, 104px)`; 50–78px under 520px; 48px measured at 320 | 500 | 0.88 | -0.035em | shrinks with viewport |
| Native name `.rh-native` | sans | `clamp(20px, 2.2vw, 28px)` | 400 | inherit | normal | — |
| Lead `.rh-lead` | sans | `clamp(21px, 2.2vw, 28px)` | 400 | inherit | normal | — |
| Count `.rh-count-lead` | serif | `clamp(44px, 5vw, 68px)` | 400 | 0.9 | normal | — |
| Section `.rh-prose h2` | serif | `clamp(28px, 4vw, 40px)` | 500 | inherit | normal | — |
| Moment / path | serif | `clamp(28px, 4vw, 42px)` and `clamp(34px, 4.5vw, 60px)` | 400–500 | tight | normal | — |
| Body prose | sans | 17px | 400 | 1.6 | 0.01em on `body` | — |
| Kicker `.rh-kicker` | sans | 11px | 400 | — | 0.18em, uppercase | — |
| Metadata / year count | sans | 12–14px | 400 | 1.45 | normal | muted |
| Button / input | sans | 16px input, button inherits | 400 | — | normal | input stays 16px to avoid iOS zoom |
| Source | sans | 14px text button | 400 | — | normal | underline |

Do not add a new size step for a single screen. Prefer this scale.

## Space

**CURRENT** values in heavy use: 4, 8, 12, 16, 18, 20, 24, 28, 30, 34, 48, 56, 72, 112.

**NORMALIZED** scale for new work: 4, 8, 12, 16, 24, 32, 48, 64, 96. Map 18/20/28/30 to the nearest step when touching that component. Do not introduce 17 or 37.

| Use | CURRENT |
| --- | --- |
| Page padding desktop | 56px 28px 112px |
| Page padding ≤800px | 38px 20px 104px |
| Header to summary | 48px column gap, 34px bottom padding |
| List row | 18px vertical, top hairline |
| Form gap | 12px |
| Inline path gap | 8px 12px |
| Prose measure | 680px |
| Search measure | 820px |
| Moment copy | 620–760px |

## Layout

Mobile first in the sense that 320px must not scroll sideways. Production Lee Ufan at 320: `innerWidth` 320, `scrollWidth` 320, title 48px.

| Region | Width |
| --- | --- |
| Page `.rh-wrap` | max 1180px, centered |
| Home search | max 820px |
| Prose | max 680px |
| Forms | max 560px |
| Count copy | max 240px |
| Hero still | max 360px desktop, `min(240px, 62vw)` under 800px |

Viewports to check: 320, 390, 768, 1024+, 1440. The history breakpoints in code are 800, 768, 640, and 520. **NORMALIZED** future checks stay on the five widths above; do not add another breakpoint without a reason.

Header is the shared top bar (Now, Search, About, Guide, Contact, Enter, locale). It is platform chrome, visually lighter and denser than the history page. Footer on the artist page is the history foot: partial coverage, add exhibition, sources.

Sticky: the 2px navigation progress is fixed to the top during pending navigation. The moment panel is in-flow on small screens. No second sticky toolbar.

Safe area: not separately padded. **PROPOSED** only if a future mobile shell sits under a home indicator.

## Border, radius, shadow

**CURRENT:** dividers are 1px `#d8d2c8`. Inputs are 1px `#232323`, radius 0, background `rgba(255,255,255,0.3)`. Buttons are square. The only circles are timeline dots (7–9px). Shadow is limited to the timeline pip hover (`history.css` around the pip). Do not add bubbly cards or glassmorphism.

Focus ring is the border substitute for keyboard users.

## Buttons

| Role | CURRENT | Hover | Focus | Disabled |
| --- | --- | --- | --- | --- |
| Primary `.rh-button` | transparent, 1px `#181818`, padding 14px 20px | fill `#181818`, text `#f7f4ef`, 160ms | 2px ink ring | not a separate style; omit the control |
| Text `.rh-text-button` | 14px, underline, offset 3px | none beyond underline | ring | — |
| Back `.rh-back` | text, no border | pointer on fine pointers | ring | hidden when the journey stack is empty |
| Nav chrome | denser, radius 0, border `#E8E3DB` was measured on the top-bar Search | platform hover | must stay visible | — |

Loading is not a spinner on history navigation. A 2px top progress bar runs 280ms ease-out. **CURRENT.**

## Links

Links inherit ink and usually have no underline, except text buttons and the active locale (underline, offset 3px).

| Kind | Treatment |
| --- | --- |
| Artist | name in the row or path; “Enter history” on a moment |
| Exhibition | serif title, place and year as metadata beside it |
| Space | name plus “N exhibitions currently documented” |
| Curator | same row pattern when present; no separate color |
| Source | text button or caption link, still ink |
| Utility | Add an exhibition, Report issue |
| Back | `← Back`, removed at the origin of the trail |

Clickable things are not a blue directory. If a whole row is a link, the row’s hairline and padding are the hit area. Minimum hit height already used on suggestions: 44px. **NORMALIZED** target for new tap rows: at least 44px.

## Components

| Component | Purpose | Rules |
| --- | --- | --- |
| TopBar | product chrome | do not restyle it inside a history page; pass `locale` so `rob_locale` wins |
| Locale switch `.rh-locale` | ko / en on the history surface | pressed = ink + underline; others muted 13px |
| Search | find an artist | one field, one submit, suggestions in a 1px ink panel |
| Search result | bridge into an artist | hairline rows, no cards |
| Artist header | name, native name, partial-history count | serif name, serif count, no fake portrait |
| Timeline | ALL / DECADE / YEAR | empty stretches stay empty |
| Year row | open a year | active row fills the dot and tints the row |
| Moment | one exhibition | title, place, participants, source |
| Path | documented chain on Explore | vertical 1px ink connector, not a graph |
| Back | session trail | one control; disappears when the stack is empty |
| Report issue / Add exhibition | corrections | form max 560px, same inputs as search |
| Public prose `.rh-prose` | guide and principles | 17px, measure 680px |
| CTA group `.rh-cta` | at most two actions | same `.rh-button`, wrap, gap 12px |
| Status | partial coverage | sentence, not a badge farm |

Do: keep the hairline list. Don't: turn Explore into six dashboard cards.

## Density

| State | UI |
| --- | --- |
| EMPTY | one sentence. No illustration, no fake cards. |
| LOW_DENSITY | show the years that exist. Say coverage is partial. |
| HISTORY_READY | timeline plus moments. Still one column of facts. |
| RICH_HISTORY | same timeline. Do not switch to a masonry grid. |

Lee Ufan in production is the rich case: 15 documented exhibitions, years 2005–2026, “Partial history”, “Coverage is partial.”

## Motion

**CURRENT**

- Button color: 160ms `ease`.
- Pip / node: 160ms `ease`.
- Top progress: 280ms `ease-out`.
- Pending navigation veil: opacity after a 200ms delay.
- `prefers-reduced-motion: reduce` removes those transitions and hides `.rh-journey`.

There is no stagger, no count-up, no marquee, no parallax. **CURRENT.**

**NORMALIZED** curves, once motion is added. Do not let each component invent a curve.

- `ROB_FAST` 160ms, existing ease, for hover and color.
- `ROB_STANDARD` 180–260ms ease-out, for a section appearing.
- `ROB_ENTER` 180–280ms ease-out, for crossing Artist → Exhibition → Artist.

Exact ease-out to use when implementing: `cubic-bezier(0.16, 1, 0.3, 1)`. The live site still uses the keyword `ease` / `ease-out`. That keyword is **CURRENT**. The cubic-bezier is **PROPOSED**.

**PROPOSED** primitives, not on the site today:

- Fade in for a header, a moment, a section. 180–260ms.
- Stagger only for timeline rows, connection names, places, curators, search results. 40–70ms between items. Do not stagger paragraphs. The whole sequence stays short.
- Count-up only for a short summary such as “15 exhibitions”, once on first reveal, at most 600ms. Reduced motion shows the final number immediately. Do not replay on scroll.
- Continuity when following a bridge: the previous name fades, the next name appears in the same title position. A complex shared-element animation is out of scope until it is stable.

Avoid: parallax, looping marquee, bounce, large springs, 3D, particle effects, motion that delays the facts.

`prefers-reduced-motion` remains mandatory. Content stays usable with transitions removed.

## Interaction states

| State | CURRENT |
| --- | --- |
| Hover | primary button fills; fine pointers show a pointer on rows |
| Focus | 2px ink outline, offset 3px, on the controls listed in `history.css` |
| Pressed locale | `aria-pressed`, underline |
| Selected tab | History / Connections / Works / About |
| Current zoom | ALL, DECADE, or YEAR `aria-pressed` |
| Current year | filled dot, tinted row |

Keyboard focus must stay visible. Hover is not the only affordance.

## Loading and future discovery

**CURRENT** loading is the 2px bar plus the paper veil. No percentage.

**PROPOSED** for Search-triggered Discovery. Same paper, ink, and hairline. Status is a short list, not a dashboard and not a fake percent:

- UNKNOWN ARTIST
- RESEARCH OFFERED
- RESEARCHING — for example “Identity checked”, “Official sources found”, “Verifying exhibitions”
- PARTIAL RESULT
- NEEDS REVIEW
- HISTORY READY
- SOURCE BLOCKED
- NOT FOUND

Facts appear as they are verified. This task does not implement that flow.

The future artist page is still one world, in layers: History, Moments, People, Places, Curators, Sources. Progressive disclosure, not six equal cards. **PROPOSED** structure. **CURRENT** artist page already has History, Connections, Works, About, plus spaces inside the record.

## Mobile

- 320px: no horizontal overflow on the artist page measured in production.
- Timeline becomes a vertical list under 800px. The horizontal track is hidden.
- Search stacks under 520px. The submit button becomes full width.
- Long names wrap inside the 1180px column. Do not set `white-space: nowrap` on names.
- Korean wraps with the sans fallback. Do not overflow the gutter.
- Back stays on the history page, not only in the browser chrome.
- Source URLs wrap or sit on their own line. Do not let them widen the page.

## Accessibility

- Skip link is present.
- Focus ring is ink on paper.
- Headings: one `h1` on home, artist, and Explore.
- Search input has a label (visually moved off-screen on the promotion field; the home field is named).
- Reduced motion is implemented for history transitions.
- Contrast of `#8a8580` on `#f7f4ef` is the weak pair. Use it for kickers and off-state locales, not for body or sources.
- Errors should be text next to the field, using the existing error color only if the platform form needs it.

## Images

Most records have no image. Layouts must look finished without one. **CURRENT** artist pages work with no hero.

When a cleared image exists (`.rh-still`):

- Desktop column about 220–360px, aligned to the end of the header.
- Small screens cap it at 240px / 62vw.
- Credit and license stay in the caption (production Lee Ufan shows CC BY-SA and Wikimedia).
- No fake placeholder block when the image is absent.

## Sources

A source line names the institution and links out. It sits under the moment, smaller than the title, still readable. Several sources stack as separate lines. External links remain ink. Do not drop provenance to a gray that fails contrast.

## Microcopy

Short, precise, neutral. Say what is documented and what is missing.

Use: “Documented exhibitions”, “Source”, “Coverage is partial”, “Partial history”, “exhibitions currently documented”.

Avoid: “Discover amazing artists”, “Unlock the art world”, “Revolutionary”, “AI-powered insights”.

## Do and don't

Do use thin lines, whitespace, a restrained serif title, provenance, and the exhibition that makes a connection true. Allow a sparse page. Use motion only to orient.

Don't use glassmorphism, neon gradients, a giant network graph, a card grid for every list, decorative parallax, bounce, invented relationship labels, or decoration in an empty state.

## Token reference

| Group | NORMALIZED value |
| --- | --- |
| Color | paper `#f7f4ef`, ink `#181818`, muted `#726d65`, line `#d8d2c8`, strong line `#232323` |
| Type | serif Cormorant Garamond; sans Inter |
| Space | 4, 8, 12, 16, 24, 32, 48, 64, 96 |
| Radius | 0, except timeline dots |
| Border | 1px |
| Motion | **CURRENT** 160ms ease, 280ms ease-out. **PROPOSED** cubic-bezier(0.16, 1, 0.3, 1) |
| Easing | one family. No per-component springs |
| Breakpoint | check 320, 390, 768, 1024, 1440. Code folds at 800, 768, 640, 520 |
| Max width | 1180 page, 820 search, 680 prose |
| Z-index | suggestions 4, veil 70, progress 80 |

## Migration map

| Token | Current | Later |
| --- | --- | --- |
| `--rob-bg` | `#f7f4ef` on `.rh-page` | alias; do not switch history to `--bg-primary` |
| `--rob-text` | `#181818` | keep separate from `--text-primary #1A1A1A` |
| `--rob-line` | `#d8d2c8` | collapse `#d6d0c6` into this when editing that rule |
| `--rob-focus` | outline in `history.css` | one shared rule |
| Bronze `--accent` | platform chrome only | do not import into history |
| `.rh-button` | primary action | reuse for new CTAs |
| `.rh-prose` | guide / why copy | reuse for policy pages |

No stylesheet refactor in this task.

## Surfaces

| Surface | Consistency | Issue | Later action |
| --- | --- | --- | --- |
| Home | history language | top bar is a second, denser chrome | leave the bar; don't restyle it here |
| Artist | strongest expression of the system | two gray hexes for lines | normalize when next editing the timeline |
| Moment | same column and type | continuity into the next artist is a hard navigation | **PROPOSED** fade, not a new layout |
| Explore | Journeys, Moments, Paths, Spaces | long lists, still hairlines | do not turn into cards |
| Why ROB / How to use | same `.rh-*` on the PR branch | not on production yet (both URLs 404 on 24 Oct 2026) | ship with PR #44; do not invent a new page style |
| Mobile 390 | same rules as 320 | title uses a large `clamp` | keep the 520px and 768px caps |

## PR checklist

Before a public UI change:

- It uses the type scale above.
- It uses the spacing scale, or an existing current value slated for normalization.
- It introduces no new color.
- It introduces no new radius.
- It introduces no new motion primitive.
- It works with no image.
- It does not scroll sideways at 320px.
- It respects `prefers-reduced-motion`.
- Provenance is still readable.
- It still feels like paper, ink, and a hairline.

## Future contract

Search-triggered Discovery, Artist World, Places, and Curators must use this file. Research progress uses the status list in the loading section. New sections are layers of one artist, not a dashboard.
