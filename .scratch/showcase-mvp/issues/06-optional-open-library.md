# 06 — Optional Open Library discovery and metadata

**What to build:** When deliberately enabled, a reader asks for external discovery, sees labeled Open Library candidates, and chooses whether to add one or fill missing edition metadata. The main library and required showcase work without it.

**Blocked by:** 03 — Agent chat, recommendations, and persistent memory

**Status:** resolved

**Triage:** ready-for-agent

**Assignee:** Codex 2026-10-05

## Start a fresh session

Read the [implementation brief](../spec.md), repository agent instructions, and the completed blockers including their handoff comments. Inspect the current implementation before changing it; baseline notes describe the starting point, not a substitute for current code. Claim this ticket before implementation. The user owns functional/manual testing; follow the brief's focused self-review and handoff policy.

## Starting point and activation

This is a maybe-ticket: the user approved publishing it, not making it a prerequisite for the MVP. Implement when explicitly selected. Ticket 03 provides chat and the MCP registry; ticket 02 provides import identities and editable books. Required tickets 04–05 do not depend on this ticket. Work may proceed after 03 using its current contracts; accommodate later plan tools without redesigning them.

## Implementation decisions

- Implement Open Library only, behind small searchBooks/getBookDetails functions returning app-owned catalog candidates. Verify current official Search/edition API usage and request limits. Include provider identifiers, source URL, authors/title, edition identity and optional ISBN/pages/cover/description/language where available. Unknown values remain unknown; do not confuse work-level results with precise edition page counts.
- Register authenticated `search_catalog` with query, optional author/ISBN and bounded limit. Catalog content is public, but the app's MCP endpoint still authenticates readers. External discovery happens only on explicit request; library recommendations continue to default to saved unread books. Label every external candidate and avoid claiming it belongs to the user's library.
- Let the reader deliberately choose a candidate through a simple UI/structured chat result. Route manual addition through the existing create-book service; adding books through chat is not required. An explicit metadata-fill action may use existing safe update contracts, extended only as needed. Make selection of edition clear before applying page count or ISBN.
- Store external identifiers and provenance separately from personal fields. Fill chosen missing metadata without replacing notes, ratings, status, ownership, or user-confirmed edition values. If replacing an existing metadata value is supported, require deliberate selection and expected version. Preserve import and mutation retry behavior.
- Use bounded results/cache, request timeout, and restrained read retries. Return `UPSTREAM_UNAVAILABLE` honestly; catalog outages must leave local library/import/chat operations usable. Do not enrich entire imports synchronously or add background jobs.
- Treat descriptions as untrusted data, minimize spoiler exposure, and avoid rendering arbitrary HTML. Optional covers do not become required for book identity or UI operation. Do not invent authoritative pacing, difficulty, or personal taste metadata from catalog text.

## Acceptance criteria

- [x] Explicit discovery returns bounded, normalized, labeled external candidates with source provenance.
- [x] `search_catalog` follows the existing authenticated MCP contract and returns honest upstream errors.
- [x] A reader deliberately adds a candidate or fills chosen missing metadata with edition disambiguation.
- [x] Personal data and existing user-confirmed values remain protected by version/ownership rules.
- [x] Main library/import behavior remains available during catalog failure and when this ticket is not implemented.
- [x] Docs identify this capability as optional and name only the implemented provider.

## Completion and handoff

Review the actual changes against this ticket and the shared brief. Fix concrete correctness, authorization, persistence, and reuse issues; keep unrelated cleanup out. Run only the applicable lint/type/format checks. Record implemented contracts, migrations and any manual application steps, dependency choices, self-review findings/fixes, exact static-check results, and unverified behavior under Comments. Update relevant docs so the next session can proceed without this chat. Resolve implementation only when its acceptance behavior is implemented; distinguish that from user QA and hosted verification.

## Comments

### 2026-10-04 — Published

Approved by the user as part of five required showcase slices plus one optional catalog slice. Functional testing and browser QA remain with the user.

### 2026-10-05 — Implementation resolved; user QA pending

