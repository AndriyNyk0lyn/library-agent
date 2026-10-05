# Separate conversations and chat history

History ticket 02 adds saved conversations at `/chat` and stable internal links at `/chat/<conversation UUID>`. Implementation and static review are complete; migration execution, UI/model behavior and real-account isolation remain unverified.

## Migration and rollout

Review `supabase/migrations/20261004180252_chat_conversations.sql` and apply it **after** `20261004154621_reading_plans.sql` using the existing [linked-project migration workflow](05-first-library.md#4-link-review-and-apply-the-migration). It has not been applied by the implementer. Apply with the matching application code and restart: the old zero-argument snapshot/history RPCs and old admission signature are removed, so old and new application versions are not interchangeable during rollout.

The migration backfills every existing run into one conversation per reader, preserving run IDs, status, activity, display replies, recommendation/plan results, capabilities and retained SDK history. It neither deletes legacy rows nor restores continuation already pruned by earlier code. A composite owner/conversation foreign key binds every run to its reader's conversation. No dependency or environment changes are needed.

## Browser contracts

- `GET /api/chat/conversations?cursor=<encoded JSON>` returns `{ conversations, next_cursor }`, at most 20 conversations. Entries expose only `id`, `title`, `created_at`, `last_activity_at`. The cursor has `as_of`, `at`, `id`. Activity order is reconstructed from admissions at the first-page cutoff, then timestamp/UUID descending; later activity cannot move conversations across that pagination session. Refresh/reopening starts a fresh list. Retention can remove expired rows while paging.
- `POST /api/chat/conversations` accepts strict `{ conversation_id: UUID }`. The server derives the owner. Repeating that identity returns the existing conversation without changing title/activity. The UI stores its pending identity in session storage **before** POST and only clears it after confirmed matching success. Uncertain creation has an explicit New chat retry; refresh in the same tab retains the identity. If storage is unavailable, creation is blocked before sending. Closing the tab loses this retry identity; inspect saved conversations before creating another chat.
- `GET /api/chat?conversation_id=<UUID>&cursor=<encoded JSON>` returns `{ conversation, runs, next_cursor }`, at most 20 runs ordered oldest first within each page. The exclusive timestamp/UUID cursor has `at`, `id`; older pages prepend by ID without overwriting known/streamed runs. GET-only recovery fetches latest saved status and restarts older-page navigation so gaps caused by another tab remain reachable. Pagination never calls the model.
- `POST /api/chat` now requires `{ conversation_id: UUID, run_id: UUID, message }`. Every SSE event carries both IDs, and every display run includes `conversation_id`. The client rejects mismatched event/result identity. Existing six event types, message limits, same-origin checks, safe activity, results and error behavior remain. Invalid IDs/cursors return 400, missing/foreign/expired conversations 404, reader-wide active/repeated/conflicting admission 409, quota 429, auth 401, forbidden origin 403, and unavailable/unconfirmed storage 503. Reads are private/no-store.

Titles use the first admitted message with whitespace collapsed and an 80-character bound, in deterministic SQL without a model call. Conversation activity means creation or the latest admitted request, including failed/interrupted runs. No rename, delete, archive, export or search controls were added.

## Ownership and continuation

Private conversation/run tables have RLS with no direct client table grants. Public SECURITY INVOKER wrappers call narrow private SECURITY DEFINER implementations, all requiring `auth.uid()` and explicitly scoping reads/writes to it. These implementations protect private coordination and capabilities. Snapshot, admission and history independently check conversation ownership; missing and foreign links are indistinguishable. Cursor contents never grant access. Finalization/activity still require the existing owner/run/server-held capability, and the immutable run relationship binds those outcomes to the conversation. No browser response exposes owner, provider history, usage, model or capability.

The existing reader-wide advisory lock, unique active-run index, 75-second lease, rolling ten admissions/hour, 60-second deadline, eight model turns and mutation operation safety remain. A new chat or another tab cannot bypass admission limits. Book/profile/plan MCP contracts and the real authenticated MCP HTTP hop are unchanged.

`agent_history(p_conversation_id)` restores only that conversation's latest five terminal exchanges. Existing complete-call/result validation, 200-item/512 KiB per-exchange and 512 KiB restored-history bounds remain; whole exchanges are dropped. Failed/interrupted turns still add uncertainty context without replaying incomplete actions. Pruning ranks terminal runs **within each conversation** on read/admission/finalization, so visiting a different conversation does not erase its continuation. Explicit profile preferences, library records and saved plans remain shared and independent.

## Retention, drafts and recovery

Run history retains the existing 30-day lazy owner-scoped policy, based on run creation. Conversations with no retained runs are removed once their last activity is older than 30 days; recent empty conversations remain reopenable. Dormant readers are cleaned when they return. History is not permanent. Loading older display messages does not expand model memory, and the UI explains the latest-five-exchange context limit.

Drafts are saved separately per conversation in this tab's session storage, including submitted text during an interrupted stream. Switching chats unmounts/aborts the old receiver; late events cannot enter the newly keyed transcript. Reopening loads durable status and polls GET for active leases. Switching never resubmits an old turn. Storage failures show a warning to copy the draft before navigation. Closing the tab clears draft storage. Stop/disconnect retain honest write uncertainty; check library/profile/plans before explicitly asking again. Confirmed server outcomes survive receiver disconnection.

## User verification

1. Apply the migration after plans, restart, and inspect retained legacy IDs/replies/cards/activity. Create two chats, continue each, refresh and reopen their links. Check bounded independent context with shared explicit preferences.
2. Exercise more than 20 conversations and runs, timestamp ties, paging during new admissions/completion, empty/end/loading/unavailable/retry states, keyboard use, and responsive layout. Confirm older pages keep the draft, selected chat, active state and newly completed results.
3. Switch/Stop/disconnect before admission, during tools and after final save. Reopen to recover without POST replay; retry uncertain conversation creation with the same ID, including after refresh. Verify two tabs still share one-active and ten/hour limits and lease expiry.
4. Verify two actual accounts and anonymous requests across routes and direct RPC/Data API access: foreign conversation reads/admission/history and forged related references fail safely; capabilities/private history stay private. Check retention and continuation pruning independently in multiple conversations.

No tests, builds, browser QA, database/advisor queries, remote migrations or paid-model requests were added/run for this ticket. Existing tests are preserved. Static checks and self-review do not prove execution, interoperability or isolation.

Official [Supabase RLS/grants](https://supabase.com/docs/guides/database/postgres/row-level-security), [changelog](https://supabase.com/changelog), and [assistant-ui external-store guidance](https://www.assistant-ui.com/docs/runtimes/custom/external-store) were consulted alongside installed declarations. The changelog Markdown endpoint could not be fetched; the HTML changelog was used. No SDK APIs or dependencies were upgraded.
