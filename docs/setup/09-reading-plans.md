# Reading plans

Ticket 04 implements `/plans`, `/plans/new?book_id=<library UUID>`, three MCP tools, and persisted structured plan results in chat. Code/self-review and static checks are complete; SQL execution, persistence, model behavior and account isolation remain for user verification.

## Setup

Review `supabase/migrations/20261004154621_reading_plans.sql` and apply it **after** the library/search/management/chat migrations using the [existing linked-project workflow](05-first-library.md#4-link-review-and-apply-the-migration). The implementer has not applied it. Restart the app afterwards. The migration changes the chat finish RPC signature as well as adding plans, so deploy/apply the matching code together; the old code can omit the new defaulted `p_plans` parameter, but new code needs this migration.

No dependencies, environment variables, accounts, services or model configuration were added. Manual plan calculation/saving/listing needs Supabase; chat keeps the existing OpenAI/MCP configuration and limits.

Open a library book and select **Make a reading plan**. Enter remaining pages explicitly, optionally enter pages read, confirm the timezone and choose absolute dates. Saved profile timezone/speed/budget prefill the form; unknown values stay blank. These plan inputs do not update lasting preferences. **Check schedule without saving** has no persistence effect. **Save reading plan** deliberately persists a validated active schedule. The Plans view supports book/status filters and older-page navigation; saved-schedule editing and status transitions are outside this ticket.

## Calculation and validation

UI and MCP share `src/plans/service.ts`, schemas, and the ordinary TypeScript calculator. The save RPC independently recomputes the same rules under a book lock, rather than trusting client-calculated targets. Stored fields/results are authoritative.

- `available_days = target_date - start_date + 1`, inclusive calendar days; `daily_pages = ceil(remaining_pages / available_days)`. Calendar dates are compared in the confirmed timezone, with UTC date ordinals used only for whole calendar-day differences; DST does not remove/add a day.
- Dates must be real ISO calendar dates in years 0001–9999, ordered, with start on/after the current date in the declared timezone. The timezone must be supported by the application and PostgreSQL's timezone catalog. No timezone is inferred from the browser or account.
- Remaining pages are explicit positive integers ≤100,000. Reading status never establishes progress. If the book's full page count is known, remaining pages cannot exceed it; if pages read (nonnegative integer ≤100,000) are also supplied, their sum must equal the known count. Unknown full page count remains disclosed, without fabricated edition data.
- Speed is optional positive pages/hour ≤10,000; budget is optional integer 1–1,440 minutes/day. `estimated_daily_minutes = ceil(daily_pages * 6000 / pages_per_hour) / 100` rounds up to hundredths of a minute. Extremely small speeds with unrepresentable estimates are rejected.
- When both constraints are present, an estimate above the budget produces `PLAN_INFEASIBLE`, including the unsaved calculation and usable constraint details. No plan row is created. Otherwise time feasibility is `feasible` or explicitly `unknown`; a page target alone does not establish time feasibility.
- Assumptions disclose daily reading including endpoints, a shorter possible last day, reader-declared progress, constant declared speed/excluded breaks, unknown budget/speed, and unknown edition page count where applicable.

## MCP contracts

All tools derive ownership from independently verified bearer identity and use the same user-scoped services as the UI. No owner argument or service-role key is accepted. The real agent-to-MCP HTTP boundary is preserved.

`calculate_reading_plan` takes `book_id`, `expected_book_version`, `start_date`, `target_date`, `timezone`, `remaining_pages`, and optional nullable `pages_read`, `pages_per_hour`, `daily_reading_minutes`. It reads the authorized book and returns `{ ok: true, calculation }` or `{ ok: false, error, constraints? }`. It does not save a plan or mutation outcome.

`save_reading_plan` takes those fields plus UUID `operation_id`. It returns `{ ok: true, plan }` or the same structured error shape. Saved plans include book identity/version/page-count snapshot, explicit inputs, inclusive days, daily pages, estimated minutes, time feasibility, assumptions, UUID/operation ID, status and creation time. There are no private notes or owner IDs in results.

`list_reading_plans` takes optional UUID `book_id`, optional `status` (`active`, `completed`, `cancelled`), integer `limit` (1–25, default 10), and opaque `cursor`. Returns `{ ok: true, plans, next_cursor }`; empty is an honest successful read. Order is creation timestamp/UUID descending; pagination uses an exclusive keyset with one-row lookahead. Reuse the same filters with the returned cursor; changed filters require restarting. Cursors are not authorization. Book identities are saved snapshots; later book edits do not silently revise schedules.

Errors: `VALIDATION_ERROR` for missing/invalid/inconsistent inputs, `NOT_FOUND` for an inaccessible book, `CONFLICT` for stale book versions or changed operation payloads, `PLAN_INFEASIBLE` for the stated budget, and `UPSTREAM_UNAVAILABLE` for unavailable reads/unconfirmed saves. The run adapter additionally returns `REVISION_LIMIT` when it blocks excess model plan revisions, without making another HTTP call.

## Persistence and ownership

`public.reading_plans` has RLS and authenticated SELECT only; client INSERT/UPDATE/DELETE grants are revoked. Owner SELECT and INSERT policies check the related book. A composite `(book_id,user_id)` foreign key to `(library_books.id,library_books.user_id)` enforces related ownership at the database boundary, including privileged inserts. Reader/order and book/owner indexes support pagination and references. Table checks enforce dates/pages, generated inclusive days, calculated targets, estimates and feasible/unknown status.

`public.save_reading_plan` is a SECURITY INVOKER wrapper over a narrow private SECURITY DEFINER function. The private function is required to protect the existing immutable `private.book_operations` ledger from direct forged writes. It accepts no owner, requires `auth.uid()`, and explicitly scopes every book/ledger access. The same owner/operation advisory lock used by book/profile mutations serializes retries across instances. A request discriminator prevents cross-feature operation collisions. Identical requests return the original saved/error outcome; changed inputs conflict. The locked authorized book must match `expected_book_version` on every new save. This preserves book-derived input validity against concurrent edits.

Ledger lookup precedes book version/current-date validation so identical retries can recover an original success after later book edits or midnight. Definitive validation/version/infeasibility failures are also recorded after input validation; use a fresh operation ID when deliberately changing the request. Direct missing/malformed inputs are rejected without recording an outcome. Plans and operation outcomes persist independently of bounded chat retention. Existing user/book deletion cascades remove dependent plans; deletion tools are not added.

## Chat, revision and recovery

The agent asks for missing pages/timezone, resolves ambiguous books, uses current versions, and distinguishes unsaved feasibility from explicit save requests. Recommendations do not save plans. On validation feedback it explains alternatives and seeks agreement before changing dates/time/book constraints. Code allows at most **two** revised calculation/save attempts after the first validation/conflict/infeasibility error per run; later attempts get `REVISION_LIMIT`. Saving an identical successfully calculated preview is persistence rather than a further revision and is allowed once without consuming another revision slot. The original eight-model-turn and total deadline caps remain. Semantic agreement/intent still needs manual model evaluation.

Plan cards come from validated **observed HTTP results**, not model-emitted schedule fields. Latest five saved/retrieved, unsaved or rejected/unconfirmed results are stored separately as `private.agent_runs.plans` and displayed alongside existing recommendations/activity, including in failed runs when final persistence succeeds. Older chat rows default to no plan cards. `list_reading_plans` retrieves durable schedules even after chat history is trimmed. Unconfirmed or interrupted runs still warn about possibly committed plan writes. A saved plan can exist even if final chat persistence fails; check the Plans view.

Confirmed manual saves revalidate the plans/book views; chat refresh follows its confirmed final run event. Definitive failures retain editable inputs; stale versions offer a current-book reload. An uncertain manual save retains its operation ID and submitted values, locks editing, and offers **Retry identical save** or **Check saved plans**. No save/POST is replayed automatically. Pending fields are disabled so the visible values remain the submitted values. A browser refresh/navigation can lose unsaved form inputs and its in-memory retry ID; inspect saved plans before starting a new save. A route/transport failure likewise offers saved-plan inspection without replay.

## Manual checks for the user

1. Apply the migration, then check missing pages/timezone, same-day schedules, leap dates/date order, DST/current-date boundaries, known-count/progress mismatch, absent speed/budget and impossible budgets. Confirm preview/rejection creates no plan row.
2. Save a feasible/unknown-time plan manually, refresh, filter and paginate. Through MCP, retry identical operation inputs, change the payload under the same ID, update the book version before a new save, and recover an original success after a book edit.
3. In chat, request feasibility only, request an impossible schedule, agree to a revised target in a later turn, explicitly save, refresh and retrieve plans later. Confirm constraints are not silently relaxed, missing values are asked for, at most two revisions occur per run, and cards match authoritative calculations.
4. Check keyboard/announced errors, pending input locking, two tabs/stale versions, cancellation/disconnection/final-persistence recovery without automatic writes. Verify two actual accounts through UI, MCP and direct Data API/RPC: owner-only lists, anonymous denial, no foreign-book plan references, no direct plan writes or forged ledger outcomes.

No automated tests, functional tests, browser QA, database/advisor queries, remote migration, paid-model request or build were performed. Existing tests were preserved. Static checks/self-review do not prove SQL execution, model compliance or isolation.

## References consulted

- [Supabase RLS/grants](https://supabase.com/docs/guides/database/postgres/row-level-security) and [JavaScript RPC](https://supabase.com/docs/reference/javascript/rpc).
- [Supabase changelog](https://supabase.com/changelog): checked relevant Postgres minor-release and Data API grant changes; no affected extensions were introduced, and table/function grants are explicit.
- [Agents SDK MCP integration](https://openai.github.io/openai-agents-js/guides/mcp/); installed SDK types and existing observed HTTP adapter were retained without dependency changes.
