# ROB public beta baseline

Recorded before the public-history implementation was treated as releasable.
No deployment was made for this checkpoint.

## Git

- Branch: `main`
- HEAD at the start of this phase: `6cca20e1bf659740f45462a30fe02f9f63a2e54e`
- That commit is the local pilot refinement `experiment: refine ROB core exploration experience`.
- The working tree already contained unrelated production edits: NOW as the homepage, artwork year and dimensions, labor survey, outreach, open-call crawl, artist activity, and gallery email tools.
- Those edits were left in place. This phase did not revert them.
- The pilot dataset under `experiments/art-history-pilot/data/` was not copied into the application.

## Routes that already existed

- `/` was the labor-survey home at HEAD, and the uncommitted working tree had replaced it with the NOW feed.
- `/studio` renders the same NOW feed.
- `/explore` is the existing hashtag explore.
- `/artists/{userId}` is the registered public profile.
- `/artist/public/{artistId}` is the portfolio page included in the sitemap when `exhibitions_public` is true.
- `/exhibitions/{id}`, `/spaces/{id}`, and `/curators/{id}` are the existing account-era pages.
- Login, works, portfolio, account pages, and admin stay on their current routes.
- Rankings is not in the primary navigation.

## Schema assumptions at HEAD

- `User` is an account. `ArtistProfile.userId` is required and unique.
- `Artwork` and `ArtworkSeries` belong to `ArtistProfile`.
- `Exhibition.createdBy` was a required `ArtistProfile.id`. `isPublic` defaults to false.
- `ExhibitionArtist.artistId` is a required `ArtistProfile.id`.
- `Space` and `Curator` already exist without an owner account. Neither had a slug.
- Dates on `Exhibition` are `DateTime?`. A year-only value must not be stored as January 1.
- Schema changes in this repo are raw SQL files in `prisma/sql/`, applied by hand. Request handlers do not run DDL.

## User data that must keep working

- Login and the current session cookie.
- Artwork, series, portfolio order, and public artist pages.
- First-party exhibitions and their `ExhibitionArtist` rows.
- NOW feed data and `/studio`.
- Admin auth.

## Deployment state

- Hosting is the existing Vercel project. No new host was introduced.
- Production domain configured in `lib/seo.ts`: `https://rob-roleofbridge.com`.
- `vercel.json` already defines the cron jobs. They were not changed.
- This checkpoint did not apply SQL, did not run the artist backfill, and did not deploy.
