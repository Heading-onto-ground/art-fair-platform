# ROB Design System

Status: authoritative public UI contract
Audit baseline: 2026-10-24
Product: ROB — Role of Bridge

> Any AI or coding agent modifying ROB public UI must read this file before creating or changing public-facing components.

## How to read this document

- **CURRENT**: observed in the current ROB product and treated as the existing contract.
- **NORMALIZED**: preferred implementation standard when a new component needs that primitive.
- **PROPOSED**: future rule. Use it only when the current task explicitly implements that feature.

Do not invent new colors, type scales, radii, card patterns, motion curves, or interaction primitives without documenting why.

## Product design principles

### Content before chrome — CURRENT
Art-historical facts, chronology, relationships, and provenance are primary. Interface decoration stays secondary.

### One bridge at a time — CURRENT
ROB guides a visitor from one documented context to the next. It does not default to a giant network graph.

### Quiet orientation — NORMALIZED
State changes should help the visitor understand where they came from, where they are, and what can be opened next.

### Provenance is interface — CURRENT
Sources are part of the trust model, not a hidden footnote.

### Sparse is allowed — CURRENT
Sparse data is not padded with invented content, fake imagery, or decorative cards.

### No fake completeness — CURRENT
Missing ROB records are presented as incomplete coverage, not absence of artistic activity.

### Archival, not antique — NORMALIZED
ROB should remain contemporary, restrained, precise, and editorial. Do not imitate an old catalogue literally.

## Core visual character

ROB should feel calm, archival, editorial, precise, quiet, contemporary, and alive without being flashy.

ROB is not a social network, auction dashboard, celebrity portal, generic gallery marketplace, or graph visualization toy.

## Color

### CURRENT

| Role | Value | Notes |
| --- | --- | --- |
| paper background | `#f7f4ef` | main ROB history surface |
| ink | `#181818` | primary text |
| line | `#d8d2c8` | primary history divider |
| alternate line | `#d6d0c6` | existing globals/history inconsistency |
| strong/input line | `#232323` | input and strong boundary |
| legacy bronze | `#8B7355` | legacy platform chrome, not a default ROB history accent |

`#8a8580` must not be used as body text.

### NORMALIZED semantic names

When a new public ROB component actually needs tokens, prefer:

- `--rob-bg`: `#f7f4ef`
- `--rob-text`: `#181818`
- `--rob-line`: use the current surface's existing line token until the global/history mismatch is intentionally migrated
- `--rob-line-strong`: `#232323`

Do not perform a broad token refactor merely because these names are documented.

## Typography

### CURRENT

- Editorial/title serif: Cormorant Garamond.
- UI sans: Inter.
- Korean currently falls through to the system font stack.
- Artist/page title on the audited 320px Lee Ufan page: 48px.

Do not change the Korean font as an isolated cleanup task. Revisit only when a new public component genuinely needs a typography decision.

### NORMALIZED hierarchy

Prefer the existing ROB hierarchy rather than creating one-off sizes:

- display / artist title: editorial serif
- section title: editorial serif
- lead: restrained large body
- body: UI/body stack
- metadata / provenance / labels: compact UI stack
- buttons / inputs: UI stack

A new font size requires a documented reason.

## Spacing

### CURRENT

Repeated values observed in the public history UI:

`8, 12, 16, 24, 28, 48, 56px`

Observed width rules:

- page container: approximately `1180px`
- prose: approximately `680px`
- search: approximately `820px`

### NORMALIZED

Prefer existing repeated spacing values before adding a new one. Avoid arbitrary one-off values unless the layout requires them.

## Layout

### CURRENT

- Primary ROB history layout is one-column and editorial.
- Timeline becomes a vertical list below roughly 800px.
- Search controls stack below roughly 520px.
- 320px Lee Ufan page was verified without horizontal overflow.

### NORMALIZED viewport contract

Public ROB work must remain usable at:

- 320
- 390
- 768
- 1024+
- 1440

No public feature may assume desktop hover or wide horizontal space.

## Borders, radii, shadows

### NORMALIZED

Prefer thin rules, quiet separators, restrained radii, and little or no shadow. Do not turn ROB into a grid of rounded SaaS cards.

New radius families or shadow systems require a documented product reason.

## Interaction states

### CURRENT

- button hover: ink fill, approximately 160ms
- focus: visible 2px ink outline with approximately 3px offset
- reduced-motion support already exists in the history surface

Keyboard focus must remain visible. Hover must never be the only affordance.

## Component inventory

### CURRENT

Canonical public primitives include:

- TopBar
- LocaleSwitch
- Search
- SearchResult
- ArtistHeader
- Timeline
- TimelineYear
- TimelineEvent
- Moment
- Journey / Path
- JourneyContinueLink
- Space entry
- Source entry
- Back control
- Report issue
- Add exhibition
- Public prose
- CTA group

Explore sections are:

- Journeys
- Moments
- Paths
- Spaces

New product UI should extend these patterns instead of introducing a parallel visual language.

## Information density

### CURRENT

ROB supports:

- `EMPTY`
- `LOW_DENSITY`
- `HISTORY_READY`
- `RICH_HISTORY`

Sparse pages remain honest and quiet. Rich pages should add hierarchy, not visual noise.

