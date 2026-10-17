# Search demand quality

Frontier ranking uses `REAL_VISITOR` only.

`SEARCH_NO_RESULT` rows created before `2026-10-15T14:28:15.000Z` are `LEGACY_MIXED`. That instant is the merge of PR #31, when operator checks stopped sharing the public event. The rows stay in the database and on the admin health page. They are not rewritten and they do not rank the frontier.

Later rows:

| Class | How it is recorded |
| --- | --- |
| `REAL_VISITOR` | public request, no admin session |
| `OPERATOR` | signed-in admin session |
| `QA_TEST` | test runtime |
| `INVALID_QUERY` | empty, too short, or otherwise not a demand query |

The request body cannot set the class. A public client that sends `operator: true` is still a real visitor. A future public search for 김홍도 remains real demand. The same text from an admin session or a test run does not.
