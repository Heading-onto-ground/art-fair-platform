# ROB design audit

Evidence for `docs/DESIGN.md`. Not a redesign.

## How this was read

`web-to-design-md` (https://github.com/Paidax01/web-to-design-md) was not run. Its README tells publishers to add a license before release, and `LICENSE` returns 404. It also requires `agent-browser`, which is not installed here. None of its code was copied into ROB.

The rules come from production computed styles on 24 Oct 2026 and from `app/components/history/history.css` plus `app/globals.css` on `rob-public-growth` at `2b54b7d`.

## Pages

| Page | Result |
| --- | --- |
| https://rob-roleofbridge.com/ | rendered. Paper `#f7f4ef`, ink `#181818`, title 104px Cormorant at a wide window, column 1180px |
| `/artists/lee-ufan` | rendered. Partial history, 15 exhibitions, timeline, source credit. At 320px, scroll width equals inner width and the title is 48px |
| `/history/explore` | rendered. Sections are Journeys, Moments, Paths, Spaces |
| `/about/why-rob`, `/about/how-to-use` | 404 on production. The styles exist on the unmerged PR branch as `.rh-prose`, `.rh-path`, `.rh-cta` |

390, 768, and 1440 were not remeasured in this pass. 320 and a wide desktop window were. Earlier PR preview measurements for the two about pages remain in the PR #44 report.

## Inconsistencies to leave for later

- History hexes and the platform tokens in `globals.css` disagree by a few steps (`#f7f4ef` vs `#FDFBF7`, `#181818` vs `#1A1A1A`).
- Hairlines use both `#d8d2c8` and `#d6d0c6`.
- Muted text uses both `#726d65` and `#8a8580`.
- The top bar and `.rh-button` are different controls.
- Korean text uses a system fallback because Inter is loaded for Latin only.
- Reduced motion hides `.rh-journey` entirely instead of only removing the transition.

No code was changed.