## Provenance

### CURRENT

A source explains where a fact was verified. It does not imply endorsement by the institution.

Source UI must be present, legible, secondary to the factual record, and easy to inspect. Do not bury provenance in tiny low-contrast text.

## Images

### CURRENT

ROB must work perfectly with no artist image. Never use fake or generic placeholder imagery.

When an approved image exists, usage rights and credit remain part of the presentation contract.

## Copy

### NORMALIZED

ROB product copy should be short, precise, neutral, and transparent about incomplete coverage.

Prefer:

- Documented exhibitions
- Source
- Coverage is partial
- Researching official sources
- 3 documented intersections

Avoid promotional interface language such as "amazing", "revolutionary", "unlock", or unsupported "AI-powered insights".

## Motion

### CURRENT

Observed motion includes:

- approximately 160ms `ease` on micro interaction
- approximately 280ms `ease-out` on progress movement
- approximately 200ms delayed paper-colored veil in an existing transition
- `prefers-reduced-motion` disables transitions

### PROPOSED motion vocabulary

Do not create a separate decoration pass. Use these only when the feature being implemented benefits from orientation.

1. **Fade in** — artist header, exhibition Moment, section entry. 180–260ms.
2. **Stagger** — exhibition, connected artist, place lists. 40–70ms between items.
3. **Shared ease-out** — one consistent curve for navigation/entry. Micro interactions 120–180ms.
4. **Restrained count-up** — concise summary numbers only, first meaningful reveal, <=600ms.

Do not use marquee, parallax, bounce, large slide, decorative particles, or spring-heavy motion.

`prefers-reduced-motion` removes stagger delays, count-up animation, and positional transitions and shows final content immediately.

### PROPOSED bridge transition

The highest-value motion case is contextual continuity:

`Lee Ufan → 2005 exhibition → Park Seo-Bo`

When technically stable, the previous artist context may fade briefly and the next artist context appear in the same visual territory so the visitor feels they crossed a documented bridge rather than opened an unrelated page.

Do not use complex shared-element animation if it threatens history state, Back restoration, performance, or accessibility.

## Search-triggered Discovery

### PROPOSED product states

`UNKNOWN ARTIST → RESEARCH OFFERED → RESEARCHING → PARTIAL RESULT → HISTORY READY`

Alternative outcomes:

- `NEEDS REVIEW`
- `SOURCE BLOCKED`
- `NOT FOUND`

The discovery experience is not a dashboard.

Progress must represent real pipeline state. Never show a fake percentage.

Unverified facts must never look equivalent to verified ROB history.

The product language is not "AI is working". It is "ROB is gradually uncovering this artist's documented world."

Suggested initial copy:

- `아직 ROB에 기록이 없습니다. 이 작가의 기록을 찾아볼까요?`
- `ROB가 {artist}의 기록을 찾고 있습니다.`

Real stages may include:

- identity checked
- official sources found
- exhibition records being verified
- documented intersections being assembled

The first verified fact should begin the artist world immediately. Do not wait for a notionally complete job before showing verified history.

## Artist World

### PROPOSED

The future artist page may progressively expose, only when supported by facts:

- History
- Moments
- People
- Places
- Curators
- Sources

These are layers of one documented world, not six dashboard cards.

Artist↔Artist remains derived through shared exhibition evidence. Never style an inferred relationship as a factual direct edge.

## Loading and progress

### NORMALIZED

Prefer meaningful status text to a generic spinner when the system has real staged progress. Never fabricate work or completion.

## Accessibility

### CURRENT / NORMALIZED

- preserve skip link
- preserve visible keyboard focus
- preserve reduced motion
- maintain semantic headings
- label forms and errors
- keep mobile tap targets usable
- do not rely on color alone

Accessibility is part of the component contract, not a final polish pass.

## Mobile

### CURRENT / NORMALIZED

- 320px remains a hard compatibility target
- avoid horizontal overflow
- long names and Korean wrapping must be allowed
- source URLs must not force overflow
- timeline and Back must remain usable by touch
- no desktop-only navigation assumption

## Design drift checklist

Every public UI PR should answer:

- Does it use the existing type hierarchy?
- Does it reuse existing spacing values?
- Does it introduce a new color?
- Does it introduce a new radius or shadow family?
- Does it introduce a new motion primitive?
- Does it work without images?
- Does it work at 320px?
- Does it respect reduced motion?
- Does it keep provenance visible?
- Does it still feel like ROB?

If a new primitive is necessary, document the reason here before treating it as part of the system.

## Do / Don't

### Do

- use thin lines and whitespace
- use restrained serif hierarchy
- show provenance
- show why a connection exists
- allow sparse pages
- use motion only for orientation

### Don't

- glassmorphism
- neon gradients
- giant network graphs as the default experience
- card grids for everything
- decorative parallax
- bouncing UI
- invented relationship labels
- fake image placeholders
- decoration used to hide missing data

## Known inconsistencies intentionally not fixed yet

- history line color `#d8d2c8` vs globals `#d6d0c6`
- history and globals token naming differ
- Korean uses the system fallback stack

These are not independent cleanup tasks. Resolve only when a product feature actually requires a common token or typography primitive.
