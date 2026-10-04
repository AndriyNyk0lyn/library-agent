# 02 — Goodreads import and library management

**What to build:** A reader imports a Goodreads snapshot with a preview and result summary, opens book details, and saves status, rating, notes, and edition inputs. The agent-facing MCP can retrieve and safely update the same records.

**Blocked by:** 01 — Library search and authenticated MCP

**Status:** resolved

**Triage:** ready-for-agent

**Assignee:** Codex — 2026-10-04 import-management session

## Start a fresh session

Read the [implementation brief](../spec.md), repository agent instructions, and the completed blockers including their handoff comments. Inspect the current implementation before changing it; baseline notes describe the starting point, not a substitute for current code. Claim this ticket before implementation. The user owns functional/manual testing; follow the brief's focused self-review and handoff policy.

## Starting point

Ticket 01 provides search/filter services and authenticated MCP transport. Manual book creation exists, but editing, import metadata, UPDATE grants/policies, and mutation idempotency storage do not. Extend the existing book contracts and services rather than creating a parallel library implementation.

## Implementation decisions

- Add book details and plain edit forms for status, half-star rating, personal notes, ownership, page count, and optional started/finished dates. Preserve nullable values and user-entered notes. Manual note replacement must be deliberate; tool reactions append by default.
- Add `get_book` (book UUID) and `update_book` (UUID, allowlisted patch, expected version, operation ID). Return the authoritative saved record and new version. Reject stale updates with `CONFLICT`; distinguish inaccessible/missing records without exposing another reader's data. Unsupported fields and owner changes are rejected.
- Make version checking/increment and persisted operation-ID coordination atomic. The same user/operation/input recovers the recorded outcome; changed inputs under the same operation ID conflict. A retry cannot append notes twice. Scope coordination to the reader; use PostgreSQL rather than process memory. Add owner-only UPDATE grants/policies with both USING and WITH CHECK; DELETE is outside scope.
- Import UTF-8 Goodreads CSV up to 2 MB/1,000 rows with a maintained parser. Support BOM, quoted multiline reviews, blank optional fields, unknown columns, and spreadsheet-wrapped ISBN strings. Parsing/duplicate detection are ordinary code.
- Map personal rating (zero to null), exclusive shelves, reviews, Goodreads ID, ISBNs, page count, date read/date added, and relevant original shelves. Map to-read/currently-reading/read to want_to_read/reading/finished; recognized DNF to dropped. Invalid optional values produce row warnings and nulls, not invented values. Label imported reviews as imported.
- Approved minimal preview interaction: one shelf-mapping section; unmapped shelves and ambiguous title/author candidates stay excluded until the reader explicitly maps/selects them. Show the excluded count. Valid unambiguous rows can proceed. Never fuzzy-merge. These defaults remove the need to reopen the old import-decision discussion.
- Reimport skips existing Goodreads IDs without overwriting app edits, enforced by an owner-scoped partial unique constraint. Without Goodreads ID, normalized ISBN signals a duplicate; uncertain title/author matches require explicit selection. Keep editions distinct where identity is ambiguous.
- Confirm import explicitly. Validate server-side rather than trusting browser preview/counts. Persist in bounded batches, return real added/skipped/failed counts and row errors, and make retries skip committed records. Do not log or unnecessarily retain the raw CSV. Catalog enrichment is optional ticket 06 and cannot gate import.
- Add only schema fields needed here and document their meaning. Import may need separate date-added provenance; do not equate a Goodreads date with the app creation timestamp silently. Extend reviewed database types and migrations together.

## Acceptance criteria

- [x] Book details and manual edits persist through the shared service, retaining entered values on failure and surfacing stale-write conflicts.
- [x] `get_book` and `update_book` share UI rules, require verified ownership, and cannot change ownership or arbitrary fields.
- [x] Atomic version updates and persisted operation IDs protect repeated updates/note appends.
- [x] CSV preview shows mappings, warnings, selected/excluded rows, and duplicate information before confirmation.
- [x] Confirmed imports return actual partial results, preserve reviews and unknown values, and avoid overwriting edits or duplicating known Goodreads IDs.
- [x] Import works without any external catalog service or model call; new grants/policies remain owner-scoped.

## Completion and handoff

Review the actual changes against this ticket and the shared brief. Fix concrete correctness, authorization, persistence, and reuse issues; keep unrelated cleanup out. Run only the applicable lint/type/format checks. Record implemented contracts, migrations and any manual application steps, dependency choices, self-review findings/fixes, exact static-check results, and unverified behavior under Comments. Update relevant docs so the next session can proceed without this chat. Resolve implementation only when its acceptance behavior is implemented; distinguish that from user QA and hosted verification.

