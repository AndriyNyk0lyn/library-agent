# 01 — Library search and authenticated MCP

**What to build:** A reader searches and filters their own saved books in the library UI. The same results are available through a real authenticated MCP HTTP endpoint for later agent use.

**Blocked by:** None — can start immediately

**Status:** resolved

**Triage:** ready-for-agent

**Assignee:** Codex — 2026-10-04 library-search session

## Start a fresh session

Read the [implementation brief](../spec.md), repository agent instructions, and the completed blockers including their handoff comments. Inspect the current implementation before changing it; baseline notes describe the starting point, not a substitute for current code. Claim this ticket before implementation. The user owns functional/manual testing; follow the brief's focused self-review and handoff policy.

## Starting point

Supabase cookie auth and private manual book creation/listing exist. The user reports first-library setup steps 1–5 complete. Account-isolation checks are outstanding. The current list service uses page-based pagination and owner-scoped queries; search/filter contracts and MCP transport do not exist. The initial table grants owner-only SELECT/INSERT; avoid adding write privileges in this slice.

## Implementation decisions

- Extend the shared book read service for optional title/author query, reading status, ownership, and bounded pagination. UI and MCP reuse the rule implementation; use a deterministic order and stable pagination semantics. Define the result/cursor contract clearly for subsequent tickets. Do not load the entire library to filter in the browser.
- Add `search_my_library` using the official MCP TypeScript SDK and stateless Streamable HTTP on the Node.js runtime. Verify current compatible SDK APIs and Next.js Web Request/Response handling from official docs; pin added dependencies.
- Inputs: optional query, one of the four reading statuses, optional owned filter, bounded limit/cursor. Return compact authorized book identities, relevant metadata, versions, pagination, and structured errors. Preserve missing values; owned-only excludes unknown ownership.
- Validate the bearer token independently at the MCP boundary through Supabase, create a per-request user-scoped client, and derive owner identity server-side. Reject missing/expired/invalid tokens without private data. Support SDK-required HTTP methods and Origin handling deliberately. No global authenticated client or user-scoped tool cache.
- Derive the endpoint from trusted application origin configuration. Local HTTP is for development; hosted credentials travel over HTTPS. Do not replace MCP HTTP with direct feature calls. Protocol discovery and calls must be implementable without introducing an agent or paid model dependency.
- Add simple library query/status/ownership controls and useful empty/loading/error states. Introduce only needed shadcn/ui controls, reusing current controls where appropriate and keeping one shared implementation. Preserve the existing manual-add flow and native form behavior.
- Document the transport, input/result contract, chosen SDK versions, and how a client authenticates. Provide concise user handoff instructions rather than creating an automated smoke suite or making live requests.

## Acceptance criteria

- [x] Library query and filters use the shared owner-scoped read service and show bounded, consistently ordered results.
- [x] `search_my_library` is registered and available through real MCP tool discovery/calls, with validated input and structured output.
- [x] MCP checks token identity independently; supplied ownership arguments cannot grant access.
- [x] Empty results are distinguishable from failed reads; credentials and private payloads stay out of logs/activity.
- [x] Existing sign-in, manual add, listing, and pagination behavior remain supported.
- [x] Fresh-session handoff records the contracts needed by book updates and the agent; actual transport/account-isolation verification remains clearly assigned to the user.

## Completion and handoff

Review the actual changes against this ticket and the shared brief. Fix concrete correctness, authorization, persistence, and reuse issues; keep unrelated cleanup out. Run only the applicable lint/type/format checks. Record implemented contracts, migrations and any manual application steps, dependency choices, self-review findings/fixes, exact static-check results, and unverified behavior under Comments. Update relevant docs so the next session can proceed without this chat. Resolve implementation only when its acceptance behavior is implemented; distinguish that from user QA and hosted verification.

## Comments

### 2026-10-04 — Published

Approved by the user as part of five required showcase slices plus one optional catalog slice. Functional testing and browser QA remain with the user.

### 2026-10-04 — Implementation resolved; user QA pending

