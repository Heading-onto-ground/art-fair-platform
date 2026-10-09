# ROB pre-public-beta backup

The local logical backup below was taken before the additive history schema was applied. After the backup, Vercel Production `DATABASE_URL` was confirmed to use this same Supabase project, ref prefix `vvdx`, region `ap-south-1`. Supabase still has no scheduled backup or PITR. This file remains the manual recovery checkpoint.

The dump itself was not restored. After this checkpoint, the additive history schema and artist backfill were applied. Pilot records were not imported.

## Vercel production linkage

Confirmed by the project owner after this backup: Production `DATABASE_URL` uses the same `vvdx` project. The CLI on this machine still cannot read the Vercel value.

## What was backed up

The connection that already accepted `select 1`: Supabase session pooler, port 5432, database `postgres`, project ref prefix `vvdx`, region `ap-south-1`. `.env.local` port 6543 was not used.

`pg_dump` 17.6 wrote both files. The server reported database version 17.6. Flags were custom format for the data dump, plain format for the schema dump, `--no-owner`, and `--no-privileges`. The database was not altered.

| Item | Value |
| --- | --- |
| Timestamp | 2026-10-09 17:11 Asia/Seoul |
| Project | Supabase ref prefix `vvdx`, region `ap-south-1` |
| Data dump | `backups/rob-pre-public-beta-20261009-1711.dump` |
| Data size | 19,153,853 bytes |
| Data SHA-256 | `64f7b2c6c51d1b7c6b750008a09b31da94530d8165fc8756704b58283b261325` |
| Schema dump | `backups/rob-pre-public-beta-20261009-1711-schema.sql` |
| Schema size | 298,117 bytes |
| Schema SHA-256 | `14e2a94f4533abc0bb1f247b4bbc32a8625a9a72466933415407830092c3cf19` |

Both files are non-zero. `backups/` is in `.gitignore`. These files must stay off git. They contain user data.

## pg_restore --list

`pg_restore --list` succeeded. The archive contains these public tables:

- `User`
- `ArtistProfile`
- `Artwork`
- `Exhibition`
- `ExhibitionArtist`
- `Space`
- `ArtEvent`

The archive was not restored.

## Recovery this creates

This is a manual logical backup taken before any later migration. It is not a Supabase scheduled backup and it is not point-in-time recovery. Restoring it would be a deliberate `pg_restore` into an empty database, not an automatic dashboard rollback.

## Keep

Keep these two backup files. Do not commit them. They are the rollback point for the history schema that was applied afterward.
