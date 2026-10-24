# ROB public growth

Pages: `/about/how-to-use`, `/about/why-rob`.

Locale is `rob_locale`, then `Accept-Language`, then English. Public history pages pass that locale into `TopBar`, which then keeps `html lang` instead of replacing it from `afp_lang`. `afp_lang` remains only for legacy surfaces that do not receive a ROB locale.

## Environment

`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_NAVER_SITE_VERIFICATION`, `NEXT_PUBLIC_GTM_ID`. Missing values render nothing. GTM loads once from `app/layout.tsx` with `afterInteractive`.

## Journey

Navigation stays in `lib/history/journeyTrail.ts`. Analytics reads that trail. A forward follow sets a one-shot marker. Depth events use the trail length at arrival:

- 1 previous step: `SECOND_ARTIST_REACHED`
- 2: `THIRD_ARTIST_REACHED`
- 3: `FOURTH_ARTIST_REACHED`

Refresh, Back, and a direct URL do not set the marker, so they do not emit depth.

## Explore event meaning

The Explore page sections are Journeys, Moments, Paths, and Spaces.

- `PATH_OPENED`: the visitor opens a documented path on Explore.
- `PATH_STEP_OPENED`: the visitor opens an artist step on that path.

## Events

`dataLayer` names match the public map in `lib/publicGrowth/analytics.ts`. The server beacon stays separate. `SEARCH_NO_RESULT` on the dataLayer does not replace `trackMissingSearch`, which the server classifies.

Suggested conversions: `SEARCH_RESULT_OPENED`, `SECOND_ARTIST_REACHED`, `THIRD_ARTIST_REACHED`, `REPORT_ISSUE_SUBMITTED`, `ADD_EXHIBITION_SUBMITTED`. Not page views.

## After deploy

Verify Google and Naver, submit the sitemap, inspect `/`, `/about/why-rob`, `/about/how-to-use`, and artist URLs. Do not store credentials.
