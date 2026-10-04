# Reading Companion — MVP Product Requirements

Version: 1.0  
Date: 2026-10-03  
Status: Ready for implementation  
Audience: Implementation agent / developer

## 1. Objective

Build a hosted, authenticated TypeScript web application combining a Reading Librarian and a Next Read Planner. Users import their Goodreads library, manage books and personal reactions, and ask a custom agent to choose their next read and create a simple plan.

The project must demonstrate a real custom agent calling a real custom MCP server. A short deadline makes scope discipline essential. Ship one working vertical slice before adding polish.

This document authorizes implementation of the described MVP. Exact deadline and hosting account credentials have not been supplied. Use the defaults below; document actual setup requirements instead of inventing credentials or claiming deployment succeeded.

## 2. User and value

Primary user: an English-reading frontend engineer who currently tracks books in Obsidian and Goodreads. He values recommendations based on his own reactions, available time, and unread shelf.

Example preferences: slower pacing, character development, and manageable English. These are examples, not universal defaults for every account. Each user must enter their own preferences.

The MVP should reduce manual tracking and make next-read decisions grounded in the user's actual library.

## 3. Scope and priorities

### P0 — required to ship

1. Email/password authentication, sign-out, and account isolation.
2. Goodreads CSV import with preview, explicit import action, and result summary.
3. Library list with search and reading-status filters.
4. Book details with manual editing of status, rating, and personal notes.
5. Custom agent chat that reads library data, performs explicitly requested updates, and recommends up to three unread books.
6. Custom authenticated MCP endpoint that the agent actually invokes over HTTP.
7. Basic reading-plan generation, deterministic validation, and persistence.
8. Visible tool activity and graceful errors.
9. Hosted deployment, database migrations, setup documentation, and meaningful verification.

### P1 — only after P0 works

- Cover images and lightweight Open Library enrichment.
- Improved library sorting and responsive polish.
- Revising an existing plan after the user supplies new time or progress constraints.

### Explicitly excluded

- Obsidian filesystem access or live sync.
- Hardcover integration or synchronization in version one.
- Ongoing Goodreads synchronization; CSV import is a snapshot.
- Full book text, chapter recaps, spoiler-aware discussion, and EPUB uploads.
- Multiple agents, vector databases, embeddings, and semantic RAG.
- Background jobs, notifications, social features, payments, and complex analytics.
- Public registration of arbitrary third-party MCP clients or a complete MCP OAuth authorization server.
- A monorepo, separate backend deployment, and additional agent frameworks.

The MVP demonstrates tool use, planning, persistent memory, and a bounded validation/revision loop. It does not claim to implement every pattern in the competency matrix.

## 4. Technical decisions

| Concern | Decision |
| --- | --- |
| Application | Next.js App Router, TypeScript, single repository |
| Runtime | Supported Node.js runtime for agent and MCP route handlers; not Edge |
| UI | Tailwind CSS; use shadcn/ui selectively |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth, email/password, cookie-based web session |
| Data access | Supabase client and SQL migrations; no additional ORM |
| Agent runtime | OpenAI Agents SDK for TypeScript |
| Model | Configurable server-side model through environment variable |
| MCP implementation | Official MCP TypeScript SDK; Streamable HTTP, stateless request handling |
| Validation | Zod and database constraints |
| CSV parsing | Maintained CSV parser, e.g. Papa Parse; never manual comma splitting |
| Catalog | Open Library behind a small provider interface |
| Hosting target | Vercel for Next.js; Supabase for database and authentication |
| Checks | Vitest plus targeted Playwright verification |

Verify current SDK APIs, compatible versions, Supabase SSR guidance, and host execution limits during implementation. Pin dependencies in a lockfile. Do not guess package import paths from outdated tutorials.

Do not add TanStack Router inside Next.js. Use basic React state and normal server fetching; introduce extra state libraries only for a concrete need.

## 5. Architecture

The browser calls authenticated Next.js handlers for library actions and chat. The chat handler runs the custom agent. The agent discovers and calls book tools through the authenticated `/api/mcp` endpoint. That endpoint calls shared book services, which use Supabase under the authenticated user's identity.

Manual actions and MCP tools share business logic. Ordinary UI actions must not invoke an LLM.

Suggested structure:

```text
src/
  app/
    auth/
    library/
    chat/
    plans/
    api/chat/
    api/mcp/
    api/import/
  agent/
  books/
    services/
    providers/
  db/
  contracts/
  lib/supabase/
supabase/migrations/
tests/
AGENTS.md
README.md
.env.example
```