- Implemented optional Open Library only, disabled by default. `searchBooks` / `getBookDetails` normalize bounded external candidates with identifiers/provenance and work-versus-edition identity. Search does not supply work-level pages/ISBNs; deliberate selection loads exact edition metadata and bounded author names. Unknown fields remain unknown. Optional cover URLs do not need loading; descriptions are plain text behind a spoiler disclosure.
- Added authenticated `search_catalog` to the existing MCP registry only when enabled, with query, optional author/ISBN and limit 1–10 (default 5). Existing bearer identity checks and actual agent-to-MCP HTTP remain. Safe activity schemas/labels and SQL activity allowlist admit its name without payload logging. Agent instructions allow external discovery only on explicit request, label candidates, and keep ordinary recommendations grounded in eligible saved unread books. External chat results use prose; the simple catalog UI provides deliberate selection/addition rather than a new structured-chat persistence contract.
- `/library/catalog` and `/library/catalog/[edition]` provide search/loading/empty/error, edition identity/ISBN/publisher/date/language review and normal book entry. The existing BookForm accepts scoped initial fields and an action; shared `createBook` owns actual insertion, server-derived owner, RLS and stable UUID retry recovery. The page action captures the reviewed edition snapshot in its encrypted closure, authenticates again through the helper and retains drafts after uncertain saves. Save does not refetch Open Library; retry comparison includes ISBNs and canonical provenance. Creation/recovery reads now have 15-second storage deadlines. The saved detail page shows the source link.
- `20261005060400_optional_open_library.sql` is authored **not applied**. It adds constrained nullable JSONB edition provenance with only authenticated INSERT granted, covered by existing owner RLS. No provenance UPDATE permission, new private table, personal-field replacement, version bypass or change to import/mutation coordination. It replaces only the safe activity name allowlist while retaining auth, run capability, expiry/status and count predicates. Reviewed types and output schemas accept absent provenance in older saved mutation outcomes. Existing books are never enriched/replaced: the deliberate-add path meets the ticket's add-or-fill criterion; metadata fill/replacement and automatic duplicate merging are not implemented.
- Added server-only `OPEN_LIBRARY_ENABLED` (exact `true`) and `OPEN_LIBRARY_CONTACT_EMAIL`; examples default to disabled. Public upstream JSON cache is limited to 100 entries/five minutes. Upstream requests have seven-second timeouts, 512 KiB response bounds, at least 1.1-second process-local spacing, one-minute 429 cooldown and no automatic retries. Edition details have a 15-second total deadline. Cache/admission are per process; no claim of distributed rate enforcement. Catalog failure returns honest UPSTREAM_UNAVAILABLE; library/import/chat do not require upstream calls, and disabled operation does not require this migration.
- No new dependencies or SDK import changes. Verified official Open Library Search/edition APIs and rate/usage guidance, Supabase RLS/grants, Next.js Form/Server Action closure contracts; read installed versions and the Supabase changelog. Local CLI help/migration creation needed approved local telemetry filesystem access; no remote resource or database operation was performed. No applicable root ADR was found.
- Focused self-review and React checklist covered auth/ownership, grants, provenance separation, bounded normalization/cache/deadlines, safe text, current-run recommendation separation, retry snapshots, missing authors, stale/version preservation and accessible states. Fixed initial typecheck null narrowing, disabled edition prefetch to avoid lookup before selection, replaced unencrypted bound snapshot arguments with an encrypted page closure, minimized form serialization, and made stored-provenance comparison validate/normalize instead of throwing. No tests were added/changed.
- Static checks passed: `npm run typecheck` (Next type generation and strict TypeScript); `npm run lint` (zero warnings); `npm run format:check`; final focused ESLint for creation/schema/types; targeted changed-Markdown formatting/check. Initial typecheck's nullable book error was fixed before passing. Generated next-env route-path changes were restored to keep the diff scoped.
- Updated [optional setup/contracts/manual checks](../../../docs/setup/11-open-library.md), README, setup index, chat extension docs, showcase index and verification record. **User next actions:** review/apply the new migration after existing migrations, deliberately configure enable/contact values, restart, then perform the guide's checks. Migration execution, provider behavior, edition correctness, UI save/retry/refresh, real MCP/model explicit-request behavior, failure isolation and two-account UI/MCP/Data API isolation remain unverified. No automated/functional tests, builds, browser QA, database/advisor queries, migration application, live MCP/model calls, provisioning or deployment occurred. Acceptance boxes mean implementation completion, not verified runtime behavior.
