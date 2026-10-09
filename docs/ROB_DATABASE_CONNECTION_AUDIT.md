# ROB database connection audit

No credential was changed. No schema was applied. No row was written.

## How env files are loaded

| Consumer | What it loads | Result in this checkout |
| --- | --- | --- |
| Next.js dev and local build | `.env`, then `.env.development`, then `.env.local`, then `.env.development.local`. Later files override. | `.env.local` supplies `DATABASE_URL` |
| Next.js test | `.env.local` is not loaded | not the app runtime |
| Prisma CLI (`prisma.config.ts`) | `dotenv/config`, which loads `.env` only | `.env` supplies `DATABASE_URL` |
| Runtime Pool (`lib/prisma.ts`) | `process.env.DATABASE_URL` after the host has loaded env | same variable name as Prisma, not the same file when the two files differ |
| `prisma/seed.ts` | `.env.local` first, then `.env` without override | `.env.local` |
| Vercel production | dashboard env. `.env*` is gitignored, so local files are not deployed | not readable from this repository |

`next.config.js` does not replace `DATABASE_URL`.

## Effective shapes

Both local URLs are Supabase, region `ap-south-1`, database `postgres`, username `postgres` plus a project ref. The ref prefix on both is `vvdx`. No `sslmode` is set on either `DATABASE_URL`. `lib/prisma.ts` always sets `ssl: { rejectUnauthorized: false }`.

| Source | Port | Mode | Login |
| --- | --- | --- | --- |
| `.env.local` (Next.js) | 6543 | transaction pooler | rejected |
| `.env` (Prisma CLI) | 5432 | session pooler | `select 1` succeeded |
| `.env` `DIRECT_URL` | 5432 | session pooler, `sslmode=no-verify` | not probed |

`.env` and `.env.local` use the same host, user, database, and project ref. The passwords differ. `.env.local` also has trailing whitespace and a newline suffix. The probe trimmed that suffix before connecting, and the server still rejected the login, so the newline is a defect and not the only cause.

`DIRECT_URL` is present only in `.env`. `prisma.config.ts` does not read it. Its password differs from `.env` `DATABASE_URL`. It was not used.

## Findings

| Finding | Status |
| --- | --- |
| `.env.local` overrides `.env` for Next.js | CONFIRMED |
| Prisma CLI reads `.env` only, while Next.js reads `.env.local` | CONFIRMED |
| The two `DATABASE_URL` values differ | CONFIRMED |
| Pooler username has the `postgres.[project-ref]` form. Bare `postgres` is not the mismatch | CONFIRMED |
| `.env.local` has trailing whitespace / a newline suffix | CONFIRMED |
| Trimmed `.env.local` still receives `28P01` password authentication failed | CONFIRMED |
| The server was reached. This is not DNS, timeout, or a TLS handshake failure | CONFIRMED |
| `.env` session-pooler URL accepts `select 1` on the same project | CONFIRMED |
| The rejected password is not the password in the working `.env` URL | CONFIRMED |
| The rejected password is stale or is not the current dashboard password | LIKELY |
| `.env.local` points at a different Supabase project | not supported. The project ref matches `.env` |
| This working URL is the Vercel production database | UNCONFIRMED |
| A current Supabase backup or PITR snapshot exists | UNCONFIRMED |
| `DIRECT_URL` would connect | UNCONFIRMED. Not probed |

The server message on the rejected login named the role `postgres`. The URL username still has the project-ref suffix.

## What was not done

Passwords were not printed, reset, or written back. The connection was not retried with swapped passwords. Schema SQL and backfill were not run.
