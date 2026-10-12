# ROB public-web source policy

ROB uses limited factual metadata from selected public official sources under its internal source-use policy. External permission stays `NOT_OBTAINED` unless a real permission exists.

This is an operational rule. It does not say that facts are free of every legal limit, that a public page may always be reused, or that a `robots.txt` allow is permission.

## Separate fields

| Field | Values | Meaning |
| --- | --- | --- |
| Access | `PUBLIC`, `LOGIN_REQUIRED`, `PAYWALLED`, `TECHNICALLY_BLOCKED` | How the page can be opened |
| `internalUseDecision` | `ALLOW_LIMITED`, `HOLD`, `BLOCK` | Whether ROB may store the narrow factual record |
| `externalPermission` | `GRANTED`, `NOT_OBTAINED`, `NOT_APPLICABLE` | Whether the source operator gave permission |
| Content scope | `FACTUAL_METADATA_ONLY`, `EXPRESSIVE_TEXT`, `IMAGE`, `DATABASE_BULK_CONTENT` | What kind of material it is |
| Publication | `DRAFT`, `PENDING_REVIEW`, `PUBLIC`, `REJECTED` | Whether a visitor can see the record |

`ALLOW_LIMITED` does not mean the institution approved ROB.

## When limited use is allowed

All of these have to be true:

1. The page opens in ordinary public browsing.
2. No login, paywall, or CAPTCHA bypass.
3. No technical circumvention.
4. The source is an official museum, gallery, biennale, public institution, or artist site.
5. ROB stores only minimal factual metadata.
6. ROB does not copy long expressive text or external images.
7. ROB keeps the source URL.
8. ROB does not clone that source's database.
9. No explicit applicable term has been found that prohibits this factual use.
10. ROB offers a correction and removal report.
11. ROB builds its own artist, exhibition, and space graph.

If one of those is uncertain, the decision is `HOLD`. If an applicable term prohibits the use, or the page requires a bypass, the decision is `BLOCK`.

## Visitor language

The public label is `Source: Kukje Gallery`, with a link to the page that was read. It identifies the source of the fact. It does not say the gallery licensed or approved ROB.

## Kukje launch family

`kukjegallery.com` is `ALLOW_LIMITED` with `externalPermission = NOT_OBTAINED` and `contentScope = FACTUAL_METADATA_ONLY`. The launch uses 10 exhibition records from two already-reviewed artist pages. It does not import the rest of either CV.

## Factual use

`FACTUAL_USE_OK` is the product name for the same narrow use as `ALLOW_LIMITED`. Public queries accept both stored values. `REVIEW` is `HOLD`. `DO_NOT_USE` is `BLOCK`.

A public page's year, exhibition title, venue, city, country, and explicitly named participants may be stored when the page needs no login, paywall, or access-control bypass. ROB keeps the source URL and retrieval date, and it rebuilds its own graph. It does not copy biography prose, curatorial essays, reviews, artist statements, or images.

`All Rights Reserved` by itself is not a ban on recording one exhibition fact. A member terms page that forbids infringing intellectual property, without a clause about factual exhibition lines, is not that ban either. An explicit ban on copying the site's text, an automated-collection ban, or a request to reproduce one source catalogue in full stays `DO_NOT_USE` or `REVIEW`.

ROB does not mirror one CV. A source with hundreds of lines contributes a small high-confidence subset. The same fact from a second official page is a separate source decision.
