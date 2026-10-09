# ROB public beta architecture

ROB's public act is art-history search.

Home → search an artist → artist history → year → exhibition moment → another documented artist → their history → back to the same year, exhibition, and scroll position.

## Artist entity

`ArtistEntity` exists without a user account. Lee Ufan can have a page before anyone signs up. A person who is not in the database yet creates an entity from Start your history. Claiming an existing page is a separate review.

`ArtistProfile` is unchanged as the account profile. One profile may link to one entity through `ArtistEntity.profileId`. The link is written by the deterministic backfill, by the person who creates their own record when their profile is still unlinked, or when an admin approves a claim. Approval does not steal a profile that is already linked to a different entity.

Claims are `PENDING` until an admin approves or rejects them at `/admin/history`. Nothing is auto-approved. The claim note is not on the public artist payload.

## Exhibitions, spaces, curators

Historical exhibitions reuse `Exhibition`. `createdBy` may be null. Precision and the public slug live on `ExhibitionHistoryMeta`, so existing exhibition queries do not have to read those columns.

`HistoryParticipation` is the entity join. `ExhibitionArtist` remains the first-party join and is still read for a linked profile.

Spaces stay separate when the name, city, or country differ. Kukje Gallery Seoul and Kukje Gallery Busan are not merged. A space is created only when a name was entered. A curator is created only when a name was entered. Missing curator data does not create a page.

Participants are matched by exact canonical name, native name, or alias. One match links the entity. More than one match is `REVIEW_REQUIRED`. No match is `UNRESOLVED_PARTICIPANT`.

## Provenance

Visitor-facing labels are text, not color:

- Official source
- Artist added
- Gallery added
- Institution added
- Artist + official source
- Conflict

Opening the label shows the approved source, or says that no approved source is attached. Unapproved URLs are stored and hidden. Full pages, long source text, and external artwork images are not stored.

## Timeline

The production page uses the refined levels `ALL`, `DECADE`, and `YEAR`. A year shows at most four dots and always shows the real count. Filled dots have a month or a day. Open dots are year-only. The legend is text. `prefers-reduced-motion` skips the transition card. Back still navigates.

The moment opens in the timeline. The place line is omitted when it repeats the title. The local constellation starts at about ten nodes. Further artists are `+ N artists`.

## Routes

- `/` search home
- `/now` the existing NOW feed
- `/artists/{slug}` history when an entity exists
- `/artists/{userId}` and `/artist/public/{artistId}` stay. If that account is linked to an entity, the account URL redirects to the slug.
- `/exhibitions/{slug}` for a cleared history exhibition. An id with a known slug redirects to the slug. Other exhibitions keep the existing page.
- `/spaces/{slug}` chronological exhibitions. An unknown slug keeps the existing space page.
- `/history/start`, `/history/add`, `/history/explore`
- `/admin/history` for claim review

Rankings is not in the primary nav. No mascot was designed. The home page reserves one small guide dot.

## Analytics

`lib/history/analytics.ts` posts the event name and path to `/api/history/analytics`, which stores a `HistorySignal` row when the table exists. No new vendor was added. The exploration event is `SECOND_ARTIST_REACHED`. The contribution event is `EXHIBITION_ADDED`.

## What a request must not do

History routes do not run `ALTER TABLE`, `CREATE TABLE`, or other schema repair. If the tables are missing, search and the public pages fall back instead of migrating the database.
