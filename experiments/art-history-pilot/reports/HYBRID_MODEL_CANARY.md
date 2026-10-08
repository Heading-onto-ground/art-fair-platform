# HYBRID MODEL CANARY

Phase P3. No new public-web collection. Domestic 50 and Emerging 25 were not started. Production ROB was not changed.

Status: **HYBRID_MODEL_READY_FOR_HUMAN_TEST**

This means a person can try the model. It does not mean the product is validated.

Preserved verdicts:

- INTERNATIONAL_CANARY_BELOW_THRESHOLD
- INTERNATIONAL_SEARCH_RESCUE_BELOW_THRESHOLD
- PRODUCT_EXPERIENCE_READY_FOR_HUMAN_TEST

## Hybrid model

One artist page has one history. A record can come from ROB research, an artist, a gallery, or an institution. The origin stays on the record. An artist submission is not treated as false. An official source is not treated as an artistic endorsement.

Accepted pilot exhibitions stay `ROB_RESEARCHED` / `OFFICIAL_SOURCE`. Anything a tester adds stays in this browser under `rob-art-history-pilot-hybrid`. It is not written into `data/claims/exhibitions.json` and it does not change the 468 / 474 scorecard.

## Provenance

| What the page shows | Meaning |
| --- | --- |
| ✓ Official source | ROB researched, official page attached |
| ○ Artist added | Artist submission, no official row |
| ○ Gallery added | Gallery submission |
| ○ Institution added | Institution submission |
| ✓○ Artist + official source | The same exhibition, official row plus a confident submission |
| ! Conflict | Dates disagree. The official date stays |

Opening the label shows the origin, the verification word, and the source URL when one exists. There is no percentage score.

## First-party flow

"Are you an artist? Start your history →" opens a prototype form. A search with no result offers "Can't find yourself? Start your history". The only required field is the artist name. Native name, birth year, city, and website can stay blank. A birth year is kept only when it is a four-digit year.

On an existing page, "Claim this page" is labeled as a prototype and does not check identity. After that, the tester can add an exhibition or suggest a correction. An exhibition needs a title. Date, venue, city, country, other artists, curator, source URL, and notes can stay unknown. A typed year stays a year. `2018` is not stored as `2018-01-01`.

A suggested correction is stored as a note. The official row is not rewritten.

## Deduplication

A submission joins an existing exhibition only when the title is specific, the venue matches, and the year matches. A more precise date in the same year can attach. A different month on both sides is a conflict and does not replace the official date. A short title, or a title that is only the venue name, stays in "Needs review" and does not become a second timeline dot. A different title becomes a new row.

## Group exhibitions

Other names are split on commas. A name that matches exactly one pilot artist is linked. That exhibition then appears on their history too, marked as added in this browser, without changing their documented count. A name that matches nobody becomes "Unresolved participant". No account is created. A name that matches two pilot artists stays "Needs review" and is not merged.

## Claim demo

"Claim this page" sets a local flag. The page says "Prototype claim. This does not verify your identity." Production auth is untouched.

## Empty page to start history

Lee Bul still has no accepted records. The page says "No accepted exhibition records in ROB yet." It also says the page is not prepared as a public SEO page. Claim, then Add exhibition, is the path for a missing history.

## Unresolved risks

Additions live in one browser. They disappear if the tester clears prototype additions, and they are not shared with the next tester. The claim does not prove the person is the artist. Gallery and institution are labels on a submission, not logged-in organizations. Some older official rows still use the gallery name as the title. A dense timeline can hide the provenance label until a dot is opened.

## Preview

Serve `experiments/art-history-pilot/view-v2/` as static files. `http://127.0.0.1:8765/` was used for the check below and then stopped.

Checked in the browser:

- A search with no hit offers "Can't find yourself?"
- Creating "Avery Demo" shows DEMO · pilot only, an empty history, and the SEO caution
- Adding "Demo Room: A Fictional Group Exhibition" in 2024 at Demo Gallery, with Lee Ufan and Unresolved Person, stores the year as `2024`
- Lee Ufan stays at 130 documented exhibitions, plus 1 added in this browser, and the path back says the tester came through that demo exhibition
- A 1967 Sato Gallery row still says ✓ Official source and links to the Kukje page
- Lee Bul's empty page can be claimed without inventing exhibitions
- At 390px the horizontal track is hidden and the vertical list is shown
- No request left `127.0.0.1`