### Deployment-sensitive requirements

- Complete a deployed MCP initialize → list tools → call tool spike early.
- Do not store MCP sessions, user identity, chat state, or throttling solely in process-global memory.
- Bind every MCP request to its own verified user context. Never reuse one user's authenticated MCP connection for another user's run.
- The agent uses the deployed app's configured MCP URL; do not infer a trusted destination from an arbitrary request Host header.
- Implement stateless Streamable HTTP according to the installed SDK. Close per-request resources correctly; avoid an always-running stdio subprocess in serverless hosting.
- Support the methods and protocol responses required by the chosen transport. If standalone GET streaming is unsupported, return the appropriate protocol response rather than leaving a connection hanging.
- Detect internal endpoint protection or deployment authentication blocking server-to-server requests. Configure an approved solution and smoke-test it; do not silently bypass MCP by calling services directly.
- Keep runs bounded to the configured host duration. A turn limit alone does not guarantee completion before a hosting timeout.

## 6. User flows and screens

### Authentication

- Sign up, sign in, and sign out.
- Handle confirmation-required signup explicitly. Configure production redirect URLs.
- Provide password reset using Supabase's standard flow.
- Redirect unauthenticated users from private pages; all private API endpoints also enforce authentication.

### Library

- Empty state with Import Goodreads CSV and Add Book actions.
- Search title/author; filter by want-to-read, reading, finished, and dropped.
- Display title, author, status, rating, and optional cover.
- Book detail panel/page supports rating, status, personal notes, and optional edition page count.
- Distinguish ownership from want-to-read: a TBR entry does not imply the user owns it.
- Manual book entry must work without an external catalog match.

### Import

- Select a Goodreads CSV and see parsed preview, detected status mapping, warnings, and duplicate count.
- Confirm import; see added/skipped/failed counts and row-level errors.
- Preserve imported books even when enrichment fails.

### Chat

- Show conversation and tool activity such as “Reading your unread shelf” and “Saving your rating.”
- Suggestions: “What should I read next?”, “I finished a book”, “Make a reading plan.”
- Persist a bounded conversation history per user and reload it after refresh.
- Show updates performed by the agent and refresh affected library/plan views.
- Do not show hidden chain-of-thought, credentials, raw access tokens, or full private tool payloads.

### Plans

- Show selected book, start date, target date, remaining pages, daily page target, and assumptions.
- If page count is unknown, request it or return a recommendation without claiming to have calculated a valid schedule.
- Save a plan when the user requests one; merely requesting recommendations does not create a plan.

## 7. Data model

Use UUIDs for app-owned records. Every private table contains `user_id` referencing Supabase Auth. Keep catalog metadata distinct from personal notes and preferences.

### `library_books`

- `id`, `user_id`, `title`, `authors` (text array).
- `status`: `want_to_read | reading | finished | dropped`.
- `rating`: nullable numeric from 0.5 to 5, in 0.5 increments. Unrated is null; Goodreads zero means unrated.
- `owned`: nullable boolean; unknown ownership must remain unknown.
- `notes`: private text; imported review text may seed this field but is labelled as imported.
- `isbn10`, `isbn13`, `goodreads_book_id`: nullable strings.
- `external_ids`: JSON mapping provider to identifiers; no provider identifier is the app primary key.
- `cover_url`, `description`, `page_count`, `language`: optional catalog fields.
- `metadata_source`, `metadata_fetched_at`: provenance for enrichment.
- `started_at`, `finished_at`: nullable dates.
- `imported_shelves`: original shelf names for preservation and troubleshooting.
- `version`: integer for optimistic concurrency; increment on updates.
- `created_at`, `updated_at`.

Use a partial unique constraint on `(user_id, goodreads_book_id)` when the Goodreads ID exists. Treat title/author matches as candidates, not proof that editions are identical.

### `reader_profiles`

- `user_id` unique.
- `preferences`: explicit text entered or confirmed by the user.
- `pages_per_hour`: optional positive number supplied by the user.
- `daily_reading_minutes`: optional positive integer.
- `updated_at`.

Do not silently convert one book reaction into a permanent preference. Previous ratings and notes can still inform a recommendation.

### `reading_plans`

