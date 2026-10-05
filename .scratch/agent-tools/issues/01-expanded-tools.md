# Expanded library, catalog and web tools

Status: resolved
Assignee: Codex

User request: add Open Library books through agent/MCP, edit all reader-managed book fields, apply changes to all matching library books, ground general recommendations in reading history with external catalog lookup, keep library listing private-library-only, and add internet search. Suggest useful follow-ups without implementing unrelated features.

Implement shared authenticated services, durable retry and version checks, bounded results, honest errors and safe activity. Preserve existing optional catalog work. Use the showcase static-only verification boundary: lint, typecheck, format and self-review; migrations, functional tests, model/API calls, builds and browser QA remain user-owned.

## Comments

### 2026-10-05 implementation handoff

Implemented expanded `update_book` fields (including ownership), `get_catalog_book`, explicit server-fetched `add_catalog_book`, frozen `preview_library_update` / atomic `apply_library_update`, and optional `search_web`. General history-based recommendations support separate current-run catalog cards; explicit library-only listings/recommendations retain saved-library routing. External cards use observed metadata and final MCP library-match checks, with sourced web links persisted in the final answer. Existing optional catalog work was preserved.

Local migration authored with the installed Supabase CLI: `20261005064304_agent_tool_expansion.sql`, after `20261005060400_optional_open_library.sql`. Neither was applied. Narrow private checked mutations reuse the existing immutable operation ledger and owner scoping; direct table update grants were not broadened. Single/bulk writes share patch semantics. Bulk updates freeze at most 5,000 rows for 15 minutes, lock in UUID order, reject any stale/missing row and apply one atomic statement. Catalog retries recover outcomes before upstream lookup; additions reject matching edition/ISBN/title-author candidates.

Focused review fixed a variable shadowing error caught by typecheck, a potentially ambiguous PL/pgSQL operation variable, and replaced per-book bulk writes/ledger entries with one atomic UPDATE. Catalog work/edition references are deduplicated by edition identity. Existing-library external matches and incomplete matching searches reject misleading cards. Unknown ownership and metadata remain unknown; no automatic writes/retries were added.

Passed: `npm run typecheck`, `npm run lint`, `npm run format:check`, and `git diff --check`. Type generation's unrelated `next-env.d.ts` rewrite was restored. Existing tests were preserved. No tests, builds, browser QA, SQL execution/advisor queries, live MCP/model/API calls, hosted migration or real-account isolation checks were run. These remain user-owned under the showcase boundary.

Server flags: `OPEN_LIBRARY_ENABLED` with `OPEN_LIBRARY_CONTACT_EMAIL`; `WEB_SEARCH_ENABLED` with optional `WEB_SEARCH_MODEL` override (otherwise `OPENAI_MODEL`). Search uses the existing server OpenAI key and can incur a separate request charge when enabled. No dependencies or resources were provisioned. See [setup/contracts/manual checks](../../../docs/setup/12-expanded-agent-tools.md).
