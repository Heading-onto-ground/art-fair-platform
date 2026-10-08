# HUMAN TEST PROTOCOL

Use this after opening `experiments/art-history-pilot/view-v2/index.html` through a local static server. Do not deploy it. Do not treat a small test as proof of market demand.

The prototype is ready for people. It is not yet validated.

## Who to ask

Aim for 5–10 people. A mix is useful, and one type is enough to begin:

- someone who looks at art but does not work in it
- an artist
- a curator or gallery worker, if one is available

Ask each person to use their own browser, or clear "Clear prototype additions" and "Clear log" between people. Additions stay in that browser only.

## What to watch

Two actions matter more than whether the page looks polished.

1. After opening one artist, does the person open an exhibition and then another artist without being told to?
2. If they are an artist, or are asked to imagine they are one, would they add a missing exhibition?

The log names for those are `SECOND_ARTIST_REACHED` and `START_HISTORY_CLICKED` / `EXHIBITION_ADDED`.

## Scenarios

Use real pilot data for A–C. Create D in the session. Do not invent a career for a real artist.

A. Dense. Search `Lee Ufan` or `이우환`. 130 documented exhibitions. Open one event. If a co-participant button appears, it is optional. The interesting part is whether they choose one.

B. Medium. Search `Park Chan-kyong` or `박찬경`. 11 documented exhibitions.

C. Empty. Search `Lee Bul` or `이불`. The page should say there are no accepted records in ROB yet. It should not imply she has no exhibition history in the world.

D. Demo only. Search a name that is not in the list, such as `Avery Demo`. Choose "Can't find yourself? Start your history". The page must say DEMO · pilot only. Add one fictional exhibition. Do not use a real artist's missing shows for this scenario.

## Moderator script

Say this, then stop helping unless they are stuck.

1. "This is a prototype, not the live ROB site. Look at the first screen. In your own words, what do you think it is for?" Wait about ten seconds. Do not explain.
2. "Search for an artist you want to see." If they have no name, offer Lee Ufan.
3. Say nothing while they look. Note whether they open an exhibition, a source, or another artist.
4. "Here is an artist with fewer records." Ask them to open Park Chan-kyong.
5. "Here is an artist with no accepted records in this prototype." Ask them to open Lee Bul. Ask what they think the empty page means.
6. "Imagine a record of yours was missing. Show me what you would do." Let them use Claim this page or Start your history. Do not fill the form for them.
7. Ask them to add one exhibition only if they want to. Blank fields are allowed. A year can stay a year.
8. Ask the seven questions on the page and have them press Save answers.
9. Press Export log. Keep the JSON with their name or a code, not in the repository if it contains personal notes.

## Questions on the page

Scores are 1 to 5, except the last, which is text.

1. Did you understand what ROB does?
2. Did you want to click another artist?
3. Was the timeline easier than a normal CV?
4. Did you trust the information?
5. Did the source labels help or distract?
6. If you were an artist, would you add missing history?
7. What confused you?

## Events in the export

The file `rob-pilot-session-log.json` contains `log` and `prototype`.

`log` can include:

- SEARCH_PERFORMED
- ARTIST_OPENED
- TIMELINE_EVENT_OPENED
- CONNECTION_FOLLOWED
- SECOND_ARTIST_REACHED
- SOURCE_OPENED
- START_HISTORY_CLICKED
- EXHIBITION_ADDED
- CLAIM_DEMO_CLICKED
- RETURNED_TO_PREVIOUS_ARTIST

`prototype.answers` holds the scores. `prototype.events` holds anything they added. `prototype.claims` holds demo claims.

Count these separately. Do not average them into one product score.

- SEARCH → ARTIST
- ARTIST → EVENT
- EVENT → ANOTHER ARTIST
- ARTIST → SOURCE
- EMPTY PAGE → START HISTORY
- CLAIMED PAGE → ADD HISTORY

## How to read a small test

A strong signal, still not a market proof: several people open a second artist without being pointed at the button, and artists say they would add a missing exhibition and can do it without an explanation.

A weak signal: people understand the search but stop on the first timeline, or the source labels make them hesitate, or an artist cannot tell how to add a missing show.

Either result is a reason to change the prototype before any production migration. Neither result is a pivot verdict.
