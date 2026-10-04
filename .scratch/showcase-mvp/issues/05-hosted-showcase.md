# 05 — Hosted showcase and handoff

**What to build:** The implemented app is ready for one hosted showcase, with concise deployment instructions and a demo narrative showing import, an agent-driven action, recommendations, persistent memory, and a rejected/revised plan.

**Blocked by:** [History 02 — Chat history and separate conversations](../../chat-history-maintainability/issues/02-chat-history.md), which depends on independently reviewed Refactor 01 and completed showcase 04.

**Status:** open

**Triage:** ready-for-agent

**Assignee:** unclaimed

## Start a fresh session

Read the [implementation brief](../spec.md), repository agent instructions, and the completed blockers including their handoff comments. Inspect the current implementation before changing it; baseline notes describe the starting point, not a substitute for current code. Claim this ticket before implementation. The user owns functional/manual testing; follow the brief's focused self-review and handoff policy.

## Starting point

Tickets 01–04 and the refactor/chat-history follow-ups implement the required behavior locally and record their static checks and handoff gaps. Functional tests, browser QA, live model calls, hosted transport, and real account-isolation checks belong to the user. Ticket 06 is optional and must not gate this deliverable. Never describe unverified behavior as demonstrated.

## Implementation decisions

- Prepare deployment of the existing single Next.js Node.js app on Vercel with the same Supabase project and provider-assigned domain. Read the current package/configuration instead of assuming the initial scaffold state. Use Node 24 and the actual lockfile/scripts, compatible with current host support.
- Document exact currently required environment names and trusted app origin. Derive MCP self-call destination from that origin. Align Supabase Site URL/confirmation redirect and existing templates with the hosted origin. Keep keys server-side and preserve app token auth independently of hosting protection.
- Set application deadlines below supported function duration, accounting for streaming, MCP calls, final persistence, and cleanup. Prefer the simplest reachable demo deployment; introduce a protection workaround only for an actual blocker and with explicit scope. Do not add extra environments, custom domains, custom SMTP, CI pipelines, monitoring providers, or a second backend.
- Prepare source-control/deployment instructions. Ticket execution does not independently authorize creating external resources, public repositories, deployments, or charges. Use existing user authorization if present; otherwise complete reviewable configuration/docs and give the user the remaining provisioning steps. If deployment is performed under authorization, record its actual URL and status without claiming unperformed QA.
- Write a short demo script with prompts/actions and expected behavior: use a disposable or deliberately chosen Goodreads snapshot, show accurate import, update a uniquely resolved book, recommend eligible unread books, save a preference, start another conversation, reopen the earlier chat by its stable link and continue with its own history, reject an infeasible schedule and revise it, deliberately save a plan and reload it. Present it as a user-operated showcase, not an automated test suite or required agent-run browser session.
- Explain authored agent instructions, validated MCP schemas, real HTTP boundaries, deterministic validation, durable profile/conversation/run data, and why multiple agents/embeddings were deferred. Safe activity can illustrate tool use without exporting private trace payloads. Keep optional catalog absent or clearly labeled if unfinished.
- Add one development skill for adding a book tool safely, using the relevant skill-creation guidance: shared service, input/result validation, server-derived ownership, MCP registration, safe event mapping, and focused code self-review. Honor the approved manual-testing boundary in the skill.
- Update README, setup guides, feature status, and limitations based on actual code. Distinguish implemented, statically checked, user-reported, and live-verified behavior. List outstanding user QA succinctly in the handoff; do not turn it into another testing ticket or a prerequisite that blocks code completion.

## Acceptance criteria

- [ ] One-app hosting configuration and minimal current setup instructions are complete and reviewable.
- [ ] Required agent/MCP features and deadlines use the actual deployed/local configuration contracts.
- [ ] A concise user-operated demo script covers tool use, persistent memory, recommendations, and deterministic planning/revision.
- [ ] A reusable development skill describes adding tools consistently with the project's architecture and testing boundary.
- [ ] Documentation gives truthful implementation/deployment status, remaining manual actions, and relevant limitations.
- [ ] Optional catalog, infrastructure additions, and redesign do not gate the required showcase.

## Completion and handoff

Review the actual changes against this ticket and the shared brief. Fix concrete correctness, authorization, persistence, and reuse issues; keep unrelated cleanup out. Run only the applicable lint/type/format checks. Record implemented contracts, migrations and any manual application steps, dependency choices, self-review findings/fixes, exact static-check results, and unverified behavior under Comments. Update relevant docs so the next session can proceed without this chat. Resolve implementation only when its acceptance behavior is implemented; distinguish that from user QA and hosted verification.

## Comments

### 2026-10-04 — Published

Approved by the user as part of five required showcase slices plus one optional catalog slice. Functional testing and browser QA remain with the user.

- 2026-10-04: User-approved refactor and chat-history tickets inserted before hosting. Complete History 02 and its reviewed refactor blocker first; original ticket ID and scope remain.
