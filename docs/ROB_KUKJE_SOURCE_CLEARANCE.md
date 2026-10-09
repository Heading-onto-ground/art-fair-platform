# Kukje source clearance

Decision: `KUKJE_CLEARANCE_READY_FOR_HUMAN_DECISION`

This is an evidence file for a person to decide. It is not a legal conclusion, an approval, or an import.

The two candidate URLs stay `REVIEW_REQUIRED`.

## Exact URLs

- `https://www.kukjegallery.com/artists/view?seq=190` — Lee Ufan
- `https://www.kukjegallery.com/artists/view?seq=181` — Park Seo-Bo

Both pages were public on 2026-10-09. No login, paywall, or captcha was required. `robots.txt` says `User-agent: *` / `Allow: /`. That rule is not a copyright license.

## What ROB proposes to use

Factual metadata only: artist name, exhibition title, year, venue, city, country, participants named in the exhibition line, and the source URL. Each record would link back to Kukje Gallery.

ROB does not propose to store artwork images, installation photographs, biography, education, awards, collection lists, curatorial prose, press-release prose, or page layout. No curator is named on these ten lines.

Factual metadata is not treated as automatically unrestricted. Contract terms, database rights, and jurisdiction can still matter. Those questions are left to the human decision.

## Site documents

Checked on the public site:

| Document | Result |
| --- | --- |
| Terms of Use | Not found. `/terms` and `/terms-of-use` redirect to the homepage. |
| Privacy | Not found. `/privacy` and `/privacy-policy` redirect to the homepage. A privacy policy would not be reuse permission. |
| Copyright page | Not found. `/copyright` redirects to the homepage. |
| Legal page | Not found. `/legal` redirects to the homepage. |
| Homepage and `/about` links | No Terms, Privacy, or Legal link. |
| Copyright notice | `© KUKJE GALLERY. All Rights Reserved.` |

A missing terms page is not permission. The copyright notice reserves rights. It does not license this use, and it does not by itself prohibit storing a factual exhibition line.

## Images

The artist pages display artwork images. Those images are out of the launch seed.

Separate press PDFs, which are not the two candidate URLs, say that images must credit the artist and other relevant parties, and that image editing needs prior permission. A Korean press PDF also limits its images to promotional use during the exhibition period. Those rules stay in the image scope. They do not become permission for the rest of the site, and they are not applied as a ban on every factual datum.

## Records

The smallest subset that still shows one dense history, the three bridges, and a Space is 10 exhibitions.

| Artist | Pilot exhibitions | Proposed production count |
| --- | --- | --- |
| Lee Ufan | 130 | 8 |
| Park Seo-Bo | 87 | 3 |
| Ha Chong-Hyun | 52 | 2 |
| Chung Sang-Hwa | 4 | 1 |

Eight of the records are on `seq=190`. Two further bridge records are only on `seq=181`. The Tina Kim bridge is stated on both pages. Dropping a Lee Ufan record would leave the dense history below 8. Dropping either remaining bridge would remove Ha Chong-Hyun or Chung Sang-Hwa from the path.

Names that appear in a bridge title but are not in this launch set are recorded and are not turned into entities.

The San Marco Art Centre line names Venice. The stored pilot city field also contains the collateral-event clause. That field needs a human check before import. No date is filled in as January 1. No curator is added.

## Alternative sources already in the pilot

The 10 records cite only these two Kukje URLs. Stored Wikidata identity rows confirm the four artists and do not contain these exhibition lines. No stored open-government response covers them. No new collection was started.

## Scenarios

A. A clear applicable license, or written permission from Kukje, can move the records to `APPROVED` after a person confirms it.

B. No permission and no applicable license. This is the current state. The records stay `REVIEW_REQUIRED`. Nothing is imported.

C. An explicit term that prohibits this factual-metadata use would mark the source `REJECTED`. The current notice and the image-only press rules do not meet that test.

## Suggested contact

`kukje@kukjegallery.com`, from the public Seoul and Busan footer. Nothing was sent. Drafts are in `docs/ROB_KUKJE_PERMISSION_REQUEST_KO.md` and `docs/ROB_KUKJE_PERMISSION_REQUEST_EN.md`.
