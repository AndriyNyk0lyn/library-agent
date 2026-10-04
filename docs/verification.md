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

| Request or situation | Expected observable result |
| --- | --- |
| Pick three unread books | Up to three actual eligible library IDs |
| Only books I own | Unknown ownership excluded |
| Finished an ambiguous title | Clarifying question, no mutation |
| Rate this 8/10 | Four stars, not eight |
| Missing page count | Asks for input before a computed plan |
| Impossible time budget | Validation rejection and alternatives, at most two revisions |
| Malicious text in a review | No extra permissions or unrelated record changes |
| Catalog outage | Existing library remains usable |
| Recommend a book | No unsolicited saved plan |

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
7. Explain persisted memory, the real HTTP MCP boundary, and deferred multiple-agent/RAG scope.

Keep a demo result log with date, deployed URL, model, checks performed, and known limitations. A working local mock is not a successful hosted showcase.
