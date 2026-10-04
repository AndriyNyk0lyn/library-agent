# Showcase MVP tickets

Seven required implementation slices and one optional catalog slice, approved 2026-10-04. The two follow-up tickets live in their own numbered directory so existing IDs and completed handoffs remain stable. Start each fresh Codex or Claude session with the selected ticket and [implementation brief](spec.md). All tickets are agent-ready descriptions; dependencies still control when work can start.

| Ticket                                                                                                            | Blocked by  | Required |
| ----------------------------------------------------------------------------------------------------------------- | ----------- | -------- |
| [01 — Library search and authenticated MCP](issues/01-library-search-mcp.md)                                      | None        | Yes      |
| [02 — Goodreads import and library management](issues/02-import-library-management.md)                            | 01          | Yes      |
| [03 — Agent chat, recommendations, and persistent memory](issues/03-agent-chat-memory.md)                         | 02          | Yes      |
| [04 — Reading plans and validation-driven revision](issues/04-reading-plans.md)                                   | 03          | Yes      |
| [Refactor 01 — Agent and MCP maintainability](../chat-history-maintainability/issues/01-agent-mcp-refactor.md)    | Showcase 04 | Yes      |
| [History 02 — Chat history and separate conversations](../chat-history-maintainability/issues/02-chat-history.md) | Refactor 01 | Yes      |
| [05 — Hosted showcase and handoff](issues/05-hosted-showcase.md)                                                  | History 02  | Yes      |
| [06 — Optional Open Library discovery and metadata](issues/06-optional-open-library.md)                           | 03          | No       |

Select an open, unclaimed ticket whose blockers are resolved. Tickets 01–04 are implementation-resolved; start with Refactor 01, then History 02, then showcase 05. Ticket 06 can be explicitly selected after 03 and never blocks required showcase work.

Suggested new-session prompt: “Implement the selected ticket. Read its shared brief and completed blocker handoffs, follow the manual-testing boundary, perform focused self-review, and record the handoff in the ticket.” Attach or name the selected ticket in that session.

Lifecycle is open → claimed → resolved (or closed with an explicit scope reason). Triage is ready-for-agent. Append implementation handoffs under Comments. User QA/hosting evidence is separate from implementation completion.

## Implemented slices

- [01 — Library search and authenticated MCP](issues/01-library-search-mcp.md): implementation resolved 2026-10-04; shared read contract, migration and client handoff recorded. User QA and hosted/account-isolation verification remain pending. Ticket 02 builds on this contract.

- [02 — Goodreads import and library management](issues/02-import-library-management.md): implementation resolved 2026-10-04; preview/import, versioned edits and durable MCP mutations implemented. Migration application and user QA remain pending. Ticket 03 builds on this contract.

- [03 — Agent chat, recommendations, and persistent memory](issues/03-agent-chat-memory.md): implementation resolved 2026-10-04; real MCP agent runner, profile memory, bounded continuation and durable limits/recovery. Migration/model/runtime/isolation QA remains pending. Ticket 04 builds on this contract.

- [04 — Reading plans and validation-driven revision](issues/04-reading-plans.md): implementation resolved 2026-10-04; deterministic preview, durable saves/listing, MCP tools and bounded revision/chat results. Migration/runtime/isolation QA remains pending; Refactor 01 is the next required frontier, followed by History 02 and showcase 05.
