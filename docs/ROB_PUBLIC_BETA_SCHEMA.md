# ROB public beta schema

Additive only. No existing table or column is dropped.

The database target was not confirmed in this phase, so this SQL was not applied.
Do not guess which database `DATABASE_URL` points at. Read the host, take a backup from that provider, then apply the file once.

## Apply order

1. Confirm the database host and take a backup.
2. Run `prisma/sql/add-rob-public-beta-history.sql` in that database's SQL editor.
3. Only then run `npx tsx scripts/backfill-artist-entities.ts` with `ROB_CONFIRM_DATABASE=1`.
4. Do not import `experiments/art-history-pilot/data/`.

`scripts/backfill-artist-entities.ts` refuses to write unless `ROB_CONFIRM_DATABASE=1`.
It links each `ArtistProfile` that does not already have an entity. It does not merge two profiles because they share a name. `startedYear` is not copied into `birthYear`.

## What changed

- `Exhibition.createdBy` may be null, so a historical exhibition does not need an account. Existing rows keep their creator.
- New tables, all unused by the old pages until a query asks for them:
  - `ArtistEntity` — canonical artist. No `userId`. Optional unique `profileId` points at one existing `ArtistProfile`.
  - `ArtistAlias`
  - `ArtistEntityClaim` — `PENDING`, `APPROVED`, `REJECTED`. The note is admin-only.
  - `ExhibitionHistoryMeta` — slug, date precision, year/month/day parts, clearance, contributor kind.
  - `HistoryParticipation` — artist entity to exhibition. Existing `ExhibitionArtist` rows are untouched.
  - `HistoryUnresolvedName` — ambiguous or unknown participant labels. No fake user is created.
  - `SpaceSlug`, `CuratorSlug`
  - `HistorySource`, `ExhibitionSource`
  - `HistoryImportRecord` — staging only. `PILOT_ONLY` cannot be published.
  - `HistorySignal` — first-party event name and path. No account payload.

## Date precision

`DAY`, `MONTH`, `YEAR`, `UNKNOWN` live on `ExhibitionHistoryMeta`.
Year-only history does not write `Exhibition.startDate`, so the product does not invent 1 January or 31 December.

## Clearance

`APPROVED`, `REVIEW_REQUIRED`, `REJECTED`.
A submitted source URL stays `REVIEW_REQUIRED` until a person reviews it. It is not shown as an official source before that.

## Indexes

Slug uniqueness, `ArtistEntity.canonicalName`, claim status, exhibition year, participation by artist, and source clearance are in the SQL file.
