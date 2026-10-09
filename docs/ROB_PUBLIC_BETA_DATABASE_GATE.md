# ROB public beta database gate

Decision: `PUBLIC_BETA_DATABASE_IDENTITY_BLOCKED`

The Next.js URL was rejected. A different local URL for the same Supabase project accepted a read-only probe and has the ROB tables. Nothing in the repository proves that database is the Vercel production database for `rob-roleofbridge.com`. No mutation was run.

## 1. Environment precedence

Next.js uses `.env.local`. Prisma CLI uses `.env`. Those files both exist and their `DATABASE_URL` values differ. `.env.production` is absent. Vercel production variables are not in the repo because `.env*` is gitignored. The linked Vercel project name is `art-fair-platform`.

## 2. Effective DB connection shape

Supabase, region `ap-south-1`, host suffix `supabase.com`, database `postgres`, pooler username with project ref prefix `vvdx`.

- App runtime: transaction pooler, port 6543, from `.env.local`
- Prisma CLI: session pooler, port 5432, from `.env`
- Runtime adapter and Prisma CLI both read the variable name `DATABASE_URL`
- Runtime forces SSL with `rejectUnauthorized: false`. The URLs themselves have no `sslmode`

## 3. Authentication diagnosis

`.env.local` reached the server and was rejected (`28P01`). `.env` on the same host, user, and project accepted `select 1`. The passwords differ. `.env.local` also has a trailing newline; trimming it did not make the login succeed. Detail is in `docs/ROB_DATABASE_CONNECTION_AUDIT.md`.

## 4. Database identity

`EXPECTED_ROB_SCHEMA_CONFIRMED` for the database that accepted the `.env` login.

Present tables: `User`, `ArtistProfile`, `Artwork`, `Exhibition`, `ExhibitionArtist`, `Space`, `ArtEvent`.

No emails, names, or row ids were read.

## 5. Production linkage

`UNKNOWN`

The schema match shows this is a ROB database. It does not show that Vercel production uses it. Local env files are not deployed. `DATABASE_TARGET_UNCONFIRMED` for production.

## 6. Recovery status

`RECOVERY_UNCONFIRMED`

Supabase can store daily backups and point-in-time recovery, but only the dashboard knows whether they are on for this project. This phase did not see a snapshot and did not run a restore.

## 7. Existing ArtistProfile count

116, on the readable database. This is not yet a production-confirmed count.

## 8. Public Exhibition count

10 public `Exhibition` rows. Artwork rows and `ArtEvent` rows were not added to this count.

## 9. First-party candidate count

`LEGACY_FIRST_PARTY_CANDIDATES`: 10

`NOT_SAFE_TO_CLASSIFY`: 0

All 10 public exhibitions have `createdBy` pointing at an existing `ArtistProfile`. In this repository, `Exhibition` rows are created by the logged-in artist exhibition route or the history contribution route. No crawler path creates `Exhibition`. Rows were not relabeled.

## 10. Density distribution

Confirmed participants on public exhibitions:

| Threshold | Artists |
| --- | --- |
| >= 1 | 4 |
| >= 3 | 2 |
| >= 8 | 0 |
| >= 12 | 0 |

Public `ExhibitionArtist` rows: 10. Four of those artists have a non-empty profile name.

## 11. Bridge-path count

Usable bridge exhibitions: 0

Usable Artist → Exhibition → Artist paths: 0

No public exhibition has two confirmed artist profiles.

## 12. Space coverage

Public exhibitions with a real `Space`: 10

| Threshold | Spaces |
| --- | --- |
| >= 1 public exhibition | 10 |
| >= 3 | 0 |
| >= 8 | 0 |

## 13. Minimum-beta gate

On this readable database the minimum is not met.

- Artist histories with at least one public exhibition: 4
- Artist with at least 8 public exhibitions: 0
- Artist → Exhibition → Artist path: 0
- Space with a public exhibition: 10
- Profile names exist for the four participating artists. The new history search index was not queried
- Provenance for these rows can stay first-party. They are not official-source records

The missing bridge and the missing dense history are enough to fail the seed. That does not become the phase decision, because production identity is still unconfirmed.

## 14. Required manual actions

Do not paste a connection string or password into chat.

1. Open the Supabase project whose ref starts with `vvdx`, region `ap-south-1`. In Connect, copy the current transaction-pooler URI (port 6543) and compare it with `.env.local`. The file's password does not match the working `.env` password, and the value has a trailing newline.
2. Open Vercel project `art-fair-platform`, Settings, Environment Variables, Production. Confirm whether `DATABASE_URL` is this same project, and whether it is the session pooler or the transaction pooler. Do not send the value back.
3. In that Supabase project, open Database, Backups. Confirm whether a restorable backup exists, and whether point-in-time recovery is enabled. A yes/no is enough.

## 15. Recommended next step

Confirm production identity and a backup before any schema, backfill, import, or deploy.

If this readable database is production, the counts above already fail the beta minimum. The phase after the backup check would build a 3–5 artist clearance queue from the existing pilot, with one bridge and one space, and would still not import it. If Vercel production is a different project, these counts must not be used.
