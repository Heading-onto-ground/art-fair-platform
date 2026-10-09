# ROB public beta deployment

The launch seed is imported. Deploy only after the build, local QA, and the post-import backup all pass. The local transaction-pooler URL was repaired from the same Supabase project. Vercel Production credentials were not changed.

The additive history schema and artist-entity backfill are on the confirmed production database. Local runtime uses that same project through the repaired `.env.local` transaction pooler. Deployed runtime uses Vercel's Production `DATABASE_URL`. Do not change that production credential.

## Before a later deploy

All of these have to be true:

- The content-gate decision is `PUBLIC_BETA_FIRST_PARTY_SEED_READY` or `PUBLIC_BETA_CLEARANCE_SEED_READY`
- The database host was confirmed and a backup exists
- `prisma/sql/add-rob-public-beta-history.sql` was applied to that database
- The artist backfill was run only after that confirmation
- `npx tsc --noEmit`, `npm test`, and `npm run build` pass
- The journey in section 54 of the phase brief was clicked through on a preview or a local production build

Use the existing Vercel project. Do not add a host. Do not change the domain. `lib/seo.ts` still defaults to `https://rob-roleofbridge.com`.

There is no separate preview workflow in the repo beyond Vercel's normal deployment. This phase did not create a preview deployment. Local typecheck and unit tests were run instead. A production deploy was not started, so there is no live smoke test.

## Rollback

Record the deployed Vercel deployment id before promoting a later build. If the new app misbehaves, roll the application back to that deployment. Do not drop the new tables in an emergency. They are additive, and the previous app does not read them.

The application version at the start of this phase was git `6cca20e1bf659740f45462a30fe02f9f63a2e54e`.

## Content gate command

```text
npx tsx scripts/history-content-gate.ts
```

Without `ROB_CONFIRM_DATABASE=1` the command does not connect. It prints `PUBLIC_BETA_CONTENT_GATE_BLOCKED`.

With the flag, it counts approved sources, imported exhibitions, public artists, `HISTORY_READY`, `RICH_HISTORY`, and the median exhibition count among index-eligible artists.
