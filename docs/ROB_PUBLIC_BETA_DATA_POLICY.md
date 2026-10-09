# ROB public beta data policy

Pilot records are not production records.

Every pilot exhibition remains `PILOT_ONLY` with `production_clearance = UNRESOLVED`. The 468-record pilot file is not imported by a page, a route, or a script in this phase. `POST /api/admin/history/import` refuses a `PILOT_ONLY` or `UNRESOLVED` body and does not read the pilot dataset even when a body says `APPROVED`.

## Clearance

| State | Public history |
| --- | --- |
| `APPROVED` | Can be shown and, if the page is dense enough, indexed |
| `REVIEW_REQUIRED` | Stored, not shown as an official source, not in the history sitemap |
| `REJECTED` | Not shown |
| `UNRESOLVED` / `PILOT_ONLY` | Not a production permission |

An artist-submitted exhibition is marked artist-added. Its optional source URL stays `REVIEW_REQUIRED` until a person approves that source.

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

Public beta should open with a few dense, production-cleared histories. It should not open with hundreds of thin names. See `docs/ROB_PUBLIC_BETA_CONTENT_GATE.md`.

## Existing accounts

Backfill creates one entity per existing artist profile and links it. It does not delete works, exhibitions, or accounts. First-party public exhibitions remain visible through the existing `ExhibitionArtist` relation.
