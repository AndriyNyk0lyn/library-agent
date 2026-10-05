# Verification and showcase

## Current evidence

Scaffold verified locally on 2026-10-03 with Node 24.13.0, Next.js 16.3.8, React 19.3.0, TypeScript 5.9.3, and Tailwind 4.3.3:

- `npm run lint`: passed with zero warnings.
- `npm run typecheck`: passed with strict TypeScript.
- `npm run build`: passed; root, library, setup, and missing-page routes generated.
- `npm run start -- --hostname 127.0.0.1 --port 3000`: production server started successfully.
- In-app browser: root redirected to library; setup link and return navigation worked; keyboard Tab moved focus between navigation links; missing-page route rendered the recovery link. Desktop layout inspected. Mobile viewport and full accessibility audit have not been performed.
- React review: only navigation is a client component; pages remain server components, with no duplicated state, effects, fake records, or speculative abstractions.

Dependency limitation: `npm audit` reports five high-severity entries in the development-only lint chain (`eslint-config-next` → Next ESLint plugin → `fast-glob` → `micromatch` → `braces`). The reported [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) affects the latest available braces version 3.0.3; no compatible patch was available at verification. npm suggests downgrading Next lint configuration to 14, which would misalign it with this Next 16 app. ESLint 9 also emits an end-of-support warning during installation. Revisit the lint dependency chain before release; no forced downgrade or suppression applied.

These initial scaffold checks did not prove persistence or authorization. See the Supabase integration evidence below for subsequent work.

## Supabase integration evidence — 2026-10-03

