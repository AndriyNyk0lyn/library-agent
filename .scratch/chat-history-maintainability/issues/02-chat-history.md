# 02 — Chat history and separate conversations

**What to build:** Let the reader start separate chats, browse saved conversations, reopen one through a stable link, load older messages and continue that conversation without mixing its model context or replaying previous actions.

**Blocked by:** [01 — Refactor agent and MCP for maintainability](01-agent-mcp-refactor.md), including its independent review and handoff.

**Status:** open

**Triage:** ready-for-agent

**Assignee:** unclaimed

## Start a fresh session

Read the [shared implementation brief](../../showcase-mvp/spec.md), root agent instructions, README, domain glossary, engineering/style guidance and the completed blocker handoff. Read showcase tickets 03–04, [agent/chat contracts](../../../docs/setup/08-agent-chat-memory.md), [plan contracts](../../../docs/setup/09-reading-plans.md) and relevant current ADRs. Inspect the refactored code and actual schema before choosing module locations. Claim this ticket before implementation.

## Current baseline

Chat currently persists one conversation per reader through private run records. The snapshot exposes the newest 20 runs, while model continuation uses at most five terminal exchanges and a 512 KiB total bound, dropping whole exchanges. Run records have 30-day lazy owner-scoped retention. Display messages, safe tool activity, recommendation cards and plan results are separate from private SDK history. Per-reader admission allows one active run and ten runs/hour, with lease expiry and server-capability finalization. Profile preferences persist independently. This ticket expands history navigation, not model memory to every past message.

## Implementation decisions

- Add durable owner-scoped conversation identity, creation/activity timestamps and a simple bounded display title derived in ordinary code from the first message. No model calls for titles. Associate each run with one conversation and backfill retained legacy runs into one existing conversation per reader. Preserve run IDs, status, display results, activity, operation safety and retained SDK history; migrations must not discard existing records or rewrite already-applied migrations.
- Provide an accessible conversation list ordered by recent activity, New chat, selected-chat state and stable internal conversation links. Reopen a saved chat after refresh or a new session. Persist new conversation creation with retry-safe identity; an uncertain creation must not silently create duplicates. Do not add rename, delete, export, search or archive features for this slice.
- Paginate both conversation lists and older display runs with bounded stable cursors and deterministic ordering. Prepending older messages must retain current conversation, drafts and known active state without duplicates or replacing newly streamed results. Show loading, empty, end-of-history, unavailable and retry states. Missing or unauthorized conversation links return appropriate safe responses, never another reader's data.
- Verify identity at each server entry point. Validate conversation ownership independently of supplied IDs when listing, reading, admitting or recovering runs; enforce relationship ownership through reviewed database/RPC boundaries and RLS/grants. Keep private continuation, run capabilities, provider payloads and owner identifiers out of browser responses. No service-role shortcut.
- Scope SDK continuation and run snapshots to the selected conversation. Keep at most five whole terminal exchanges and the existing byte bounds per conversation, including failed/interrupted uncertainty handling. Update pruning consistently so visiting one chat does not accidentally clear another chat's retained continuation. Keep 30-day lazy retention unless a concrete change is needed and explicitly documented; disclose that history is retained for this period, not forever.
- Explicit reader preferences remain shared across conversations. Starting New chat clears that chat's conversational context, not the reader profile or saved library/plans. Loading older display messages does not expand model context or trigger a model request. The UI must not claim the agent remembers every displayed message.
- Preserve reader-wide one-active-run and ten-runs/hour limits across conversations and tabs. Starting a second conversation must not bypass them. Bind each submitted run, stream, saved outcome and recovery operation to its conversation. Switching chats must not display late events in the new chat, lose durable outcomes or trigger automatic POST retries. Preserve existing Stop/disconnect uncertainty and GET-only recovery; guard drafts against accidental loss with a simple explicit behavior.
- Use existing assistant-ui custom/external-store integration and selective shared controls. Keep the list and selected transcript simple and responsive; no second chat backend, state framework, agent framework or design overhaul.
- Update current request/result schemas, database types, setup instructions, retention explanation and demo narrative. Document any new migration and apply order; do not apply remote migrations as part of this ticket. Browser/API contracts may gain conversation identity, but book/profile/plan MCP contracts stay intact.

## Acceptance criteria

- [ ] Existing retained chat data survives migration into an owner-scoped conversation with stable run IDs and results.
- [ ] A reader can create, browse, reopen by link and resume separate saved conversations, including after refresh.
- [ ] Older conversations/messages load through bounded stable pagination with correct ordering and accessible loading/error/empty states.
- [ ] Each conversation uses only its own bounded SDK continuation; durable reader preferences remain shared.
- [ ] Authorization and related ownership are enforced in server/database boundaries; private continuation and capabilities are never exposed.
- [ ] Switching conversations and recovering a disconnected run cannot mix events, bypass reader-wide limits or automatically replay mutations.
- [ ] Existing activity, recommendation/plan cards, explicit writes and uncertainty states remain supported.
- [ ] Focused self-review and applicable lint/type/format checks are recorded; documentation explains migrations, retention, context limits and remaining user verification.

## Completion and handoff

Review actual changes for related ownership, migration/backfill safety, stable pagination, continuation pruning, stream routing, draft handling and durable recovery. Fix concrete findings. Follow the shared manual-testing boundary: no added/run tests, browser QA, builds or paid requests; preserve existing tests. Append a dated handoff with implemented contracts, migration/application requirements, retention decisions, static checks, review fixes and unverified runtime behavior. Resolve implementation separately from user QA. Hosted showcase follows this ticket.

## Comments

- 2026-10-04: Scope and order approved by the user. Separate browsable conversations extend existing single-conversation persistence; refactoring comes first.
