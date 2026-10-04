# 01 — Refactor agent and MCP for maintainability

**What to build:** Make the existing agent and MCP implementation easy to read, navigate and maintain while preserving the working library, profile, recommendation, plan and chat contracts. Finish with an independent regression-focused code review before the chat-history feature begins.

**Blocked by:** [Showcase 04 — Reading plans and validation-driven revision](../../showcase-mvp/issues/04-reading-plans.md), implementation resolved. Can start immediately after reading its handoff.

**Status:** open

**Triage:** ready-for-agent

**Assignee:** unclaimed

## Start a fresh session

Read the [shared implementation brief](../../showcase-mvp/spec.md), root agent instructions, README, domain glossary, engineering and style guidance, and completed showcase tickets 01–04 with their handoffs. Read the [agent/chat contracts](../../../docs/setup/08-agent-chat-memory.md), [plan contracts](../../../docs/setup/09-reading-plans.md) and relevant current ADRs. Inspect actual code and migrations; completed implementation does not mean runtime behavior or account isolation has been verified. Claim this ticket before editing.

## Current baseline

One custom OpenAI Agents SDK agent calls a stateless authenticated MCP endpoint over real HTTP. UI and MCP share library/profile/plan feature services. Chat uses assistant-ui's external-store adapter and Supabase-owned display runs and separate bounded SDK continuation. The runner handles admission-related execution, MCP lifecycle, activity, authoritative recommendation/plan results, continuation persistence and failure cleanup. The MCP server registers eight tools: search_my_library, get_book, update_book, get_reader_profile, update_reader_profile, calculate_reading_plan, save_reading_plan and list_reading_plans. The chat UI also coordinates streaming, composer state and recovery. Existing focused helper modules already exist; reuse them rather than recreating them.

## Implementation decisions

- First record a concise before-change inventory of public HTTP/tool schemas and errors, database/RPC contracts, run lifecycle and cancellation, resource cleanup, quota/lease limits, continuation bounds and UI recovery. Establish a Git baseline/diff when available; do not commit or discard unrelated work. Use this inventory to assess behavior preservation, rather than trusting a reorganized file tree.
- Refactor by responsibility where the actual implementation benefits: agent instructions/configuration, run orchestration, MCP connection/activity adaptation, validated result handling, persistence/continuation, and UI stream/recovery. Keep small cohesive functions and explicit types. Thin route handlers and a readable top-level runner should reveal the request lifecycle.
- Keep MCP transport/authentication distinct from tool registration and domain services. Group registrations by existing library/profile/plan responsibilities only when that improves navigation. Share actual repeated input/result/error behavior without building a generic tool framework, repository layer, dependency-injection system or forwarding-only wrappers.
- Preserve public tool names and schemas, structured errors, server-derived identity, RLS, owner checks, operation IDs and stale-write safety. Preserve real authenticated HTTP; never replace it with direct service calls. Preserve deterministic plan validation and explicit-save semantics, grounded recommendation IDs, safe activity, disabled sensitive tracing and untrusted-text boundaries.
- Preserve per-reader quota/concurrency, admission and finalization capabilities, deadlines, abort propagation and MCP cleanup on success/failure. Preserve whole SDK call/result exchanges, failed/interrupted uncertainty, durable final state, and GET-only recovery without automatic mutation replay. No dependency upgrades, schema redesign, conversation feature or visual redesign as part of this refactor.
- Document the resulting code navigation and extension points in existing engineering/setup documentation. Explain responsibility ownership and why any extracted module exists. Avoid arbitrary file-size targets or splitting merely to produce more files.

## Independent review requirement

After self-review and applicable lint/type/format checks, use a separate review subagent. This development reviewer is explicitly authorized by the user and does not introduce multiple runtime agents. Give it the baseline inventory, full change diff, ticket scope and relevant contracts. Ask it to inspect actual changed code and callers independently for correctness, security, maintainability and regressions, especially terminal paths, cleanup, retry/concurrency, validation and UI recovery. It must identify concrete evidence and severity, not speculative abstraction demands or blanket approval.

Fix justified findings and have the reviewer recheck affected changes. Record findings, fixes and reasoned dispositions for rejected feedback. Do not mark this ticket resolved with unresolved concrete regression findings. If independent review cannot run, report the limitation and leave that acceptance item incomplete; self-review is not independent review. No browser QA, automated tests, builds, remote migrations or paid requests are added to this ticket. Static review cannot guarantee absence of runtime regressions.

## Acceptance criteria

- [ ] Actual duplication and mixed responsibilities are reduced with clear domain names and discoverable modules; no speculative framework or forwarding-only layer is introduced.
- [ ] Before/after contract inventory demonstrates preserved public interfaces and behavior, including tool authorization, mutations, plans, bounded continuation, run recovery and cleanup.
- [ ] Existing callers use the resulting modules consistently; obsolete implementations are removed without unrelated cleanup.
- [ ] Existing documentation explains where to change instructions, add tools, manage persistence, map results and handle streaming/recovery.
- [ ] Focused self-review and applicable lint/type/format checks are complete, with exact outcomes recorded.
- [ ] An independent review subagent has reviewed the full refactor; justified findings are fixed and affected changes re-reviewed, with no unresolved concrete regression findings.

## Completion and handoff

Append a dated handoff covering baseline/diff reference, responsibility changes, preserved contracts, exact static checks, independent review findings/dispositions/recheck and unverified runtime behavior. Give the next ticket a concise navigation map. Preserve existing tests; do not run or add them. Mark implementation resolved only after the acceptance criteria are complete.

## Comments

- 2026-10-04: Scope and order approved by the user. This is the next required frontier, before chat history and hosted showcase.