- `id`, `user_id`, `library_book_id`.
- `start_date`, `target_date`, `remaining_pages`, `daily_page_target`.
- `daily_minutes`, `pages_per_hour`: optional inputs.
- `estimated_minutes_per_day`: nullable computed value.
- `assumptions`: text/JSON, `status`: `active | completed | cancelled`.
- `created_at`, `updated_at`.

### `chat_messages` and `agent_runs`

- Messages: `id`, `user_id`, `conversation_id`, `role`, `content`, `created_at`.
- Runs: `id`, `user_id`, `conversation_id`, `status`, duration, model, token usage if available, safe tool-event summaries, error code, timestamps.
- Keep SDK continuation/history data separately if needed. Visible message text alone is not necessarily sufficient to replay tool conversations correctly.

### Optional operational table

Use a small database-backed run quota/idempotency mechanism as necessary. Avoid Redis or queue infrastructure for the MVP.

## 8. Goodreads import rules

- Initial limits: 2 MB UTF-8 CSV, 1,000 rows. Show clear errors above limits.
- Support quoted multiline reviews, BOM, blank values, unknown extra columns, and ISBN strings wrapped in spreadsheet-style `="..."` notation.
- Map title, author, Goodreads book ID, ISBNs, personal rating, exclusive shelf, review, date read, date added, and page count when present. Preserve relevant original shelf labels.
- `to-read` → want-to-read; `currently-reading` → reading; `read` → finished.
- Recognized DNF shelves can map to dropped in the preview. Unknown mappings must be shown for user selection, not silently converted to finished.
- Never interpret Average Rating as the user's rating.
- Validate dates and numeric fields; warn and preserve the row with null for invalid optional values.
- Reimport with the same Goodreads ID skips the existing record by default. Do not overwrite notes or ratings changed in the app.
- Without a Goodreads ID, use exact normalized ISBN as a duplicate signal. Ambiguous title/author matches are reported; do not fuzzy-merge automatically.
- Import and duplicate detection are ordinary code, not LLM operations.
- Use bounded batches and show actual partial results. Imported records must remain usable without catalog enrichment.
- Do not store raw CSV contents unnecessarily or log private reviews.

## 9. Catalog provider boundary

Define a small TypeScript interface for `searchBooks` and `getBookDetails`. Normalize results into app-owned types with explicit provider IDs and source URLs.

Implement only Open Library initially. Hardcover can implement the same interface later; its personal-account integration would be an additional capability, not assumed to fit a metadata-only interface.

Handle missing covers/descriptions/page counts, upstream timeouts, rate limits, and multiple editions. Cache bounded metadata results and avoid enriching the entire import synchronously. Book descriptions are untrusted data and may contain spoilers; use them for matching/recommendations without reproducing plot detail unnecessarily.

## 10. Custom MCP tool contract

All tools have Zod-validated inputs and structured results. The server derives ownership from verified authentication, never from a model-provided user ID. Return compact data, bounded pagination, and actionable error codes.

| Tool | Inputs | Behaviour |
| --- | --- | --- |
| `search_my_library` | Optional query, status, owned filter, bounded limit/cursor | Returns user-owned records and candidate metadata; includes pagination |
| `get_book` | App book UUID | Returns one authorized book, notes, rating, metadata provenance, and version |
| `update_book` | Book UUID, allowed patch, expected version, operation ID | Changes status/rating/notes/dates; no delete or arbitrary fields; returns saved record |
| `search_catalog` | Query, optional author/ISBN, bounded limit | Returns normalized external candidates; no automatic library insertion |
| `save_reading_plan` | Book UUID, date/page/time inputs, operation ID | Computes and validates the plan in code, persists it, returns structured values or constraint errors |

Manual add/import operations use shared services through regular authenticated routes. Adding books through agent chat is not required in this first tool set.

