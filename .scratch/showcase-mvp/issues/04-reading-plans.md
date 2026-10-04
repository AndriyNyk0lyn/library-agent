# 04 — Reading plans and validation-driven revision

**What to build:** A reader requests a realistic schedule, sees missing or infeasible constraints explained, and deliberately saves a validated plan. The plan is visible after refresh and retrievable in later chat.

**Blocked by:** 03 — Agent chat, recommendations, and persistent memory

**Status:** resolved

**Triage:** ready-for-agent

**Assignee:** Codex reading-plans session 2026-10-04

## Start a fresh session

Read the [implementation brief](../spec.md), repository agent instructions, and the completed blockers including their handoff comments. Inspect the current implementation before changing it; baseline notes describe the starting point, not a substitute for current code. Claim this ticket before implementation. The user owns functional/manual testing; follow the brief's focused self-review and handoff policy.

## Starting point

Ticket 03 supplies chat, explicit preferences/reading constraints, timezone, persisted continuation, safe events, and bounded execution. The library has nullable page counts and versioned updates. Reading-plan schema/services/UI and MCP tools still need implementation.

## Implementation decisions

- Add owner-scoped reading plans linked to an authorized library book. Validate the referenced book belongs to the same reader on every save, including at the database boundary. Store start/target dates, remaining pages, calculated daily target, optional speed/time constraints, estimated minutes, assumptions, and active/completed/cancelled status. Keep the initial UI to saving and viewing plans; editing a saved schedule is outside this ticket.
- Use calendar date arithmetic in the reader's confirmed timezone: inclusive available days and ceil(remaining_pages / available_days). Validate positive pages, valid ordered dates, and optional positive speed/minute inputs. When full page count/progress are known, ensure remaining pages are consistent. Ask if required values/timezone are missing; do not infer pages read from reading status.
- When speed and daily minutes are both known, compare required estimated minutes with budget and return `PLAN_INFEASIBLE` plus usable constraint details. A plan with unknown speed can report a daily page target but must disclose that time feasibility is unknown. Keep calculations in ordinary code shared by UI and MCP.
- Register `save_reading_plan` with book UUID, date/page/time inputs, operation ID, and any necessary expected version for book-derived values. Use the established persisted retry mechanism; return authoritative saved calculations/assumptions or structured errors. Read-only feasibility calculation can be an additional compact tool if needed for proposing unsaved plans; document that it has no persistence effect.
- Register `list_reading_plans` with bounded pagination and optional book/status filters. Return only the reader's plans, including relevant book identity and assumptions. Never expose another reader's book through a plan join.
- Agent may explain an unsaved suggestion; merely asking for recommendations or feasibility does not save a plan. Save only on an explicit user request. Feed deterministic validation errors back into the agent. Cap revision attempts at two; suggest later dates/more time/shorter books and seek agreement before relaxing user constraints.
- Show the resulting plan as a structured chat result and in a simple plans view with book, dates, daily target, estimates, and assumptions. Refresh relevant views only after confirmed persistence. Retain user inputs and distinguish rejected, failed, and uncertain saves.

## Acceptance criteria

- [x] Shared deterministic arithmetic validates dates/pages/time budgets and does not invent missing inputs.
- [x] Saved plans and referenced books are reader-owned at service and database boundaries.
- [x] Requested plan saves persist with retry safety and authoritative results; read-only suggestions do not create rows.
- [x] Agent responds to validation feedback with at most two revisions while preserving the user's stated constraints.
- [x] User can retrieve saved plans through the UI and MCP/chat after refresh.
- [x] Unknown time feasibility, assumptions, rejected schedules, and uncertain writes remain visible and honest.

## Completion and handoff

Review the actual changes against this ticket and the shared brief. Fix concrete correctness, authorization, persistence, and reuse issues; keep unrelated cleanup out. Run only the applicable lint/type/format checks. Record implemented contracts, migrations and any manual application steps, dependency choices, self-review findings/fixes, exact static-check results, and unverified behavior under Comments. Update relevant docs so the next session can proceed without this chat. Resolve implementation only when its acceptance behavior is implemented; distinguish that from user QA and hosted verification.

## Comments

### 2026-10-04 — Published

Approved by the user as part of five required showcase slices plus one optional catalog slice. Functional testing and browser QA remain with the user.

### 2026-10-04 — Implementation resolved; user QA pending