- Installed pinned `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.117.2, and Supabase CLI 2.119.0.
- Read-only request to the configured hosted Auth settings endpoint: HTTP 200, email provider enabled, email confirmation required. Only status/boolean results were printed; no credentials or account details were logged.
- `npm run lint`, `npm run typecheck`, `npm run format:check`, and `npm run build`: passed.
- `npm run test`: 21 tests passed across four files. These cover book validation, owner derivation and creation retries using mocked HTTP, cookie/cache-header propagation, and the actual migration on embedded PostgreSQL (PGlite 0.5.8).
- PostgreSQL tests verified owner-only reads, foreign-owner insert rejection, anonymous and missing-subject denial, rejected update/delete/system-field overrides, primary-key duplicate rejection, and invalid rating/page/title constraints. Supabase's auth schema/UID function are minimal test stand-ins; this does not validate hosted JWT verification or PostgREST.
- Browser: signed-out library and book-entry routes redirected to sign-in. Auth screens rendered with labelled inputs and the shared layout; finished production build styling inspected on port 3001. No account was created and no email was sent.
- Full Docker Supabase stack was not started: Docker daemon was not running. No hosted migration, email template change, SMTP change, privileged token, or database password was used.

Remaining: user must finish the [email templates and migration setup](setup/05-first-library.md), then verify confirmation, sign-in, save/refresh, sign-out, recovery, and two real accounts. Imports, edits, MCP, and plans are subsequent implementation steps. The development lint dependency advisories remain as documented above.

## Library search / MCP implementation — 2026-10-04

Showcase ticket 01 is implementation-resolved; user runtime QA remains pending. Added shared owner-scoped title/author/status/ownership search, numbered UI pages, cursor-based MCP results, bearer-token verification, and stateless JSON Streamable HTTP. See [setup and contracts](setup/06-library-search-mcp.md).

- `npm run lint`: passed, zero warnings.
- `npm run typecheck`: passed after correcting an initial filter-state narrowing error.
- `npm run format:check`: passed. Changed Markdown also passed targeted Prettier checks.
- Focused code self-review covered auth/RLS/read grants, filter/input/output contracts, cursor semantics, native form/error feedback, and transport cleanup; an explicit owner filter and read timeout were added.
- Pinned official MCP SDK 1.32.0, preserving Zod 4.6.5 and the generated npm lockfile. Installation reported five high-severity advisories; no forced dependency downgrade was attempted.
- Search migration `20261004111404_search_library_books.sql` is authored, **not applied**. It adds only an authenticated read RPC, preserving existing RLS and table write grants.

Per the [approved showcase brief](../.scratch/showcase-mvp/spec.md), no tests/build/browser QA, database queries, live transport calls, or account-isolation checks were performed. Existing tests remain intact. Actual SQL/RPC execution, UI search/pagination/manual-add regression, MCP initialize/list/call/error behavior, token expiry handling, two-user isolation, and hosted protection remain for the user. Static checks and self-review do not establish runtime or hosted readiness. No service/account/deployment was provisioned.

## Import / library management implementation — 2026-10-04

Showcase ticket 02 implements Goodreads preview/confirmed import, book details/manual edits, and `get_book`/`update_book` through the existing MCP transport. See [migration, contracts, and manual handoff](setup/07-import-library-management.md).

- `npm run lint`: passed, zero warnings.
- `npm run typecheck`: passed after correcting a missing required heading prop on the first run.
- `npm run format:check`: passed; changed Markdown also received targeted Prettier checks.
- Pinned `csv-parse` 7.0.3 after checking official sync API/options; npm installation reported the existing five high-severity advisories. No forced dependency changes.
- Authored **unapplied** migration `20261004114040_library_management_import.sql`: import provenance/date fields, Goodreads uniqueness and ISBN indexes, owner UPDATE policy/grants, version trigger, private durable operation storage, atomic update RPC, and owner-scoped bounded import RPC.
- Focused self-review covered owner derivation, function privileges, private operation integrity, version/append retry atomicity, server-side confirmation, duplicate and ambiguity rules, nullable values/provenance, input retention, partial results, and response validation. Fixed the writable-operation-storage design before completion, server-side intra-CSV ambiguity selection, stale-save/result remount, calendar-date validation, and separate uncertain-batch accounting.

No tests were added/run, and existing tests were preserved. No build, browser QA, functional test, database/advisor query, migration application, live MCP/model call, account-isolation check, or deployment was performed, per the approved brief. The Supabase CLI only created a local empty migration; its first sandboxed invocation could not write its telemetry file, so the successful help/create commands used approved filesystem escalation. Static checks and SQL self-review do not prove execution, persistence, or isolation. User verification is required after applying the migration.

## First slice candidate

The [first-slice decision](../.scratch/reading-companion/issues/03-first-slice.md) remains open. A recommended checklist is:

1. Sign in with a test user and persist one library book through an ordinary UI operation.
2. Refresh and retrieve the same record from Supabase.
3. On the hosted URL, perform MCP initialize, tool discovery, and one library read using a valid user token.
4. Repeat with a second account; direct database requests and routes must reject access to the first user's book.
5. Missing/expired tokens fail clearly and no credential appears in client bundles or logs.

This proves persistence, authorization, and the deployment-sensitive transport before broad agent features.

## Meaningful automated checks

- CSV fixtures: multiline reviews, BOM, quoted ISBNs, missing fields, unknown shelves, invalid optional values, unrated values, duplicate reimport, and preserved edited notes.
- Plan arithmetic: inclusive dates, timezone boundaries, remaining pages, half/missing/invalid inputs, and infeasible time budgets.
- Mutations: stale versions and repeated operation IDs do not silently overwrite or duplicate changes.
- Two-user integration: search, read, update, and plan foreign references enforce ownership through UI routes, MCP, and user-scoped database access.
- MCP protocol: initialize/list/call on the deployed endpoint, including auth failures and a controlled write to a disposable test record.
- Run handling: deadline, quota, cancellation, and disconnect behaviour do not falsely report success or repeat uncertain writes.

Use Vitest for focused deterministic rules and targeted browser checks for complete flows when app code exists. Do not snapshot every component or test trivial wrappers. Separate mocked tests from real service/model runs.

## Agent evaluation cases

| Request or situation        | Expected observable result                                   |
| --------------------------- | ------------------------------------------------------------ |
| Pick three unread books     | Up to three actual eligible library IDs                      |
| Only books I own            | Unknown ownership excluded                                   |
| Finished an ambiguous title | Clarifying question, no mutation                             |
| Rate this 8/10              | Four stars, not eight                                        |
| Missing page count          | Asks for input before a computed plan                        |
| Impossible time budget      | Validation rejection and alternatives, at most two revisions |
| Malicious text in a review  | No extra permissions or unrelated record changes             |
| Catalog outage              | Existing library remains usable                              |
| Recommend a book            | No unsolicited saved plan                                    |

Evaluate deterministic outcomes and grounding, not exact prose or fixed tool-call ordering. Use a small explicitly authorized real-model smoke run rather than an unbounded evaluation suite.

## End-to-end MVP checks

Sign up/confirm/sign in → import preview → confirm import → search/filter → edit rating/status/notes → refresh → chat recommendation using real MCP → reject an infeasible plan → revise inputs → save valid plan → refresh. Verify sign-out and password reset as well.

Use disposable data and two accounts. Do not use personal Goodreads reviews in test fixtures or publish them in traces. Respect any user instruction reserving browser or build checks for manual testing.

## Showcase script after implementation

1. Explain the actual architecture and demonstrate a persisted library after refresh.
2. Ask for next-read suggestions and show safe MCP tool activity plus the grounded IDs.
3. Request a clear book update and demonstrate the saved record.
4. Request an impossible plan; show deterministic validation feedback and a bounded revision.
5. Save a feasible plan and reopen it after refresh.
6. Show authored agent instructions, tool schemas, project instructions, and a development skill.
7. Create separate chats, reopen stable links and load older display messages. Explain the latest-five-exchange context and 30-day retention, then shared preferences.
8. Explain persisted memory, the real HTTP MCP boundary, and deferred multiple-agent/RAG scope.

Keep a demo result log with date, deployed URL, model, checks performed, and known limitations. A working local mock is not a successful hosted showcase.

## Agent chat / persistent memory implementation — 2026-10-04

Showcase ticket 03 is implementation-resolved; user runtime QA remains pending. Added one Agents SDK librarian, authenticated MCP HTTP runs, explicit profile memory/editor/tools, grounded recommendation cards, separate bounded SDK continuation, assistant-ui external-store chat and durable quota/lease/recovery. See [setup and contracts](setup/08-agent-chat-memory.md).

- Final `npm run lint`, `npm run typecheck`, and `npm run format:check` passed. Changed Markdown formatting/checks passed. Initial typecheck errors in adapter/narrowing were fixed. Existing tests were preserved; none were added/run.
- Reviewed verified identity, scoped RPCs/grants/RLS, immutable profile operations, advisory quota/admission locks, hashed server-only lease capability, expiry handling, whole SDK call/result retention, failed-turn uncertainty context, recommendation eligibility via real MCP, cancellation/uncertain writes, UI input/recovery, tracing and credential boundaries.
- New local migration `20261004135442_agent_chat_memory.sql` has **not** been applied. CLI help/new used approved filesystem access for local telemetry; no remote schema was modified. npm installed pinned SDK/UI dependencies and still reported five high-severity advisories.
- No functional tests, database/advisor queries, builds, browser QA, live MCP handshake, paid model request, account/resource provisioning or deployment occurred. Static checks do not establish runtime compatibility, persistence, run-limit enforcement or two-user isolation. The user must verify these after migration/configuration; paid requests and hosting duration/protection checks remain explicit manual actions.

## Recommendation run failure follow-up — 2026-10-04

User screenshot/access logs show successful MCP reads, then generic failure after 21.8 seconds with stale progress UI. Eight agent reads plus a profile prefetch are consistent with exhausting the eight-model-turn cap before final output; the original unlogged exception is not independently confirmed. Reserved the last model call for an answer (tools disabled), removed redundant profile-reading instructions, added specific SDK failure codes/bounded diagnostics and authoritative failure-state delivery with UI recovery. Existing caps and no-write-replay remain.

`npm run typecheck`, `npm run lint`, `npm run format:check` and targeted changed-Markdown formatting passed. No functional reproduction, paid request, database query, browser QA, automated test or build was run. The user must retry the same request after reloading saved status; no new migration is needed.

## Recommendation validation and activity follow-up — 2026-10-04

The user supplied `INVALID_RECOMMENDATIONS` with a failed final book read. The broad original code confirms final validation failure but cannot establish whether the book was missing, unavailable or ineligible. Reviewed the UUID selection vulnerability and replaced model selections with current-run references mapped to real IDs returned by authenticated MCP. Final eligibility still re-reads raw book results over HTTP; model-facing annotations do not enter authoritative parsing. Added distinct safe validation errors, grouped counted activity and accurate attempted-write warnings, without a migration or dependency change. User must retry the original request; runtime/model behavior remains unverified.

Static checks passed: `npm run typecheck`, `npm run lint` (zero warnings), `npm run format:check`, and targeted changed-Markdown formatting. No automated tests, build, browser QA, database queries or live MCP/model requests were performed. Existing tests were preserved. No migration is needed for this follow-up.

## Reading-plans implementation — 2026-10-04

Showcase ticket 04 is implementation-resolved. Added deterministic preview/saving/listing, related-book ownership enforcement, durable versioned retries, three authenticated MCP tools, bounded validation revisions and persisted structured chat plan results. See [setup/contracts and manual checks](setup/09-reading-plans.md).

- `npm run lint` passed with zero warnings, `npm run typecheck` passed, `npm run format:check` passed, and `git diff --check` passed. Changed Markdown also passed targeted Prettier checks. Initial JSX/type narrowing errors were corrected.
- Focused self-review covered owner derivation, composite related-owner FK/RLS/grants, immutable ledger/locks/version checks, midnight recovery, inclusive dates/progress/feasibility, strict authoritative outputs, observed HTTP cards, revision caps, safe activity/continuation, and retained uncertain input. Fixed pending-edit/submitted-value mismatch by disabling fields during submission; authoritative optional output fields are required rather than defaulted.
- Local migration `20261004154621_reading_plans.sql` is **unapplied**. It adds plans and extends chat storage/finalization with `p_plans`. No dependency or environment changes; CLI only created the local migration and wrote its local telemetry under approved filesystem escalation.
- No automated/functional tests, build, browser QA, database/advisor query, live MCP/model request, migration application, account/resource creation or deployment. Existing tests were preserved. Static checks and self-review do not establish runtime persistence, model intent/agreement compliance, two-revision behavior or real-account isolation. User verification remains required before a showcase.

## Separate chat history implementation — 2026-10-04

[History 02](../.scratch/chat-history-maintainability/issues/02-chat-history.md) is implementation-resolved: durable conversations/legacy backfill, stable links, bounded pagination, separate continuation and preserved reader-wide limits, tab drafts and GET-only recovery. See [migration/contracts and manual checks](setup/10-chat-history.md). Lint, typecheck, formatting, targeted Markdown formatting and diff whitespace checks passed. The new chat-conversations migration is **unapplied**. Existing tests are unchanged; no tests, builds, browser/functional QA, database queries, remote migration or paid-model requests were performed. Runtime behavior and isolation remain unverified.

## 2026-10-05 — Optional Open Library implementation

Ticket 06 adds disabled-by-default Open Library search, authenticated `search_catalog`, deliberate edition review/addition through the existing create-book service and separate insert-only provenance. Migration `20261005060400_optional_open_library.sql` is authored, not applied. See [setup/contracts and manual checks](setup/11-open-library.md). Static checks and self-review are recorded in the ticket; these do not establish provider/runtime behavior, persistence, model adherence, transport or reader isolation. No functional tests, builds, browser QA, database/advisor queries, migration application or live MCP/model calls were performed. Existing tests remain intact.

## Expanded agent/MCP tools — 2026-10-05

Catalog edition/add tools, expanded reader-field patches, atomic bulk updates, external recommendation cards and optional cited internet search are implemented. New local migration: `20261005064304_agent_tool_expansion.sql`, after optional catalog provenance. See [setup and remaining manual checks](setup/12-expanded-agent-tools.md). Static results are recorded in the [ticket](../.scratch/agent-tools/issues/01-expanded-tools.md); no SQL execution, real MCP/model behavior, functional tests, build, browser QA or account isolation was verified.