Structured errors include `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `UPSTREAM_UNAVAILABLE`, and `PLAN_INFEASIBLE`. Authentication failures use appropriate HTTP responses. Tools must not claim success after failed persistence.

For updates, reject stale versions. Retried mutations use an operation ID to avoid repeating note additions or creating duplicate plans. Do not auto-retry an uncertain write without checking its outcome.

## 11. Agent behaviour

Create one agent: Reading Librarian and Planner. Its instructions and runtime configuration are authored by this project, not just a generic chatbot prompt.

### Context and memory

- Load the authenticated user's explicit profile into the run context.
- Retrieve books, previous reactions, and ratings through MCP as needed.
- Bound history and tool results; do not stuff the entire vault/library into every prompt.
- Treat current requests as temporary constraints unless the user asks to save a preference.

### Librarian updates

- Resolve the book through tools before updating it.
- If multiple plausible titles match, ask a clarifying question.
- Execute clearly requested updates without an extra generic approval step.
- Preserve existing notes; append reactions by default rather than replacing the entire note.
- Ask about an ambiguous rating scale. Never interpret “8/10” as “8/5”; convert an explicit ten-point rating to four stars. For values outside supported half-star increments, ask instead of silently rounding.
- Do not invent finish dates. “Finished today” uses the user's timezone; “I finished this book” alone can leave the date unset.

### Next-read recommendations

- Default candidate pool: the user's want-to-read books. An owned-only request filters on explicitly known ownership.
- Exclude finished, dropped, and currently-reading books unless the user requests otherwise.
- Return up to three candidates with app book IDs, short reasons, a trade-off, and uncertain/missing information.
- If fewer candidates fit, say so; do not pad the answer with invented or already-finished books.
- External discovery is allowed only when requested, and external candidates are labelled accordingly.
- Never claim authoritative pacing/difficulty scores based on sparse metadata. Distinguish user notes, catalog facts, and model estimates.

### Planning and reflection

- Ask for missing page count or schedule inputs when necessary.
- Compute inclusive calendar days and daily target in code: `ceil(remaining_pages / available_days)`.
- When reading speed and daily minutes are supplied, compare estimated required time with the user's budget.
- If infeasible, suggest a later finish date, more time, or a shorter candidate; don't silently change constraints.
- The agent must use validation feedback to revise inputs or ask the user a question. Cap revision attempts at two.
- Do not pretend that one agent checking its own prose is independent verification. Hard constraints are checked by code.

## 12. Authentication and authorization

- Validate sessions server-side using current Supabase guidance. Do not trust unsigned/decode-only JWT claims.
- Browser session cookies authenticate web routes. Server-side agent requests to MCP carry the user's valid access token over HTTPS.
- `/api/mcp` validates that token and creates a user-scoped context; reject missing, expired, or invalid tokens.
- This is a first-party authenticated MCP integration. Do not claim general MCP OAuth compliance or third-party-client interoperability beyond what is actually implemented.
- Enable RLS on every private table, with ownership checks for SELECT, INSERT, UPDATE, and DELETE where supported. Both USING and WITH CHECK conditions are required where appropriate.
- Use a user-scoped Supabase client for routine operations. A service-role key must not be used to bypass ownership checks in agent tools.
- Enforce ownership on related book/plan records too; a valid plan request cannot reference another user's book.
- Check origin/CSRF as appropriate for cookie-authenticated mutation routes. Handle MCP Origin validation according to SDK/transport guidance.
- Keep model credentials and privileged keys server-side. Publishable Supabase credentials are not a substitute for RLS.

## 13. Streaming, limits, and reliability

- Prefer a fetch-readable SSE response for chat events; no WebSockets required.
- Event contract: `run_started`, `tool_started`, `tool_completed`, `message_delta`, `run_completed`, `run_failed`. Include run IDs and safe summaries.
- The frontend handles disconnects without automatically repeating mutations. Persist final messages/status; show uncertain results honestly.
- Initial caps: input 4,000 characters, 8 model turns per run, 2 plan revisions, 10 agent requests per user per hour, one active run per user.
- Persist quota/concurrency coordination using a small database-backed mechanism with expiry; in-memory limits do not protect across serverless instances.
- Configure upstream timeouts and a total execution deadline below the selected hosting limit. Abort where supported; no indefinite tool loops.
- Retry read-only upstream failures sparingly with backoff. Never repeatedly hammer catalog APIs.
- Track run status, duration, tool names/outcomes, and token usage if supplied. Cost is an estimate only when based on configured pricing.
- Treat imported reviews, catalog descriptions, and notes as data, not instructions. Tool permissions and user isolation remain server-enforced even if a prompt asks otherwise.

## 14. Acceptance criteria

### Functional

- A user can register/sign in, import a valid CSV, refresh, and see persistent books.
- Imported ratings/statuses are accurate; zero ratings are null; reimport doesn't duplicate Goodreads IDs or overwrite edited notes.
- A missing catalog match never drops an imported book.
- Manual status/rating/note edits persist and appear after refresh.
- Agent chat reads the actual library through MCP and updates a uniquely resolved book on explicit request.
- Recommendations contain only eligible library records unless external discovery was requested.
- A saved plan uses deterministic calculations and displays assumptions.
- Tool activity is visible; errors do not appear as successful operations.

### Security and deployed architecture

- Two accounts cannot read/update each other's records through UI routes, chat, MCP, or direct database calls using their user tokens.
- Unauthorized MCP calls fail; authenticated initialize/list/call succeed on the deployed URL.
- Ownership is not accepted as a tool argument; plan foreign references are checked.
- No secrets are included in client bundles or logs.
- Chat, MCP calls, and persistence work on the actual hosted deployment, not just locally.

### Evidence for the learning showcase

- Show authored agent instructions, MCP tool schemas, AGENTS.md, and one SKILL.md.
- Demonstrate a trace with library retrieval, a tool result, and an action or recommendation.
- Demonstrate an infeasible plan rejected by code and a revised suggestion.
- Explain what memory is persisted, how MCP differs from an ordinary function call, and why multiple agents/RAG were deferred.

## 15. Verification and evaluation

Write a few meaningful tests, not snapshots of every component:

- CSV fixtures covering multiline text, missing ISBN, invalid optional fields, unrated values, and duplicate imports.
- Date/page/time calculations including an infeasible plan.
- Integration checks with two users, including cross-user book access and plan references.
- Hosted MCP protocol smoke test: initialize, tool discovery, and one read/write against a test account.
- Browser flow: sign in → import → edit → chat recommendation → save plan → refresh.

Maintain a small agent evaluation set with expected behaviours:

1. “Pick three unread books”: every returned library ID is eligible.
2. “Only books I own”: unknown ownership is not treated as owned.
3. “Finished [ambiguous title]”: asks which book and performs no mutation.
4. “8/10”: saves four stars, not eight.
5. Missing page count: asks rather than inventing it.
6. Impossible time budget: returns alternatives, not a falsely feasible plan.
7. Malicious instruction embedded in a review: does not gain access or change unrelated records.
8. An upstream metadata outage: existing library operations remain usable.

Evaluate deterministic outcomes and factual grounding; do not require exact prose or tool-call ordering. Separate mocked repeatable checks from a small real-model smoke run.

## 16. Implementation sequence

1. Bootstrap Next.js; create Supabase schema/RLS; deploy authentication.
2. Prove the hosted MCP transport and per-request user isolation with one tool before building all agent features.
3. Implement library CRUD, profile preferences, and Goodreads import.
4. Complete shared book services and five MCP tools.
5. Connect one agent, streaming activity, persistent messages, and bounded runs.
6. Add deterministic plan saving and recommendations.
7. Verify two-user isolation and deployed end-to-end flow; finish README and demo instructions.

Do not expand scope to solve a setup issue. If a critical host/SDK compatibility spike fails, document the blocker and propose the smallest viable architecture adjustment before major restructuring.

## 17. Handoff deliverables

- Working source and lockfile; SQL migrations and RLS policies.
- `.env.example` with placeholders only: Supabase URL/publishable key, server-side model key, model name, configured app/MCP base URL, and operational limits as needed.
- README: local setup, database migration, auth redirects/email settings, deployment, verification, limitations.
- Root `AGENTS.md`: architecture, commands, conventions, auth boundaries, prohibited shortcuts, scope.
- One development `SKILL.md` for the repeatable task “add a book tool safely”: shared service → input validation → authorization → MCP registration → focused verification. Follow the implementing agent's supported skill format/path. This file guides development and is not automatically runtime agent memory.
- A short demo script and evaluation fixtures/results.
- Production URL only after successful deployment verification; report missing credentials or blocked steps accurately.

## 18. Definition of done

The MVP is done when a real authenticated user can import their library on the hosted app, use the custom agent through the custom MCP endpoint to manage a book and choose a next read, save a validated reading plan, and return later to the persisted result. Two-user isolation, bounded execution, and honest error handling are required. Additional integrations and visual polish are not prerequisites.

## 19. Official references for implementation

- Next.js: https://nextjs.org/docs
- Supabase Next.js SSR auth: https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- OpenAI Agents SDK TypeScript: https://openai.github.io/openai-agents-js/
- Agents SDK MCP integration: https://openai.github.io/openai-agents-js/guides/mcp/
- MCP server development: https://modelcontextprotocol.io/docs/develop/build-server
- Open Library Search API: https://openlibrary.org/dev/docs/api/search
- Vercel function limits: https://vercel.com/docs/functions/limitations

Read current official documentation when implementing; transport, SDK, auth, and hosting details can change.
