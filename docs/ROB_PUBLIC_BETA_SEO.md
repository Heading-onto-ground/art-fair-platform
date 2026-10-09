# ROB public beta SEO

Public access is not the same as indexing.

## Titles

- Artist: `{Name}: Exhibition History & Connections | ROB`
- Exhibition: `{Title}: Artists, Space & History | ROB`
- Space: `{Name}: Exhibitions & Artists | ROB`

The description uses the native name when it exists, the birth year when it was recorded, and the documented exhibition count. Canonical URL is the slug route.

## Index classes

Counted from distinct public exhibitions. Public means publication `PUBLIC` on an accepted first-party record, or a researched record whose source clearance is `APPROVED`. An existing public exhibition with a real creator and no history meta counts too. Source clearance is not what makes a first-party page public, and a public page is not indexed by itself.

| Class | Exhibitions | Index |
| --- | --- | --- |
| `EMPTY` | 0 | noindex |
| `LOW_DENSITY` | 1–2 | noindex |
| `HISTORY_READY` | 3–11 | eligible |
| `RICH_HISTORY` | 12 or more | eligible |

`/history/start`, `/history/add`, and `/now` are noindex.

## Sitemap

`app/sitemap.ts` adds only:

- artist slugs with at least 3 public exhibitions. A public artist with fewer stays `noindex`
- exhibition slugs that are public under the publication rule and have a participant
- space slugs that have at least one public exhibition

Empty artists, pending claims, review-required sources, and unresolved pilot rows are not given URLs by these queries. If the tables do not exist yet, those queries fail soft and the rest of the sitemap still renders. Curator slugs are not mass-added.

## Legacy URLs

`/artists/{userId}` and `/artists/{artistId}` redirect to `/artists/{slug}` only when that profile's `profileId` link exists. Any other id keeps the existing profile page. An exhibition id redirects to its slug only when `ExhibitionHistoryMeta.slug` is set.

## Structured data

JSON-LD is emitted only for the fields we store: `Person` with name, native name, URL, and birth year; `Event` with the recorded date precision rather than a fabricated day; `Place` for a space. No influence, ranking, or award is added.

## Internal links

Artist pages link to exhibitions and to the other documented artists on those exhibitions. Exhibition pages link to artists and the space. Space pages list exhibitions and their artists. These are the same records shown to a person, not keyword links.
