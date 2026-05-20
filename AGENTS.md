# AGENTS.md — AI / automation harness for this repo

Human and agent contributors: follow this so changes stay mergeable and safe.

## Layout

- **Web (Next.js 13 App Router)**: repo root — `app/`, `lib/`, `middleware.ts`, Prisma at `prisma/`.
- **Mobile (Expo)**: `mobile/` — has its own `package.json`, ESLint, tests, and E2E. Do not assume root `npm run lint` covers it; the CI **mobile** job runs in `mobile/`.

## Commands (web, from repo root)

- `npm run dev` — local Next dev server  
- `npm run typecheck` — `tsc --noEmit` (also runs in CI)  
- `npm run lint:web` — ESLint on the **CI gate** paths (entrypoints + tests + config); expand coverage over time  
- `npm run lint` — full ESLint on all non-ignored files; the app still has legacy violations; use for cleanup, not required for every PR until debt is reduced  
- `npm run test` — Vitest unit tests  
- `npm run build` — production build (CI)  

Mobile: `cd mobile && npm run lint && npm run typecheck && npm run test`.

## Database & secrets

- Schema/migrations: Prisma under `prisma/`. Prefer `prisma migrate` workflows; do not hand-edit production data from agents.  
- Never commit secrets, API keys, or `.env` contents. Use env vars documented for deployment (e.g. Vercel).

## Security-sensitive areas

Treat with extra care and prefer tests + manual review: `lib/auth.ts`, `lib/adminAuth.ts`, `middleware.ts`, `app/api/auth/**`, `app/api/admin/**`, cron routes under `app/api/cron/**`.

## Pull request harness (what CI enforces)

On PRs to `main`, **web** runs: `lint:web` → `typecheck` → `npm run test` → `npm run build`. **mobile** runs its own lint, typecheck, unit tests, build, and Playwright E2E.

Before opening a PR, run at least the same web steps locally to avoid churn.

## Style of change

- Match existing patterns in nearby files (imports, error handling, naming).  
- Avoid unrelated refactors in the same change as a feature or fix.  
- If you add a new critical API or auth path, add or extend tests under `__tests__/` when reasonable.

## Expanding the lint gate

`lint:web` is intentionally a **passing subset** so CI stays green while legacy pages are cleaned up. To widen the gate, add paths to the `lint:web` script in `package.json` only after `npx eslint <paths>` is clean (or fix violations first).