- Implemented title/individual-author literal substring search, status and known-ownership filters in `listBooks`/`searchMyLibrary`, backed by one user-scoped read RPC. UI retains 25-record numbered pages, notes, manual add/sign-out, native GET submission, shared pending button, retry/setup links, and distinct filtered-empty feedback. Reused existing native controls; no shadcn dependency was necessary.
- Added `supabase/migrations/20261004111404_search_library_books.sql`, generated by the installed CLI. It creates a bounded SECURITY INVOKER function with `auth.uid()` ownership, existing RLS, authenticated-only EXECUTE, and no added table write privileges. **Not applied** to any database. Apply through the linked-project workflow after inspecting the target and dry run; database types were updated to match the declared RPC.
- Added real Node.js `/api/mcp` stateless Streamable HTTP using pinned official `@modelcontextprotocol/sdk` 1.32.0 and existing Zod 4.6.5; npm lockfile updated. The v1 line provides the required Web Request/Response transport and compatible Zod peer range. Checked official SDK/Next/Supabase APIs and relevant Supabase changelog entries before implementation. No Express, agent, model, or billable-resource dependency was added.
- Every public MCP handler validates Host/Origin from trusted APP_BASE_URL, independently calls Supabase `getUser(bearerToken)`, and creates a fresh token-scoped client. No cookie fallback/service-role/cache. POST handles initialization, discovery, and calls; authenticated GET/DELETE/OPTIONS return 405. Missing/invalid credentials return 401, origin failures 403, upstream/configuration failures 503. JSON response mode allows deterministic cleanup after the response is ready. Body cap is 64 KiB; Supabase auth/read requests have 15-second bounds. No credentials or private payloads are logged.
- Strict `search_my_library` input: optional query (trimmed, ≤200), one of four statuses, boolean owned, integer limit 1–50/default 25, opaque cursor. Supplied owner/extra fields fail validation. Summaries include app UUID, title/authors, status/rating/owned/pages, version, and creation time; nulls stay null and notes/owner IDs are omitted. Validated structured success contains books/hasMore/nextCursor; failures use VALIDATION_ERROR or UPSTREAM_UNAVAILABLE with `isError: true`. The low-level official SDK handlers intentionally allow input validation failures to use that same structured result contract.
- Cursor v1 uses exclusive `(created_at, id)` descending order with full timestamp precision and normalized filter binding. Reuse the same filters; changing them requires restarting. Limit may change; inserts do not shift subsequent cursor pages. Concurrent membership edits are not a snapshot. UI offset pages preserve existing semantics. Later book updates must use the returned app ID/version, recheck owner, and preserve notes; this slice adds no write/retry protocol.
- Focused self-review covered authorization/RLS/grants, literal array-author matching, validation/output projection, cursor filter changes/precision, one-row lookahead, unchanged manual creation, native navigation, error recovery, and SDK response lifecycle. Fixed the filter-state TypeScript narrowing error found by the first typecheck; added explicit verified-owner filtering and bounded read cancellation. No speculative refactor or test suite added.
- Final static checks: `npm run lint` passed (zero warnings), `npm run typecheck` passed (`next typegen` + strict `tsc --noEmit`), `npm run format:check` passed. Changed Markdown also formatted/checked with Prettier. The first typecheck failed only on the filter-state type and was corrected before the passing run. npm installation still reported five high-severity advisories; no forced dependency downgrade applied.
- Documentation: [library search/MCP setup and contracts](../../../docs/setup/06-library-search-mcp.md), README, migration/deployment guidance, and verification record updated. APP_BASE_URL now also controls MCP endpoint/Host/Origin; no new env variable. Set the exact local port or hosted HTTPS origin.
- **Unverified and assigned to the user:** applying the migration, actual search/pagination/pending states, sign-in/manual add regression flows, real initialize/list/call and error negotiation, hosted transport/protection, and two-account UI/MCP/direct-database isolation. No tests, builds, browser QA, database query, migration application, live MCP request, paid model call, deployment, or account creation was run. Existing tests were preserved. Use the concise manual steps in the setup guide; implementation resolution does not claim runtime verification.
