# Goodreads import and library management

Showcase ticket 02 implements these flows. The migration is authored, not applied, and runtime/user-isolation QA remains with the user. No catalog, model, new environment variable, or service-role key is needed.

## Apply the migration

Review `supabase/migrations/20261004114040_library_management_import.sql`, then use the existing [linked-project migration workflow](05-first-library.md#4-link-review-and-apply-the-migration). The initial library and ticket 01 search migrations must precede it. Do not expose the `private` schema in Supabase's Data API settings. Restart the development server after the Next configuration change.

New nullable columns are `isbn10`, `isbn13`, `goodreads_book_id`, `goodreads_date_added`, `started_at`, and `finished_at`. `imported_shelves` preserves original labels, including the exclusive shelf. `goodreads_date_added` is the original Goodreads date; it does not replace the app's `created_at`. `updated_at` is maintained with a version-increment trigger. Dates are calendar dates, with start no later than finish. An owner-scoped partial unique index protects Goodreads IDs; owner/ISBN indexes support duplicate checks.

Owner-only UPDATE uses both USING and WITH CHECK. Grants allow changes only to status, rating, ownership, notes, pages, and reading dates; owner, title/authors, provenance, timestamps, version, and deletion remain outside the update grant. Imported creation fields receive explicit INSERT grants. Every private table has RLS.

`private.book_operations` stores immutable reader-scoped request/outcome pairs, including conflict/validation/not-found outcomes after request validation. It contains private text; do not export or log it. Authenticated clients have no direct table privileges, so cannot fabricate success outcomes. The public update RPC is an invoker wrapper around a narrowly scoped private SECURITY DEFINER implementation. This exception protects operation storage: it checks `auth.uid()`, accepts no owner argument, uses a fixed empty search path, and applies an explicit owner predicate to every book/operation read and write. Anonymous/PUBLIC execution is revoked. Only the checked function can record outcomes. No operation cleanup/expiry job is introduced.

## Manual book editing

Open a title from `/library`. `/library/[id]` shows edition/import provenance and labelled fields for status, half-star rating, ownership, pages, dates, and plain notes. Blank optional inputs remain null. Editing notes requires an explicit replacement checkbox. Saves use the shared service and authoritative result; failures retain the draft. Stale writes show the current saved version and an explicit action to load it into the form, replacing the draft only on that action. Reloading navigates to a fresh server read.

The form keeps its operation ID for retries of identical input. Changing the input generates a new ID; the expected version still protects against an earlier uncertain write. A returned operation outcome represents that operation's historical saved version; read the book again when continuing after unrelated later changes.

## MCP contracts

The [existing bearer-authenticated HTTP transport](06-library-search-mcp.md) now discovers three tools: `search_my_library`, `get_book`, and `update_book`. All tool input objects reject unsupported fields, including `user_id`. The existing 64 KiB request limit applies.

`get_book` takes `{ "id": "<app book UUID>" }`. Success is `{ "ok": true, "book": ... }`. Details contain search-summary fields plus notes, ISBNs, Goodreads ID, original shelves, Goodreads date added, started/finished dates, and updated timestamp. Owner IDs are excluded. A missing or inaccessible UUID returns the same `NOT_FOUND`, preventing disclosure of another reader's records.

`update_book` takes:

```json
{
  "id": "<app book UUID>",
  "expected_version": 1,
  "operation_id": "<new UUID>",
  "patch": { "notes": "A new reaction", "rating": 4.5 }
}
```

With the [tool expansion migration](12-expanded-agent-tools.md), additional patch keys are `title`, `authors`, `isbn10`, `isbn13`, `goodreads_book_id`, `imported_shelves`, and `goodreads_date_added`. The initial patch keys remain `status`, `rating`, `owned`, `page_count`, `started_at`, `finished_at`, `notes`, `notes_mode`. Notes append by default, separated from existing notes by a blank line. Use `notes_mode: "replace"` only for an explicit replacement request; it requires notes. Ratings are null or 0.5–5 in half-star increments; pages are null or integers 1–100,000; ownership is boolean/null; dates are null or valid YYYY-MM-DD; notes are bounded at 20,000 characters after append. Empty patches fail validation.

Success returns the authoritative book with its incremented version. Failures are `{ "ok": false, "error": { "code", "message" } }`, with `isError: true`. Codes are `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, and `UPSTREAM_UNAVAILABLE`. Stale-version conflicts may include `current` details. Operation-input conflicts do not. Same reader/operation/input recovers the stored outcome, without a second append or version increment; changed input with the same ID conflicts. Operation locking, row locking, update, and outcome persistence share one database transaction. A storage interruption reports an uncertain write; retry identical inputs/ID or read current state, without automatically issuing a new mutation.

## Import flow and limits

1. Open `/library/import` and choose a UTF-8 Goodreads export up to 2 MiB (2 × 1,024 × 1,024 bytes) and 1,000 records. The Server Action transport allows 3 MB to leave room for multipart fields; the feature still enforces its 2 MiB limit.
2. Preview CSV. The server parses it using pinned `csv-parse` 7.0.3 (`csv-parse/sync`), checks ownership-scoped duplicates, and returns row identities/status/rating, warnings, candidate identities, selection and excluded counts. Required unique headers are Title, Author, and Exclusive Shelf. BOM, quoted multiline fields, unknown columns, blank optional fields, and spreadsheet-wrapped ISBN strings are supported. Malformed quoting/record widths fail before any import.
3. Map unknown/blank exclusive shelves in the single mappings section, then preview again. Standard mappings are to-read → want_to_read, currently-reading → reading, read → finished. DNF, did-not-finish, didn't-finish, and abandoned (including original custom shelves) map to dropped; an explicit mapping overrides this. Unmapped rows stay excluded.
4. Valid unambiguous rows start selected. Existing Goodreads IDs are skipped without overwriting app edits. Without Goodreads ID, normalized exact ISBNs signal duplicates. Same title/author candidates in the library or within the CSV stay excluded until “Import as a separate edition” is selected. Candidate links allow inspecting an existing book; there is no fuzzy merge or overwrite action. Known duplicate rows cannot be selected.
5. Confirm the selected rows explicitly. Confirmation reparses the file and validates mappings/selections server-side; browser preview/counts are never trusted. `public.import_library_batch` handles up to 50 records per transaction, uses caller RLS plus explicit owner predicates, and rechecks duplicates under a per-reader transaction lock. Each row's insertion error is isolated. A partial Goodreads-ID unique index also protects concurrent/direct inserts. Imports never update an existing record.
6. The result reports actual acknowledged added/skipped/failed/excluded counts and separately counts uncertain rows when a batch response cannot be confirmed. Row problems remain visible. Retry the same file/selection explicitly; committed rows are skipped. Refresh/open the library to inspect persistence.

My Rating is personal rating; zero is unrated, and Average Rating is ignored. Reviews seed notes prefixed “Imported Goodreads review:” and retain multiline text. ISBN syntax/checksums, Goodreads numeric IDs, ratings, pages, and calendar dates are checked. Invalid optional values become null with warnings; missing ownership stays unknown. Reviews exceeding the notes limit are excluded with a warning. Required title/author or shelf-limit failures exclude the row rather than inventing a record. Date Started is optional; Date Read maps to finished_at. At most 100 original shelves of up to 200 characters are accepted.

Raw CSV is held only in the selected browser File and server request processing, never logged or stored. Content-derived reader-scoped row UUIDs make identical-file retries safe even without Goodreads ID/ISBN. A changed export without an external identity can become an ambiguous candidate requiring explicit selection. If multiple snapshots describe distinct editions with the same title/author, inspect and select deliberately. No enrichment or LLM call occurs.

## User verification still required

After migration application, check preview/confirm/reimport and refresh, including BOM, multiline reviews, unknown shelves, malformed optional fields, zero ratings, duplicate IDs/ISBNs, ambiguous editions, and partial/interrupted batches. Edit a book's rating/status/nullable values/dates/notes, refresh, and check deliberate replacement and stale-write recovery from two open copies. Preserve existing sign-in/manual-add/search flows.

Use the existing MCP client with real HTTP: discover all three tools, get a book, append a reaction, repeat the identical operation, and confirm the version/notes change only once. Changed operation inputs and stale versions must conflict. Test unsupported fields and other-account UUIDs. With two confirmed accounts, check UI/MCP/direct Data API isolation, denied owner/system-field updates and DELETE, denied direct operation-table access, and failed anonymous execution. No such tests or live requests were performed during implementation.

Official references checked: [CSV sync API](https://csv.js.org/parse/api/sync/), [CSV options](https://csv.js.org/parse/options/), [Supabase RPC](https://supabase.com/docs/reference/javascript/rpc), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), and [Next Server Action body limits](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions).