- Added shared deterministic schemas/services/calculator, manual plan preview/save UI from book details, owner-only `/plans` with book/status filters and keyset pagination, accessible loading/errors/pending states, and reusable structured schedule cards. Inputs explicitly declare remaining pages, optional progress, confirmed timezone, dates and optional speed/budget. No inferred progress or fabricated page counts. Inclusive calendar days are independent of DST; starts must be today/later in the declared timezone. Known edition count/progress must agree. Estimates round up to hundredths; missing speed/budget remains unknown, and infeasible schedules return `PLAN_INFEASIBLE` plus calculation/constraints without saving.
- CLI-created `supabase/migrations/20261004154621_reading_plans.sql` is **not applied**. It adds RLS/grants, composite book/owner FK, reference/pagination indexes, generated inclusive days and arithmetic/feasibility checks. New saves lock the authorized book and reject stale `expected_book_version`. The existing immutable `private.book_operations` ledger/advisory lock coordinates retries across instances; identical payload/operation IDs recover original success/errors, changed payloads conflict. Lookup precedes current-date/version validation so successful retries survive midnight/later book edits. The private definer is scoped to `auth.uid()` and needed to protect immutable operation outcomes; the public wrapper is invoker. No owner input, direct plan-write grant or service-role credential.
- Registered `calculate_reading_plan` (read-only, no persistence), `save_reading_plan` (explicit request plus stable operation UUID), and `list_reading_plans` (bounded 1–25, book/status filters and filter-bound cursor). Both UI and MCP use the same services; saving recomputes at the database boundary rather than trusting supplied calculations. Validated results exclude owner/private notes and include authoritative identity/input/calculation/assumption snapshots. Reviewed database types include the new table/RPCs.
- Agent instructions distinguish suggestions/recommendations from explicit saving, clarify missing values/ambiguous books, and seek agreement before relaxing constraints. A per-run adapter enforces at most two calculation/save revisions after the first validation/conflict/infeasibility failure, returning `REVISION_LIMIT` without another HTTP request. All permitted tool calls still cross real authenticated MCP HTTP. An identical save of a successfully validated preview is persistence rather than a third revision and is allowed once without another revision slot. Original model-turn/deadline/run limits remain. Semantic intent/agreement remains for manual model evaluation.
- Chat captures validated observed tool results rather than model-authored plan fields, displays saved/unsaved/rejected/unconfirmed cards and new safe activity labels, and persists the latest five result cards separately in `private.agent_runs.plans`, including failed runs when finalization succeeds. The migration extends `finish_agent_run` with defaulted `p_plans`; snapshots include it and older rows default to no plan results. Durable plans outlive chat retention and are retrievable via MCP. Confirmed manual saves revalidate affected views; final chat persistence triggers refresh. Uncertain writes never replay automatically, including plan attempts in existing run warnings.
- Manual save failures retain values; definitive rejections allow correction/new operation IDs, stale versions offer reload, and unconfirmed saves retain the same ID/values with locked editing and explicit identical retry/saved-plan inspection. Self-review fixed the pending-edit mismatch by disabling form fields while submitting. Saved plans are immutable in this slice; status storage/filtering exists, but editing and status-transition controls were not added. Refresh/navigation can lose unsaved values/in-memory retry identity; inspect saved plans before starting a fresh operation. Route failure copy also warns about possibly committed saves.
- Focused code self-review covered server-derived identity, related-book ownership/FK/RLS/grants, definer scope and ledger integrity, stale versions/atomic retries, midnight retry recovery, calendar/progress/budget arithmetic, strict outputs, observed-result grounding, two-revision enforcement, UI input/recovery, retention and existing MCP/run capability boundaries. Fixed initial JSX/type-narrowing errors; made authoritative optional result fields required rather than defaulting missing storage fields. Static review does not prove SQL execution or isolation.
- No dependency/configuration changes. Consulted official Supabase changelog/RLS/RPC and Agents SDK MCP documentation plus installed types/current code. Local CLI help/new required approved filesystem access for its telemetry; no database/advisor query or remote change occurred.
- Final checks: `npm run lint` passed (zero warnings); `npm run typecheck` passed (`next typegen` and `tsc --noEmit`); `npm run format:check` passed; `git diff --check` passed. Changed Markdown was formatted and checked separately. Existing tests preserved; no tests added/run, build, browser QA, functional test, paid model request, live MCP test, migration application, account/resource provisioning or deployment.
- Updated [reading-plans setup/contracts](../../../docs/setup/09-reading-plans.md), README, agent/project setup guidance, chat/MCP handoffs and verification record. **User next actions:** review/apply this migration after 01–03, restart, and manually verify preview versus save, invalid/missing/infeasible inputs, calendar boundaries, persistence/refresh/pagination, stale/conflicting/identical retries, model agreement/two revisions, disconnect recovery and two real accounts through UI/MCP/Data API. Ticket 05 is the next required implementation frontier. Acceptance boxes mean implemented behavior, not verified hosted/runtime behavior.
