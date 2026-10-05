# Mixed library and external recommendations

Status: resolved
Assignee: Codex

User reports INVALID_MODEL_OUTPUT / ModelBehaviorError after asking for three horror books from TBR and one absent from their library. Preserve the static-only showcase verification boundary.

Confirmed contract conflict: instructions, combined recommendation validation, display schema, table constraint and finish RPC allow only three total cards. The requested split needs four. This conflict alone would produce INVALID_RECOMMENDATIONS after model validation, not necessarily the reported SDK error. The supplied log has no specific SDK failure reason; do not claim a reproduced root cause.

Implement four-card support end to end, default to three, honor explicit source counts when evidence permits, and add allowlisted SDK failure categories without logging raw outputs or private payloads. Preserve real HTTP eligibility checks and existing tests.

## Comments

### 2026-10-05 handoff

Implemented a shared four-card application limit in model arrays, combined final validation and persisted/display run schema. Instructions default to three and explicitly support the requested three-library/one-external split. Existing observed references, final authenticated HTTP reads, unread eligibility, absent-library verification and no-auto-add behavior remain. Authored `20261005074444_four_recommendation_cards.sql` with the installed CLI; it replaces only the cards CHECK and the matching finish RPC limit, preserving verified ownership, capability, lease, history and other size checks. Migration not applied. See [setup and manual retry](../../../docs/setup/12-expanded-agent-tools.md#mixed-recommendation-failure-follow-up).

The supplied run log does not establish the precise SDK failure. Added fixed allowlisted `model_failure` classifications for redacted schema failures, missing final output and other model behavior. Inspected official SDK running/error documentation and installed 0.18.0 redaction/error code. Sensitive logging remains disabled, with no raw model/error/tool payload logging, fabricated fallback, automatic model retry or mutation replay.

Self-review traced all card limits through instructions, model output, final eligibility, snapshot schema, table CHECK and finish RPC. The migration retains the existing function signature and permissions. Passed `npm run typecheck`, `npm run lint`, `npm run format:check` and `git diff --check`. Restored unrelated next-env type-generation changes. Existing tests preserved; no functional tests, build, browser QA, live model/MCP/SQL requests, migrations or account-isolation checks run, following the user-owned showcase boundary. Four-card live behavior and the original SDK error remain unverified.
