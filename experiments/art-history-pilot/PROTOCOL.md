# ROB art history pilot

Isolated canary. Deleting this directory must not affect production ROB.

Do not import this code from `app/`, `lib/`, or Prisma. Do not deploy it.

## Rules that stay fixed

- 25 / 50 / 25 cohorts, frozen before extraction.
- Tier 1 official sources create exhibitions. Tier 2 only corroborates. Tier 0 is identity.
- No inferred co-artists, no `RELATED_TO` edge, no "First exhibition" unless a source says so.
- `EXACT_MATCH` is the same authoritative id. `HIGH_CONFIDENCE_CANDIDATE` does not merge until a person approves it.
- Evidence excerpts are at most 200 characters and must appear in the fetched page.
- Thresholds live in `src/policy.ts` and are not retuned after results.

## Commands

From the repository root:

```bash
npx vitest run --config experiments/art-history-pilot/vitest.config.ts
npx tsx experiments/art-history-pilot/scripts/enrich-wikidata-entitydata.ts
npx tsx experiments/art-history-pilot/scripts/repair-source-policy.ts
npx tsx experiments/art-history-pilot/scripts/collect-international.ts
npx tsx experiments/art-history-pilot/scripts/review-domains.ts
npx tsx experiments/art-history-pilot/scripts/freeze.ts
npx tsx experiments/art-history-pilot/scripts/build-view.ts
npx tsx experiments/art-history-pilot/scripts/report.ts
```

Open `experiments/art-history-pilot/view/index.html` for the English history shell.

`scripts/enrich-identity.ts` calls `/w/api.php` and now refuses to run. Phase P1-S uses `Special:EntityData` only. The repaired matrix is `reports/SOURCE_POLICY_REPAIR.md`.

Phase P1-M reads only official pages already classified `ELIGIBLE` for manual research. It does not change GREEN / YELLOW / RED. New exhibition rows are `PILOT_ONLY` and `production_clearance = UNRESOLVED`. The canary report is `reports/INTERNATIONAL_25_MANUAL_CANARY.md`. That verdict stays `INTERNATIONAL_CANARY_BELOW_THRESHOLD`.

Phase P2 is a separate pair of tests. P2-A may use a search engine only to discover an official URL, then opens that page. Snippets are not evidence. Its report is `reports/INTERNATIONAL_25_SEARCH_RESCUE.md`. P2-B is the static prototype in `view-v2/`. `view/index.html` stays as the earlier checkpoint. The combined note is `reports/P2_MASTER_REPORT.md`.

Phase P3 does not collect more public-web records. It adds a local hybrid history on top of the records already accepted: one timeline, explicit provenance, and a human-test sheet. Reports: `reports/HYBRID_MODEL_CANARY.md` and `reports/HUMAN_TEST_PROTOCOL.md`.

Page snapshots, if a later step fetches them, go in `.local-snapshots/` and are gitignored.
