# Expanded agent and MCP tools

The [expanded tools ticket](../../.scratch/agent-tools/issues/01-expanded-tools.md) adds catalog edition reads/additions, all reader-managed book edits, atomic bulk updates and optional internet search. General recommendations can include external Open Library candidates grounded in reading history; explicit library/owned-only requests stay within saved records. Implementation/static review does not establish SQL execution, real MCP/model behavior or account isolation.

## Setup

1. Review and apply `supabase/migrations/20261005060400_optional_open_library.sql`, then `supabase/migrations/20261005064304_agent_tool_expansion.sql`, after the existing migrations. Use the [first-library migration workflow](05-first-library.md#4-link-review-and-apply-the-migration). Neither migration was applied by this change. The expansion migration is required for the expanded book patch, bulk tools, catalog addition and safe activity names.
2. For catalog tools, set `OPEN_LIBRARY_ENABLED=true` and a real `OPEN_LIBRARY_CONTACT_EMAIL`; see [catalog configuration](11-open-library.md). Otherwise catalog discovery/edition/add tools are not advertised.
3. For internet search, set `WEB_SEARCH_ENABLED=true`. It uses the server `OPENAI_API_KEY` and `WEB_SEARCH_MODEL`, falling back to `OPENAI_MODEL` when the override is blank/absent. Select an available model supporting Responses `web_search`. Otherwise `search_web` is not advertised. Search makes a separate API request and can incur OpenAI charges; no paid request was made during implementation.
4. Restart the app after changing environment flags. Existing credentials, authentication and the real MCP HTTP hop are retained. No dependency, account, deployment or service was created.

Deploy the matching code and migration together. Old saved-library cards remain readable; new external cards are stored within the existing bounded `cards` JSON array. The existing finish/snapshot RPC signatures and continuation persistence are unchanged. Running older app code against new external cards is unsupported because its display schema only understands library cards.

## Tools and editable fields

`update_book` retains `{id, expected_version, operation_id, patch}` and authoritative `BookResult`. It now accepts `title`, `authors`, `isbn10`, `isbn13`, `goodreads_book_id`, `imported_shelves` and `goodreads_date_added`, alongside status/rating/ownership/pages/notes/reading dates. These edits are available through MCP/chat; the existing manual editor keeps its current controls. Book UUID, account owner, version, creation/update timestamps and captured catalog provenance are system fields. Changing content never changes those identities or rewrites provenance. Version/timestamps advance on successful updates.

Title is 1–500 characters; authors are 1–10 nonempty entries of at most 200 characters; shelves have up to 100 strings of at most 200 characters. ISBNs are unhyphenated ISBN-10/13 or null; Goodreads ID is 1–30 digits or null. Dates are real ISO calendar dates or null. Existing rating, page-count, note-length and date-order constraints remain; duplicate Goodreads IDs are rejected. Notes append unless explicitly replaced. Only supplied fields change.

The private versioned mutation function handles these fields; direct client UPDATE column grants are not broadened. Existing RLS/identity checks and immutable operation outcomes remain. The single/bulk paths share `private.valid_book_patch` and `private.patched_book` semantics.

| Tool                     | Input                                      | Result / behavior                                                                                  |
| ------------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `search_catalog`         | Query, optional author/ISBN, bounded limit | Existing external work search, with suggested edition identity when available                      |
| `get_catalog_book`       | `{edition_id}`                             | Precise edition metadata; no insertion                                                             |
| `add_catalog_book`       | `{edition_id, operation_id, fields?}`      | Fetches actual edition metadata server-side, inserts once and returns the authoritative saved book |
| `preview_library_update` | `{preview_id, filters, patch}`             | Freezes all matching saved-book IDs/versions, count and five sample identities; changes no books   |
| `apply_library_update`   | `{preview_id, operation_id}`               | Applies the frozen patch atomically, or changes no books on stale/invalid input                    |
| `search_web`             | `{query}`                                  | Bounded web summary plus cited HTTP(S) source URLs; no library write                               |

### Catalog addition

Resolve the requested title/author using search; read the chosen edition to inspect ISBN/pages/language/publication. Clarify multiple plausible books or a stated edition preference. A unique title/author match can use its suggested edition when no edition preference is stated. A clear “add this book” authorizes the write; search/recommendation alone does not.

Addition defaults to want-to-read, unknown ownership, no personal rating and empty notes. Optional `fields` use the same editable patch schema to supply reader facts or correct edition metadata. Missing edition authors require reader-supplied authors. Server-fetched provenance stays separate from these corrections. Duplicate edition/ISBN or normalized title/author matches produce a conflict and no automatic merge. Tool additions are serialized per reader to prevent concurrent tool requests adding the same match; manual/import insert paths retain their existing duplicate contracts.

Before catalog lookup, the addition service probes the operation ledger. Identical inputs/operation ID recover the original saved/error outcome, even after catalog outages or subsequent book edits. New operations capture fresh metadata; changed inputs under an existing operation ID conflict. Unconfirmed writes are never replayed automatically. The catalog provider's cache, upstream admission limits and timeout rules remain unchanged.

### Bulk changes

For “set every book to owned”, prepare:

```json
{
  "preview_id": "<fresh UUID>",
  "filters": {},
  "patch": { "owned": true }
}
```

Then apply with that `preview_id` and a new stable `operation_id`. Clear scope/change requires no additional generic confirmation. Ambiguous scope gets a preview and clarification before application.

Filters support the same literal title/author query, reading status and known ownership as library search. They do not take pagination: `{}` snapshots the whole library, bounded at 5,000 books. Larger matches reject rather than silently truncate. Preview lasts 15 minutes; books added later are excluded. Preview IDs are durable and immutable; retrying the same ID returns the same snapshot and expiry.

Application locks all target rows in UUID order and checks every version before writing. One set-based UPDATE shares the single-book patch semantics and triggers; any stale/missing target or constraint failure rejects the whole batch. No partial changes are reported as success. Success returns `matched_count`, `changed_count` (updated rows), `applied=true`, patch, sample and expiry. Identical application inputs/operation ID recover the saved outcome even after preview expiry; a different operation against an already-applied snapshot conflicts on the changed versions. Empty matches return zero changed books honestly.

Snapshots and application outcomes use the existing private ledger, with explicit reader checks and no direct client table access. Preview metadata is retained with the ledger's existing lifetime policy; expiry prevents later application, not historical retry recovery.

### Recommendations and internet research

General recommendations based on reading history retrieve finished books/ratings, relevant reactions and explicit preferences, then search saved unread and suitable external candidates. Library-only and owned-only requests use saved library tools; missing ownership is never known owned. The agent's source routing is an authored instruction and requires model QA, rather than a claim of deterministic natural-language intent classification.

Three total cards are the default; explicit requests can return up to four across saved and external books, including three from TBR plus one absent from the library. Apply `20261005074444_four_recommendation_cards.sql` with the matching code: it expands the table CHECK and finish RPC to four cards without changing ownership, run capability, lease or history checks. Older cards remain valid. Requests above four receive an explanation of the per-reply limit. Saved-library references retain final authoritative book/eligibility reads. External `catalog_ref` values are created only from current-run observed catalog HTTP results. Final validation resolves actual catalog title/authors/source, rejects duplicate edition identities and known-owned claims, and checks title/author matches in the saved library over MCP. A matching existing book or incomplete matching search rejects the external card rather than claiming the book is absent. External cards are labeled “not saved”; no recommendation automatically creates a book. Taste, pace and difficulty remain predictions unless supported by reader reactions, not manufactured catalog facts.

`search_web` makes one server-side Responses request with `web_search`, required tool use, a one-tool-call bound, 1,600 output tokens, low search context, `store:false`, an 18-second deadline and a 512 KiB response bound. It requires an observed web-search call and validated URL citations; incomplete/no-source/unavailable responses return an honest error. No automatic retries, arbitrary URL fetch tool or independent runtime agent was added. See [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search).

Only the model-supplied public query is forwarded, not the profile, conversation or library payload. Instructions prohibit private data in queries; semantic compliance still needs model QA. Source URLs from observed results are appended to the saved answer and rendered as clickable HTTP(S) links. Activity stores tool names/phases/outcomes only. This optional MCP tool uses the app key; direct authenticated MCP requests are outside the chat run quota and can also incur charges. Chat's existing 10 runs/hour, eight model turns, one active run and 60-second total deadline remain. MCP calls now have a 22-second bound to accommodate edition/web lookup; slow compound requests can still reach the total run deadline and must recover honestly.

## Manual verification remaining

- Apply migrations and enable/disable flags; inspect real MCP discovery and safe persisted activity.
- Add a uniquely resolved edition in chat, reload its actual fields/provenance, retry identical inputs, change the payload under the same operation ID, and check existing/ambiguous/missing-author cases and upstream outages.
- Edit title/authors/ISBN/shelves/dates/ownership; verify unrelated notes/provenance stay intact, stale versions conflict and Goodreads ID collisions fail.
- Apply `{owned:true}` to the whole library and a filtered subset; compare counts, check preview expiry/later inserts, concurrent edits, invalid row constraints, atomic rollback and uncertain-write retry recovery.
- Ask for library listings, library-only and owned-only recommendations, history-based general recommendations, empty history and external books already in the library. Check sources, card labels, refresh persistence and eight-turn/deadline behavior.
- Search public book facts with internet search enabled; check configuration/model compatibility, citations, timeout/no-source failures and malicious instructions inside external text. Verify private reading data stays out of queries.
- Verify anonymous rejection and two real readers across UI, MCP and direct Data API/RPC, including foreign previews/operation IDs and protected fields.

No migrations, database/advisor queries, functional tests, browser checks, builds, live MCP or paid-model/API requests were run. Static checks and focused review are recorded in the ticket.

## Mixed recommendation failure follow-up

The reported `INVALID_MODEL_OUTPUT` / `ModelBehaviorError` is an SDK-level error; the former combined three-card limit would instead produce `INVALID_RECOMMENDATIONS` after SDK output validation. The supplied log cannot prove which answer or tool was rejected. Server diagnostics now add only an allowlisted `model_failure`: `final_output_schema`, `missing_final_output`, or `other_model_behavior`. Sensitive logging remains disabled; raw output, error messages and private tool payloads are never logged. Official [SDK error handling](https://openai.github.io/openai-agents-js/guides/running-agents/#errors-and-recovery) and installed 0.18.0 source were inspected.

After applying the four-card migration and restarting the app, reload saved status and submit a new run for “recommend me 3 horror books from my TBR and 1 that I don't have”. Confirm three saved eligible cards and one labeled external card when sufficient evidence is found; refresh to check persistence. If it fails again, the new `model_failure` category will narrow diagnosis. No model retry or tool replay is introduced.
