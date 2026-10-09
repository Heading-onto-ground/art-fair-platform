# ROB public beta import report

The controlled script `scripts/import-public-beta-seed.ts` imported the mapped launch subset. It does not read the full pilot file. A second run did not add rows.

| Item | Result |
| --- | --- |
| Policy | `ALLOW_LIMITED`, `externalPermission = NOT_OBTAINED`, `FACTUAL_METADATA_ONLY` |
| Source family | `kukjegallery.com` |
| Source name shown to visitors | Kukje Gallery |
| New ArtistEntities | Lee Ufan, Park Seo-Bo, Ha Chong-Hyun, Chung Sang-Hwa |
| Reused ArtistEntities | none; no exact name match existed |
| Exhibitions created | 10 |
| Exhibition total after import | 23 |
| HistoryParticipation added | 14 |
| Users | 189, unchanged |
| ArtistProfiles | 116, unchanged |
| Import audit rows | 10 |

Production-public counts for the new artists:

| Artist | Documented exhibitions |
| --- | --- |
| Lee Ufan | 8 |
| Park Seo-Bo | 3 |
| Ha Chong-Hyun | 2 |
| Chung Sang-Hwa | 1 |

Bridge paths among these four artists: 10 directed pairs across 3 exhibitions. Pilot totals are not shown.

Provenance on these records is `Source: Kukje Gallery`. They stay `ROB_RESEARCHED`. Existing legacy exhibitions stay `LEGACY_FIRST_PARTY`.

Post-import backup: `backups/rob-public-beta-seed-20261009-1926.dump`, 19,196,478 bytes, SHA-256 `0cd86bbb92b60c367a5e0a039fc4b11a1a72b3164c56436fd8147b9be42d8e5c`. `pg_restore --list` succeeded. The pre-schema dump was not restored and was not overwritten.
