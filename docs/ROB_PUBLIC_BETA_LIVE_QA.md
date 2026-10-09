# ROB public beta live QA

Local production build (`npx next start`) against the confirmed Supabase project, 2026-10-09.

Passed locally:

- Home search for Lee Ufan returns 이우환 and 8 documented exhibitions
- Lee Ufan history shows 8 documented exhibitions, 2022–2026, year-only markers
- 2025 opens Silentium (Hoam Museum of Art) and The Making of Modern Korean Art (Tina Kim Gallery, New York)
- That moment links Park Seo-Bo
- Back restores Lee Ufan, year 2025, and the same exhibition
- Park Seo-Bo shows 3 documented exhibitions and connections to Ha Chong-Hyun (2), Chung Sang-Hwa (1), and Lee Ufan (1)
- Ha Chong-Hyun shows 2 documented exhibitions, 1992–1994
- Kukje Gallery space shows Seoul, Korea, and the 2023 Lee Ufan exhibition
- Source label is “Source: Kukje Gallery” and opens `https://www.kukjegallery.com/artists/view?seq=190` (the shared record also keeps seq=181)
- Report an issue is on the source panel; POST `/api/history/reports` returned ok
- `/about/data` states that a source line is provenance, not institutional approval
- `/history/start`, `/login`, and `/now` still open; NOW shows existing posts
- Layout at 390px and 1440px does not overflow

SEO on the local build: Lee Ufan and Park Seo-Bo have no noindex tag. Ha Chong-Hyun and Chung Sang-Hwa are `noindex, follow`. The sitemap includes `/artists/lee-ufan` and `/artists/park-seo-bo` and does not include the two low-density artist pages.

Live smoke test on `https://rob-roleofbridge.com/` after production deployment `ca14407` (GitHub deployment `6962848342`):

- Homepage is “Search an artist. See their journey.”
- Search Lee Ufan returns 이우환 and 8 documented exhibitions
- 2025 moment opens The Making of Modern Korean Art at Tina Kim Gallery, New York
- Park Seo-Bo bridge opens a history of 3 documented exhibitions, with Back through that exhibition
- Back restores Lee Ufan, year 2025, and the same moment
- Source is Kukje Gallery, linking to `seq=190` and `seq=181`
- Report an issue is on the source panel
- Ha Chong-Hyun and Chung Sang-Hwa are `noindex`; Lee Ufan is index-eligible with canonical `https://rob-roleofbridge.com/artists/lee-ufan`
- Sitemap includes the two history-ready artist pages
- `/now`, `/login`, `/history/start`, `/about/data`, and `/spaces/kukje-gallery` return 200
- 390px layout does not overflow

Rollback target if the new app misbehaves: GitHub deployment `6842277151`, SHA `82d92b6`.
