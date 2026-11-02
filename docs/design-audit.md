# ROB design audit

Audit date: 2026-10-24
Reference: public ROB plus the public-growth branch surfaces available at the time of audit.

No redesign was performed. No production stylesheet was changed as part of this audit.

## Audit result

`ROB_DESIGN_SYSTEM_READY`

## Extraction tool status

`web-to-design-md` was reviewed as a possible extraction aid but was not executed. The local environment did not have `agent-browser`, and the referenced repository did not expose a LICENSE at the time of review. Third-party code was not copied into ROB.

## Surfaces reviewed

- Home
- Lee Ufan artist history
- Explore
- public-growth styles for `/about/why-rob`
- public-growth styles for `/about/how-to-use`

At the time of the original audit, the two about pages were not yet on production. They later shipped in PR #44.

## Viewports

Observed during the design audit:

- wide desktop window
- 320px

Lee Ufan at 320px: `scrollWidth <= innerWidth`; title approximately 48px.

390, 768, and 1440 were not re-measured during this specific design-document pass. PR #44 had separate width QA for its public pages.

## Observed design values

### Colors

- paper: `#f7f4ef`
- ink: `#181818`
- history rule: `#d8d2c8`
- alternate globals rule: `#d6d0c6`
- strong/input border: `#232323`
- legacy bronze: `#8B7355`

`#8a8580` was judged too low-priority/low-contrast for body text and should not be promoted to body copy.

### Type

- Cormorant Garamond: title/editorial role
- Inter: UI role
- Korean: system fallback in current product

### Width / spacing

- page: ~1180px
- prose: ~680px
- search: ~820px
- repeated gaps: 8, 12, 16, 24, 28, 48, 56px

### Responsive behavior

- one-column ROB history layout
- timeline becomes vertical below ~800px
- search controls stack below ~520px
- audited 320px artist page had no horizontal overflow

### Interaction

- hover fill: approximately 160ms
- focus ring: approximately 2px ink with 3px offset
- existing progress motion: approximately 280ms ease-out
- existing reduced-motion support

## Surface consistency table

| Surface | Consistency | Audit note | Action |
| --- | --- | --- | --- |
| Home | high | search-led, quiet hierarchy | preserve |
| Artist history | high | strongest expression of ROB identity | use as primary reference |
| Moment | high | factual detail and source should stay dominant | preserve |
| Explore | medium-high | Journeys, Moments, Paths, Spaces fit product model | keep one-bridge-at-a-time principle |
| Why ROB | high with PR #44 styles | public prose extends `.rh-*` language | preserve after merge |
| How to use | high with PR #44 styles | same prose system | preserve after merge |
| Mobile 320 | high in audited artist page | no horizontal overflow | maintain as hard target |

## Intentional inconsistencies left open

1. `#d8d2c8` and `#d6d0c6` both exist as line colors.
2. History styling and globals token naming are not fully unified.
3. Korean typography uses the system fallback stack.

Do not create a cleanup PR for these alone. Normalize when a real product component needs the shared primitive.

## Future contract

Search-triggered Discovery, Artist World sections, and contextual bridge motion were documented as **PROPOSED**, not as existing product behavior.

The next public UI work must read `docs/DESIGN.md` before implementation.
