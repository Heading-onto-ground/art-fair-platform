# P2 MASTER REPORT

Production ROB was not changed. This report does not issue a 100-person pivot verdict. Domestic 50 and Emerging 25 were not collected.

Checkpoints present: P2_BASELINE_READ, P2_SEARCH_DISCOVERY_RULES_FROZEN, P2_INTERNATIONAL_RESCUE_COMPLETE, P2_RESCUE_SCORECARD_COMPLETE, P2_PRODUCT_CANARY_READY, P2_MASTER_REPORT_COMPLETE.

## A. Data coverage

The official-index canary remains **INTERNATIONAL_CANARY_BELOW_THRESHOLD**. Interpretation added beside it: **OFFICIAL_INDEX_DISCOVERY_INSUFFICIENT**.

The bounded search-discovery rescue finished and is **INTERNATIONAL_SEARCH_RESCUE_BELOW_THRESHOLD**.

Median exhibitions per International artist: 2. Artists at 8 or more: 9 of 25. The frozen bar is a median of 8, which needs 13 artists. Unique canonical exhibitions: 468. Artist↔exhibition incidences: 474. Two artists moved from below 8 to 8 or more: Lee Bae (67) and Yeesookyung (25). Eight artists are still at zero, including Lee Bul and Kimsooja.

Search was used only to find URLs. Snippets were not stored. The gain came mostly from two official CV pages, Johyun's Lee Bae biography and yeesookyung.com/cv. Most search-discovered museum URLs opened and still produced no structured row, often because the fetched HTML did not contain the facts as text.

Detail: `reports/INTERNATIONAL_25_SEARCH_RESCUE.md`.

## B. Product experience

**PRODUCT_EXPERIENCE_READY_FOR_HUMAN_TEST**

The isolated prototype at `view-v2/index.html` can show Search → History → Moment → Connection → Another History on real accepted records. Park Seo-Bo leads to Lee Ufan through one documented exhibition. Lee Bul's empty state stays empty. This does not mean the experience has been judged compelling.

Detail: `reports/PRODUCT_EXPERIENCE_CANARY.md`.

## C. Production data-clearance status

`production_clearance` remains **UNRESOLVED**. `usage_status` remains **PILOT_ONLY**. No record was promoted. GREEN and YELLOW were not recolored. The seed file was not rewritten. Wikidata QIDs were not written back into the seed.

## D. SEO implications

Production SEO was not changed. No sitemap was submitted.

Inside the prototype, a page title is previewed as `{Artist}: Exhibition History & Connections | ROB`. An experimental density label, not a launch rule, splits the International 25 into EMPTY 8, LOW_DENSITY 8, HISTORY_READY 4, and RICH_HISTORY 5. The principle to carry forward is that an empty entity page should not be indexed just because the artist is famous. Lee Ufan's history is a candidate for a later index test. Lee Bul's empty page is not.

## E. Operational cost / review burden

`reviewMinutes` is null. It was not invented. The automated pass stayed inside 10 queries and 10 URLs per below-threshold artist: 19 queries and 54 URLs in total. Eight URLs were left in a manual queue because robots.txt could not be read. Two returned 403 and one returned 404. Those were not bypassed.

The useful new rows came from a few CV and exhibition pages, not from a general crawl. Thirty-six of Lee Bae's new rows are gallery-name titles. They still leave him above 8 if removed, and removing them would not reach 13 artists. Spending more automated crawl time on the same evidence rule is unlikely to clear the bar.

## F. Recommended next decision

**NEXT_TEST_HYBRID_MODEL**

Public-web discovery, even with search used as a phone book, left the International median at 2. Coverage is highly uneven: five artists have 52 to 130 documented exhibitions, and eight still have none. The prototype is ready for a person to try those dense histories. Collecting Domestic 50 with the same public-web method would repeat a design that has already missed the international bar. Stopping all history work would throw away histories that are already dense enough to test. The next design question is a hybrid: public documented past, plus artist or gallery contribution, plus institution partnerships, while a person tests whether the dense timelines are actually worth continuing.

Not chosen:

- NEXT_TEST_DOMESTIC_50, because the international public-web test missed the original bar.
- STOP_PUBLIC_WEB_RECONSTRUCTION, because several artists already have a dense factual timeline and the exploration path runs on that data.
- FIX_PRODUCT_EXPERIENCE_BEFORE_MORE_DATA, because the prototype demonstrates the path and has not yet failed a human test. If that test fails, the product is the thing to fix before any wider collection.
