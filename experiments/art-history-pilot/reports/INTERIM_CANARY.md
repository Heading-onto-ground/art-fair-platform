# ROB ART HISTORY GRAPH PILOT

Status: INTERIM. Cohort A extraction has not been completed. Success thresholds were not applied.

## 1. Frozen cohort composition

100 artists are frozen: A01–A25 international, B01–B50 domestic institutional, C01–C25 emerging. Collectives and three historical estates are listed as exclusions in the seed file, not silently dropped.

## 2. Source allowlist

No domain was approved for exhibition creation.

Held or blocked after review: 26.

- www.wikidata.org: robots_disallow_target
- www.mmca.go.kr: open_license_is_per_item_not_sitewide
- koreaartistprize.org: reuse_not_explicitly_granted
- sema.seoul.go.kr: robots_disallow_target
- www.gwangjubiennale.org: explicit_permission_required
- www.busanbiennale.org: robots_disallow_target
- mediacityseoul.kr: robots_disallow_target
- songeun.or.kr: robots_disallow_target
- www.kukjegallery.com: reuse_not_explicitly_granted
- www.galleryhyundai.com: reuse_not_explicitly_granted
- www.pkmgallery.com: reuse_not_explicitly_granted
- www.arariogallery.com: reuse_not_explicitly_granted
- www.gallerybaton.com: reuse_not_explicitly_granted
- www.hakgojae.com: robots_disallow_target
- www.pacegallery.com: explicit_permission_required
- www.lehmannmaupin.com: reuse_not_explicitly_granted
- www.victoria-miro.com: explicit_permission_required
- www.hauserwirth.com: robots_disallow_target
- www.tate.org.uk: reuse_not_explicitly_granted
- www.moma.org: reuse_not_explicitly_granted
- www.guggenheim.org: reuse_not_explicitly_granted
- www.diaart.org: robots_disallow_target
- www.southbankcentre.co.uk: terms_not_located
- www.labiennale.org: reuse_not_explicitly_granted
- whitney.org: reuse_not_explicitly_granted
- www.e-flux.com: reuse_not_explicitly_granted

## 3. URLs reviewed

- license_mark_absent: https://www.mmca.go.kr/exhibitions/exhibitionsDetail.do?exhId=202302010001618 — Opened to see whether this page carries the KOGL type 1 mark required by MMCA. The mark is not on the page, so no exhibition facts were stored.

## 4. Accepted exhibitions

0

## 5. Rejected records

0
Review queue: 0.

## 6. Cohort scorecard

Not evaluated. The fixed thresholds remain international median >= 8, domestic >= 4, emerging >= 2, Tier 1 coverage >= 70%, audit incorrect rate < 15%, wrong-merge rate < 2%. An empty graph is not a failed cohort.

## 7. Entity-resolution results

Frozen 20-pair wrong-merge rate: 0. HIGH_CONFIDENCE_CANDIDATE does not merge without human approval.

Identity status: 0 confirmed, 0 ambiguous, 100 unresolved. Wikidata's API path is disallowed by robots.txt for a generic agent, so QIDs were not collected.

## 8. 50-record factual audit

Not run. There are not 50 accepted exhibition records.

## 9. Human review cost

Not measured. No exhibition review session has been logged.

## 10. Emerging-artist result

Not run. The stop rule (median < 1) is unchanged and has not been applied.

## 11. Five timeline prototypes

The English history shell is at view/index.html. It does not invent five artist histories. Suggestions search the frozen seed. A timeline appears only for an accepted Tier 1 record.

## 12. Major failure modes

The binding constraint so far is source permission, not parser cleverness. Domains whose terms do not grant reuse stay off the allowlist. Entity resolution refuses to treat a shared name and birth year as identity.

## 13. Final recommendation

INCOMPLETE

## 14. Evidence for recommendation

INCOMPLETE means the three-way product decision is not available. Accepted exhibitions are below the point where a median, a 50-record audit, or the emerging stop rule would mean anything. Thresholds in code are still 8 / 4 / 2.

## 15. What production ROB should do next

Leave the production app, Prisma schema, and Phase 1-A through 1-C untouched. Do not start Phase 1-D. Do not migrate this pilot. Next research step: clear at least one Tier 1 domain, select Cohort A URLs by hand, and extract only spans that appear on those pages.

## Appendix: fixed cost signals in the repo

Dollar amounts are not in the repository. The deployed app is a Next.js project on Vercel with Postgres (`DATABASE_URL`), Vercel Blob (`BLOB_READ_WRITE_TOKEN`), Resend email, and an optional OpenAI key. `vercel.json` schedules gallery crawling every 2 hours and several daily email crons (outreach, digest, onboarding, retention). During this pilot those jobs can keep spending while the history experiment does not use them. Pausing nonessential crons would be a production change and was not done here.