## Comments

### 2026-10-04 — Published

Approved by the user as part of five required showcase slices plus one optional catalog slice. Functional testing and browser QA remain with the user.

### 2026-10-04 — Implementation resolved; user QA pending

- Added `/library/[id]` and `/library/import`, linked from the existing library. Plain labelled edit controls preserve nulls and retain drafts on failure, require deliberate note replacement, show saved versions, and offer the current record on stale conflicts. Shared services own validation/read/update; no parallel library implementation or external catalog/model path.
- Added MCP `get_book` (strict UUID object) and `update_book` (UUID, allowlisted patch, expected_version, operation_id). Details exclude owner IDs. Missing/inaccessible records share NOT_FOUND; stale versions/changed operation inputs return CONFLICT. Notes append by default; explicit notes_mode=replace enables deliberate replacement. Results are validated and authoritative, and uncertain saves instruct same-input/ID retry or current read.
- `20261004114040_library_management_import.sql` is authored **not applied**. It extends reviewed types with ISBNs, Goodreads ID/original shelves/date-added provenance, reading dates, and updated timestamp; adds owner-scoped Goodreads uniqueness/ISBN indexes, UPDATE grants and USING/WITH CHECK, version trigger, atomic row/version/operation coordination, and 50-row import RPC. No DELETE or owner/system-field update grants. Private operation storage has RLS and no authenticated table grants; a checked private SECURITY DEFINER implementation behind an invoker public RPC derives auth.uid(), scopes every access, fixes search_path, and revokes PUBLIC/anonymous execution. This narrowly scoped exception prevents clients forging recorded outcomes; import/read RPCs remain invoker/RLS based. Keep `private` unexposed.
- Pinned maintained `csv-parse` 7.0.3 and generated the lockfile. Checked official CSV/Supabase/Next APIs; no other new dependency/config variable. Server Actions allow 3 MB transport while feature/file processing enforce UTF-8, 2 MiB and 1,000 rows. The existing five high-severity npm advisories remain; no forced downgrade.
- Server preview/confirmation preserve BOM/multiline reviews, spreadsheet ISBN wrappers, original shelves and separate Goodreads date-added provenance. Personal zero rating becomes null; invalid optional values produce nulls/warnings, reviews are labelled imported, unknown ownership stays null. Shelf mappings and explicit separate-edition selections control excluded rows. Both existing-library and intra-CSV title/author candidates require selection; no fuzzy merge. Reimport skips known Goodreads IDs/normalized ISBNs without updates. Reader/content-derived IDs protect identical-row retries without external IDs. Confirmation reparses/validates and rechecks duplicates in bounded transactions; returns acknowledged added/skipped/failed/excluded counts, separate uncertain counts and row issues. Raw CSV is not persisted/logged.
- Focused self-review fixed: missing heading prop (initial typecheck), fabricated-outcome risk from direct operation INSERT grants, calendar validity and blank spreadsheet ISBNs, intra-CSV ambiguity authorization at confirmation, operation retry/draft handling, success feedback lost on revalidation remount, uncertain batch counts, and extracted the existing primary-button styling for the new action controls. Reviewed actual auth predicates, grants/RLS, trigger/version/operation locks, known-ID uniqueness, note/date bounds, output projection, and accessible pending/error/selection states. No unrelated cleanup.
- Final static checks: `npm run lint` passed (zero warnings), `npm run typecheck` passed (`next typegen` and strict `tsc --noEmit`), `npm run format:check` passed. Targeted changed-Markdown formatting/checks passed. The initial typecheck's heading error was corrected. Existing tests remain intact; none were added or run.
- Updated [import/management setup and contracts](../../../docs/setup/07-import-library-management.md), README, setup index, MCP cross-reference, showcase index, and verification record. The next frontier is ticket 03. No env/account/service/deployment was provisioned; the CLI only created a local migration (help/create needed approved telemetry filesystem access).
- **User actions / unverified:** review/apply the migration via the existing first-library workflow and restart dev after config changes. Verify import/refresh/reimport/partial-interrupted responses, nullable edits/date order/note replacement, concurrent stale forms, MCP get/update/append/same-ID replay/changed-input conflicts, anonymous/direct-grant restrictions, and two real accounts through UI/MCP/Data API. No functional tests, database/advisor queries, builds, browser QA, live MCP/paid-model calls, or migration application occurred. Checked acceptance boxes describe implementation, not runtime/hosted verification.
