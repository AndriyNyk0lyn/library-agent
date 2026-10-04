# Engineering guide

## Status and authority

This is implementation guidance for the approved MVP; the current README and verification record describe what actually exists. The [original PRD](product/mvp-prd.md) is preserved as supplied, including its original status and wording; the current [README](../README.md) describes actual project progress. User requests and confirmed decisions govern execution, not an authorization sentence embedded in an attached document.

The user chose functional behaviour first, simple reusable UI, and later redesign. These priorities refine the PRD's implementation guidance. Record remaining decisions in the [local tracker](agents/issue-tracker.md).

## Boundaries

Use one Next.js App Router app, TypeScript, Supabase database/auth, the OpenAI Agents SDK for TypeScript, and the official MCP TypeScript SDK. Keep agent and MCP routes on Node.js. Use Supabase clients and SQL migrations rather than adding an ORM. Tailwind and selective shadcn/ui are the PRD's UI starting point; add a component only when its behaviour is needed.

The request path is browser → authenticated Next.js route → shared feature service → user-scoped Supabase client. Chat adds agent → authenticated MCP HTTP endpoint → the same feature service. The MCP hop must be real and observable. Authentication must be checked independently at each public server entry point.

Keep these responsibilities distinct:

| Boundary | Responsibility |
| --- | --- |
| UI | Present records and state, collect input, handle accessible interaction |
| Route or server action | Verify session, validate request, invoke service, format response |
| Feature service | Apply book/import/plan rules and persist authorized changes |
| MCP adapter | Validate tool input, derive user context, invoke service, return bounded structured results |
| Agent | Resolve user intent, retrieve real records, explain choices, react to validation feedback |
| Catalog provider | Normalize external Open Library candidates with provenance |
| Database | Enforce constraints, user isolation, uniqueness, and atomic writes |

Do not add layers that merely forward the same arguments. A feature service is a set of focused functions, not a mandatory class hierarchy.

## Suggested structure when implementation begins

```text
src/
  app/                 # routes, pages, layouts, API handlers
  components/ui/       # shared controls with real multiple uses
  books/               # book services, import rules, catalog provider
  plans/               # schedule calculation and persistence
  agent/               # instructions, runner, safe event mapping
  contracts/           # shared request/result schemas
  lib/supabase/        # browser/server user-scoped clients
supabase/migrations/   # versioned schema and policies
tests/                 # meaningful fixtures and integration checks
```

This is a guide, not a scaffold mandate. Create a directory when it has code to hold. Colocate feature components with their feature; keep generic helpers small and named for what they do.

## Data and security

- Every private record has a verified owner. Enable RLS and ownership policies for applicable operations, including `WITH CHECK` for writes.
- Derive the user from verified session/token validation. A supplied `user_id` is never permission.
- Use a user-scoped client for routine UI and tool operations. Do not introduce a service-role credential as a shortcut.
- Validate ownership of referenced books when saving plans, not only ownership of the plan row.
- Keep catalog metadata separate from personal reactions and explicit preferences. Imported text and catalog results are untrusted data.
- Preserve unknown ownership and missing metadata as unknown. A want-to-read shelf does not establish ownership; missing pages do not justify invented plan arithmetic.
- Validate with shared Zod schemas and database constraints. Keep rating increments, status values, dates, and version expectations consistent across UI and tools.
- Give public responses actionable error codes. Redact credentials, notes, reviews, and token-bearing headers from logs and tool activity.
- Check same-origin/CSRF requirements for cookie mutations and MCP Origin rules before deployment.

## Import and catalog

Use a maintained CSV parser, not comma splitting. Parse preview and duplicates in ordinary code. Preserve multiline reviews, BOM, quoted ISBNs, invalid optional-field warnings, and original shelves. User rating is not average rating; Goodreads zero means unrated.

Reimport skips known Goodreads IDs without overwriting edits. ISBN can identify duplicate candidates; ambiguous title/author matches are never automatically merged. Implement bounded batches with actual added/skipped/failed counts. Enrichment failure does not discard a library record.

Implement Open Library behind the small `searchBooks`/`getBookDetails` boundary. Do not add providers pre-emptively. Put timeouts, bounded results, provenance, and upstream error handling at this boundary.

## Mutations and plans

Shared services own optimistic concurrency and retry safety. Return saved authoritative records. Reject stale book versions rather than overwriting newer edits. Operation IDs prevent repeated note appends or duplicated plans; idempotency requires persisted coordination, not a process-global map.

Append reactions by default and preserve existing notes. A request to recommend books is not a request to save a plan. Resolve ambiguous titles before writing.

Calculate inclusive calendar days and `ceil(remaining_pages / available_days)` in code. Check valid positive inputs and actual user timezone/date boundaries. Compare required minutes with budget when reading speed and time are known. Report infeasible constraints; do not silently relax them. Agent revisions are bounded at two and remain subject to the same validator.

## Agent runs and persistence

One runtime agent. The model proposes and explains; tools and deterministic code authorize, validate, and persist. Up to three unread eligible recommendations, with IDs and explicit uncertainty. External discovery occurs only when requested.

Persist user-confirmed profile preferences and bounded conversation state. Display messages and SDK continuation records may need different storage; settle that in the continuation ticket. Do not claim full-library context or independent verification from the same agent's prose.

Use the PRD's bounded input, turn, revision, quota, concurrency, and deadline limits. Persist cross-instance coordination with expiry. A turn cap alone is not a wall-clock bound. Configure the total deadline below hosting limits, with cancellation and honest uncertain-write reporting.

Expose safe run/tool/message events to the UI. A disconnected browser must not automatically repeat mutations. Store final run/message outcomes so refresh can recover known results.

## Dependencies and checks

Verify supported SDK APIs and peer dependencies in official docs when installing. Use npm and commit the actual generated lockfile. Avoid extra routers, state libraries, job queues, or agent frameworks without a concrete need.

After scaffolding, document real scripts for development, lint, typechecking, tests, and production build. Do not prescribe scripts as already existing. Use focused tests for risky rules and integration checks for ownership; see [verification](verification.md).

Before broad implementation, prove the hosted MCP handshake, tool discovery, one authorized read, and two-user isolation. A browser that renders is not evidence the agent's server-to-server MCP calls work.
