# 06 — Optional Open Library discovery and metadata

**What to build:** When deliberately enabled, a reader asks for external discovery, sees labeled Open Library candidates, and chooses whether to add one or fill missing edition metadata. The main library and required showcase work without it.

**Blocked by:** 03 — Agent chat, recommendations, and persistent memory

**Status:** open

**Triage:** ready-for-agent

**Assignee:** unclaimed

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

- [ ] Explicit discovery returns bounded, normalized, labeled external candidates with source provenance.
- [ ] `search_catalog` follows the existing authenticated MCP contract and returns honest upstream errors.
- [ ] A reader deliberately adds a candidate or fills chosen missing metadata with edition disambiguation.
- [ ] Personal data and existing user-confirmed values remain protected by version/ownership rules.
- [ ] Main library/import behavior remains available during catalog failure and when this ticket is not implemented.
- [ ] Docs identify this capability as optional and name only the implemented provider.

## Completion and handoff

Review the actual changes against this ticket and the shared brief. Fix concrete correctness, authorization, persistence, and reuse issues; keep unrelated cleanup out. Run only the applicable lint/type/format checks. Record implemented contracts, migrations and any manual application steps, dependency choices, self-review findings/fixes, exact static-check results, and unverified behavior under Comments. Update relevant docs so the next session can proceed without this chat. Resolve implementation only when its acceptance behavior is implemented; distinguish that from user QA and hosted verification.

## Comments

### 2026-10-04 — Published

Approved by the user as part of five required showcase slices plus one optional catalog slice. Functional testing and browser QA remain with the user.
