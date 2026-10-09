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

Live `https://rob-roleofbridge.com/` was not opened in this pass. Deployment is still required before a live smoke test.
