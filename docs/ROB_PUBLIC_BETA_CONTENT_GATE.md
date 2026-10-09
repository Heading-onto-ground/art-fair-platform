# ROB public beta content gate

Decision: `PUBLIC_BETA_CONTENT_GATE_BLOCKED`

The local application rejected the database login, so the host was not treated as confirmed and the schema file was not applied. The pilot file was not read. Unresolved pilot rows are not a substitute for this count.

| Count | Value |
| --- | --- |
| Approved production sources | 0 |
| Imported exhibitions | 0 |
| Public artist entities queried | not queried |
| `HISTORY_READY` artists | 0 |
| `RICH_HISTORY` artists | 0 |
| Median exhibitions among index-eligible artists | none |
| Index-eligible artist pages | 0 |
| Spaces in the launch set | 0 |

`npx tsx scripts/history-content-gate.ts` exits without a database connection unless `ROB_CONFIRM_DATABASE=1`.

The core journey needs a few production-cleared histories with a real exhibition bridge between artists. That set does not exist in production yet. Publishing the 468 `PILOT_ONLY` records would not clear this gate.

Architecture and the production screens are in the app. They are not a clearance decision. Deploy stays stopped until approved sources and a dense cleared history exist.
