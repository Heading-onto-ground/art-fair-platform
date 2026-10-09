# ROB public beta content gate

Decision: launch seed imported under `ALLOW_LIMITED`. External permission remains `NOT_OBTAINED`.

Vercel Production uses the same Supabase project as the verified `.env` session-pooler connection, ref prefix `vvdx`, region `ap-south-1`. The additive history schema and the artist-entity backfill are applied. Pilot records were not imported. Nothing was deployed.

The content model is no longer “an approved external source is required before any history can be public.” Publication, provenance, and indexing are separate questions. Counts below are production records only.

## Five different sets

| Set | Question it answers | Current production count |
| --- | --- | --- |
| Publicable content | May a visitor see this record? | 10 legacy public exhibitions |
| Official-source-backed content | Is there an approved external source? | 0 |
| First-party content | Did an authorized artist, gallery, institution, or an existing account create it? | 10 `LEGACY_FIRST_PARTY` |
| SEO-eligible content | Is the public page dense enough to index? | 0 artists at `HISTORY_READY` or `RICH_HISTORY` |
| Graph-connected content | Does an exhibition link two artist entities? | 0 paths |

These five are not one “approved sources” number.

## Production audit after backfill

| Count | Value |
| --- | --- |
| ArtistProfiles | 116 |
| ArtistEntities | 116, each linked to one profile |
| Users | 189, unchanged by the schema and backfill |
| Exhibitions | 13, of which 10 are public |
| Legacy first-party public exhibitions | 10 |
| Creatorless public exhibitions | 0 |
| Private exhibitions left private | 3 |
| Artists with >= 1 / >= 3 / >= 8 / >= 12 public exhibitions | 4 / 2 / 0 / 0 |
| HistoryParticipation rows | 10 |
| Bridge exhibitions / paths | 0 / 0 |
| Spaces with >= 1 / >= 3 / >= 8 public exhibitions | 10 / 0 / 0 |

No birth year was copied from `startedYear`. Two canonical names belong to more than one entity, and those entities stayed separate. Provenance for the 10 public exhibitions is `LEGACY_FIRST_PARTY` with source clearance `NOT_APPLICABLE`. They are not labeled official sources.

The first-party seed does not meet the beta minimum: there is no artist with 8 public exhibitions and no Artist → Exhibition → Artist path.

## Clearance seed

`data/production-clearance/candidate-seed.json` is `NOT_REVIEWED`. It is not imported.

The selector used accepted pilot exhibitions and kept a small connected subset:

| Artist | Pilot exhibitions | Launch subset | Shared exhibitions |
| --- | --- | --- | --- |
| Lee Ufan | 130 | 8 | 1 |
| Park Seo-Bo | 87 | 3 | 3 |
| Ha Chong-Hyun | 52 | 2 | 2 |
| Chung Sang-Hwa | 4 | 1 | 1 |

The launch subset has 3 bridge exhibitions and 2 source URLs, both on `kukjegallery.com`. The PB5 dossier leaves both URLs at `REVIEW_REQUIRED`. No source is `APPROVED`, and nothing was imported. See `docs/ROB_KUKJE_SOURCE_CLEARANCE.md`. A page must not say 130 exhibitions unless 130 production records exist.

## Publication

`DRAFT`, `PENDING_REVIEW`, `PUBLIC`, `REJECTED`.

A record can become `PUBLIC` on either path:

- External documented record: origin `ROB_RESEARCHED`, an external source, source clearance `APPROVED`, and the record accepted.
- First-party record: an authorized contributor, the record accepted, and the origin shown. An artist-submitted record does not need an official source.

## Provenance

`ROB_RESEARCHED`, `ARTIST_SUBMITTED`, `GALLERY_SUBMITTED`, `INSTITUTION_SUBMITTED`, `LEGACY_FIRST_PARTY`.

External source clearance is `APPROVED`, `REVIEW_REQUIRED`, `REJECTED`, or `NOT_APPLICABLE`. First-party records with no external source use `NOT_APPLICABLE`. They are not marked `APPROVED`.

Visitor labels:

- `Official source` only when an external source is `APPROVED`
- `Artist added` for a verified artist record without that source
- `Artist + official source` when both are true
- `Gallery added` and `Institution added` the same way
- `Pending review` before a claim is approved. A logged-in user cannot label someone else's page `Artist added`

`LEGACY_FIRST_PARTY` is used only for an existing public exhibition whose `createdBy` is an artist profile and which was not written by a crawler. A missing creator is not treated as first-party.

## SEO

Public is not indexed.

| Class | Public exhibitions | Index |
| --- | --- | --- |
| `EMPTY` | 0 | noindex |
| `LOW_DENSITY` | 1–2 | noindex |
| `HISTORY_READY` | 3–11 | eligible |
| `RICH_HISTORY` | 12 or more | eligible |

A public artist-added page with one or two exhibitions stays on ROB and stays `noindex`.

## Minimum beta experience

This is a beta, not the finished art-world database. The seed is ready only when all of these are true:

- at least 3 artist histories with a public exhibition
- at least 1 of those histories has 8 or more public events
- at least 1 real Artist → Exhibition → Artist path
- at least 1 space page with a real exhibition

International coverage, curators, rankings, and hundreds of artists are not required.

## What was not done

- Pilot records were not imported.
- No source was marked `APPROVED`.
- Nothing was pushed or deployed.
- The local `.env.local` port 6543 credential was not changed.

`npx tsx scripts/history-content-gate.ts` still prints `PUBLIC_BETA_DATABASE_GATE_BLOCKED` and does not connect unless `ROB_CONFIRM_DATABASE=1` and `ROB_CONFIRM_RECOVERY=1`. The production counts in this document came from the controlled migration scripts, not from that read-only gate script.
