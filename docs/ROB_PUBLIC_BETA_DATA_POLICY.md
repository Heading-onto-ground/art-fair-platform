# ROB public beta data policy

A factual record can be public without an institution approving ROB. External permission and ROB's internal use decision are separate. See `docs/ROB_PUBLIC_WEB_SOURCE_POLICY.md`.

`internalUseDecision = ALLOW_LIMITED` with `externalPermission = NOT_OBTAINED` means ROB stored a narrow factual record from a public official page and linked back to it. The visitor label is `Source: [name]`. That label is provenance. It is not a claim that the source approved ROB.

A factual record can be public without being an official source. Three questions stay separate:

1. Publication eligibility: `DRAFT`, `PENDING_REVIEW`, `PUBLIC`, `REJECTED`.
2. Provenance: `ROB_RESEARCHED`, `ARTIST_SUBMITTED`, `GALLERY_SUBMITTED`, `INSTITUTION_SUBMITTED`, `LEGACY_FIRST_PARTY`.
3. SEO eligibility: density. A public page may stay `noindex`.

## Two ways onto the public history

An external documented record is public only when its origin is `ROB_RESEARCHED`, it has an external source, that source clearance is `APPROVED`, and the record itself is accepted.

A first-party record is public when an authorized contributor submitted it and it was accepted. The origin is shown. It does not have to become an official source. With no external source, source clearance is `NOT_APPLICABLE`.

An approved claim on that artist entity is required before the record is public and labeled `Artist added`. Before approval the record stays `PENDING_REVIEW` and is not labeled as the artist. The same rule will apply to gallery and institution submissions.

`Official source` is shown only when an approved external source exists. `Artist added` is never promoted to that label without one. Both together read `Artist + official source`.

## Pilot records

Every pilot exhibition remains `PILOT_ONLY` with `production_clearance = UNRESOLVED` until that specific record is reviewed. The 468-record pilot file is not imported by a page, a route, or a script. `POST /api/admin/history/import` does not read the pilot dataset.

A `PILOT_ONLY` record can be selected only by its own id, and only when that id is in the approved set with review decision `APPROVED`. Approving one record does not approve the rest of its source. The route still does not write while the database target and recovery path are unconfirmed. An import log, when a write is later allowed, keeps the pilot record id, production entity id, source decision, imported time, and process.

`data/production-clearance/source-review.json` is the clearance queue. Rights that are unclear stay `REVIEW_REQUIRED`. Public access and `robots.txt` are not a reuse license. This phase selected no candidates and approved none.

## Legacy first-party records

An existing public `Exhibition` is `LEGACY_FIRST_PARTY` only when `createdBy` is an artist profile and the row was not produced by a crawler. It is not relabeled as an official source. Rows with no creator are not treated as first-party.

## What is not invented

- No January 1 or December 31 for a year-only date.
- No biography.
- No follower count, like count, or artist score.
- No "close connection", "influenced", or "discovered". Shared history is "N documented shared exhibitions", with the exhibitions listed.
- No fuzzy merge of artists, spaces, or branches.
- No user account for an unresolved participant.
- No external artwork image.
- `Tokyo G1995` stays unresolved. The source detail can say "Data under review".
- Country display maps only unambiguous aliases: Korea, South Korea, Republic of Korea, ROK, 대한민국, and 한국 display as Korea. North Korea stays North Korea.

## Launch set

The beta can open on a few real histories and one artist-to-artist exhibition path. It does not need the International 25, curators, rankings, or hundreds of artists. See `docs/ROB_PUBLIC_BETA_CONTENT_GATE.md`.

## Existing accounts

Backfill creates one entity per existing artist profile and links it. It does not delete works, exhibitions, or accounts. It was not run in this phase.
