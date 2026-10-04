# Showcase MVP implementation brief

Approved 2026-10-04. This is the shared context for eight implementation tickets, not an authorization to provision services. Read it at the start of every ticket session.

## Goal and current baseline

Build a hosted Reading Companion that imports a personal library, manages reading reactions, recommends up to three unread books through one custom agent, and saves realistically validated plans. Showcase real MCP HTTP tool use, durable memory, planning, and revision after code validation feedback.

The initial code contains Next.js/TypeScript, Supabase cookie auth, signup/confirmation/recovery/sign-in/out, and owner-only manual book creation/listing. The initial library table contains UUID/owner, title/authors, status, nullable rating/owned/pages, notes, version, and creation timestamp; only SELECT and INSERT are granted. Agent/MCP, edits/import, profiles/chat/plans, and hosting are not implemented at publication.

The user reports completing first-library guide steps 1–5, including migration, auth, and saving/reloading a book. Step 6 real account isolation remains outstanding. Earlier automated/static results describe that earlier implementation only. Treat hosted readiness as user-reported, not newly verified by the ticket author. Inspect current code and completed handoffs because later sessions will change this baseline.

## Required context

Before implementing, read [AGENTS.md](../../AGENTS.md) (also canonical for Claude), [README](../../README.md), [domain glossary](../../CONTEXT.md), [engineering](../../docs/engineering.md), and [style guide](../../docs/style-guide.md). Read relevant sections of the [original PRD](../../docs/product/mvp-prd.md), any current root ADRs, and the selected ticket's completed blockers. [Agent/hosting research](../../docs/research/agent-hosting.md) explains earlier rationale; recheck official SDK documentation before adopting API names or versions. [Tracker conventions](../../docs/agents/issue-tracker.md) explain local status/triage.

Current user decisions in this brief override earlier recommendations to run tests/browser QA, provision SMTP, perform an early hosted testing spike, or require catalog lookup for shipping. The original PRD remains preserved input. Old preparation decision tickets are historical context, not extra blockers on this approved implementation chain. Do not modify/close those parent issues as part of this plan.

## Architecture and contracts

One Next.js app on Node 24; Supabase database/auth; OpenAI Agents SDK for TypeScript; official MCP TypeScript SDK, stateless Streamable HTTP. Keep business rules in direct shared feature services called by UI and MCP adapters. CRUD, import, duplicate handling, and plan calculations use ordinary code. Agent-to-tool calls cross real HTTP; do not substitute direct calls. Verify current SDK interfaces, pin new dependencies, and preserve the npm lockfile.

Private records and related references are authorized through server-verified identity and user-scoped access plus RLS. Never accept a model/browser owner as permission or use a service-role key to bypass it. Add migrations as features need them, with reviewed database types and explicit operation grants/policies. Keep stale-write checking and mutation retry coordination atomic/durable. Retried operation IDs recover the same authorized outcome; changed payloads conflict.

Reading status is want_to_read, reading, finished, or dropped. Rating is null or 0.5–5 in half-star steps. Ownership is true/false/unknown; TBR does not imply owned. Missing pages/preferences/reading speed remain missing. Preserve personal notes; tool reactions append unless replacement is explicitly requested. Return validated bounded results and actionable errors such as NOT_FOUND, VALIDATION_ERROR, CONFLICT, UPSTREAM_UNAVAILABLE, PLAN_INFEASIBLE; authorization failures use suitable HTTP status.

Required tools across the chain: search_my_library, get_book, update_book, get_reader_profile, update_reader_profile, save_reading_plan, list_reading_plans. Optional search_catalog arrives only in ticket 06. Additional tools must serve a concrete approved interaction, such as calculating an unsaved plan, rather than speculative surface expansion.

## UI decisions

Use selective shadcn/ui controls for the general app and assistant-ui with a custom/external-store runtime adapter for chat. The application owns Supabase persistence and the OpenAI Agents SDK runner; the chat library renders that contract. Avoid adding a second agent framework or hosted chat service. Add needed controls within feature slices, keep one reusable implementation, preserve existing form behavior, and use simple accessible layouts. Visual redesign is later.

Reference: [shadcn Next.js](https://ui.shadcn.com/docs/installation/next), [assistant-ui custom runtime](https://www.assistant-ui.com/docs/runtimes/custom/external-store). Verify installed versions/adapters during implementation, rather than assuming this publication freezes third-party APIs.

## Session workflow and review boundary

1. Read required context and completed blocker handoffs; claim the selected ticket with a session assignee. Work the frontier: a ready triage label does not satisfy unfinished blockers.
2. Implement the whole requested behavior, including persistence, errors, migrations, accessible states, and documentation. Make routine bounded choices autonomously; record durable decisions where they affect later tickets. Keep unrelated cleanup out.
3. Perform a focused code self-review of the actual changes: input/results, server-derived ownership and related references, atomic concurrency/retries, real persistence, UI error/recovery, secrets, and reuse. Fix findings supported by evidence; do not inflate speculative risks or add unnecessary abstraction.
4. Run applicable existing lint/typecheck/format checks, reading actual scripts. The user explicitly owns functional testing. Do not add/run automated tests, browser automation, manual browser QA, live paid-model requests, or transport/account-isolation test suites for these tickets. Build execution is also left to the user unless separately requested. Existing tests stay intact; this scope decision is not permission to weaken checks or fabricate passing results.
5. Append a concise handoff comment: behavior/contracts changed, migration names and application needs, static results, self-review findings/fixes, relevant configuration, and unverified functionality. Give the user brief manual next actions only when needed. Mark implementation resolved once complete; never label runtime/deployed functionality verified without actual user evidence.

Implementing code and writing setup instructions are authorized by the selected ticket. Creating accounts, deployments, public remotes, billable resources, applying remote migrations, or making paid requests require appropriate existing user authorization; this brief alone does not authorize them. Keep secrets in ignored local/server configuration, never ticket comments.

## Scope limits

One Supabase project, default sender with eligible organization email, one hosted app and provider domain. No custom SMTP, staging setup, queues, monitoring services, CI pipelines, or speculative infrastructure. No Obsidian/Hardcover sync, multiple runtime agents, embeddings, full-book analysis, social features, payments, or design overhaul. Catalog discovery is explicitly optional in this approved plan.

Required showcase implementation is tickets 01–04, then [Refactor 01](../chat-history-maintainability/issues/01-agent-mcp-refactor.md), [History 02](../chat-history-maintainability/issues/02-chat-history.md), and showcase 05. The follow-up scopes/order were approved 2026-10-04. Refactor 01 requires an independent development review subagent and resolution of concrete regression findings. History 02 adds separate browsable conversations with conversation-scoped bounded continuation; profiles and quotas remain reader-wide. This reviewer is a development task, not an additional application agent. Existing ticket IDs and completed handoffs remain stable. Runtime QA and real two-account UI/MCP/database isolation remain the user's responsibility before claiming a verified showcase. Code self-review/static checks alone do not establish those claims.
