# ROB deployment health

Recorded 2026-10-12 from GitHub deployment statuses. Build logs for the failed deployments were not available: the Vercel status text points at `vercel inspect`, and that command returned no log body without an authenticated CLI session. No cause inside Vercel is stated beyond what those records show.

## Current production

Checked again 2026-10-14. Three journal-only commits landed after `d32efd03` and each production deployment completed:

| SHA | Created | Status |
| --- | --- | --- |
| `2fe53c9d21a8` | 2026-10-12T19:07:00Z | success |
| `5da3365f11f8` | 2026-10-13T16:38:07Z | success |
| `ddc0b929030d` | 2026-10-14T14:14:45Z | success, current production |

The application tree under those commits is still the `d32efd03` history product plus journal files.

## Successful production deployment after the two failures

| Field | Value |
| --- | --- |
| SHA | `d32efd03d467633ad0d3d4babc3b4e4a6a454fa7` |
| Deployment | `7014713256` |
| Environment | Production |
| Status | success |
| Status time | 2026-10-12T13:02:36Z |
| Merge time | 2026-10-12T13:00:59Z |
| Gap | about 97 seconds from merge to the success status |

That gap is long enough for a build to have run. The status was recorded as completed, not as an instant failure.

## Failed production deployment 1

| Field | Value |
| --- | --- |
| SHA | `948bfb45d9e1e0222cce59644ef8f54453c356d8` |
| Deployment | `7014011171` |
| Vercel id | `dpl_5S8NXfH61SANw9D6z4Z4mJQbmTWd` |
| Created | 2026-10-12T12:26:51Z |
| Failed | 2026-10-12T12:26:51Z |
| Failure phase | Status was already failure at the deployment's creation second. No build duration is recorded. |
| GitHub `next build` | succeeded on the web CI job for this SHA |
| Preview of the pre-squash commit `d849d9c` | deployment `7013925738` failed at 2026-10-12T12:22:09Z, also at its creation second (`dpl_8mbPNfk6dWQH3SNyvHpF1427ATKr`) |

## Failed production deployment 2

| Field | Value |
| --- | --- |
| SHA | `d9f53cdd4c135bab203ed36da9f659a7637367e4` |
| Deployment | `7014520936` |
| Vercel id | `dpl_8Wx9RPyJpZgagBpZbi6KPpqxEYFY` |
| Created | 2026-10-12T12:52:47Z |
| Failed | 2026-10-12T12:52:48Z |
| Failure phase | Failure status one second after creation. No build duration is recorded. |
| GitHub `next build` | succeeded |
| Preview of the same tree (`cc15d33`, deployment `7014464311`) | completed at 2026-10-12T12:50:08Z and served the app |

A later preview, `7014617587` for `24a8176`, also failed at its creation second (`dpl_2k7aEYkgZhRuF763MLbgaQZSvAqV`). The squash of that commit is the successful production deployment above.

## Classification

These failures are not a repository compile error. GitHub ran `next build` successfully for the failed production SHAs, and one failed production SHA had already built as a preview.

The Vercel-side reason was not in the available records. What is visible is the phase: the failure was stored before a build log existed, and the next production deployment completed. Deployment is not being redesigned on this evidence.

## Retry outcome

No manual retry was issued for `948bfb45` or `d9f53cdd`. The following merge, `d32efd03`, deployed to production successfully.
