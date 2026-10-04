# Library search and authenticated MCP

Implemented in showcase ticket 01. Runtime transport, database search, and real two-account isolation remain for user verification. No agent, model request, or deployment is needed to use the read tool.

## Apply the read migration

Review and apply `supabase/migrations/20261004111404_search_library_books.sql` using the existing [linked-project migration workflow](05-first-library.md#4-link-review-and-apply-the-migration). If the initial library migration is already applied, only the search migration should be pending. Confirm the intended project and dry-run output first. This migration has not been applied by the implementer.

The function `public.search_library_books` returns bounded records using `SECURITY INVOKER`, the existing SELECT policy, and an explicit `auth.uid()` owner predicate. Only `authenticated` gets EXECUTE; anonymous/PUBLIC execution is revoked. No table write privileges change. Title or any individual author matches case-insensitive literal substrings: `%`, `_`, backslashes, and punctuation have no wildcard meaning. Query whitespace is trimmed; a blank query means no text filter. The existing `(user_id, created_at DESC, id DESC)` index supports owner/order selection; this slice adds no search extensions or speculative indexes.

The UI uses the same service/function with 25-record numbered pages, preserving `?page=`, query/status/ownership across navigation and notes display. Submitting a search resets to page one. The native GET form works without JavaScript; Next Form and the existing submit control supply navigation/pending feedback when JavaScript is available. No browser-side library filtering or new UI dependency is needed.

## Endpoint and authentication

The Node.js route is `/api/mcp`. `getMcpEndpoint()` derives its URL solely from trusted `APP_BASE_URL`; do not derive it from tool input, forwarded headers, or a browser-supplied URL. Set the exact app origin, including development port. HTTP is allowed only for `localhost`/`127.0.0.1`; hosted credentials require HTTPS. No new environment variables are required.

Every POST/GET/DELETE/OPTIONS request checks Host against the configured origin's host, rejects any supplied Origin that differs from that origin, and independently verifies `Authorization: Bearer <reader-access-token>` with Supabase `auth.getUser(token)`. Server-to-server clients may omit Origin. Cookies are not MCP authentication. The publishable key is not a reader token. Each request creates a fresh user-scoped Supabase client with that bearer header; no service-role key, global session, or tool-result cache exists. Supabase auth/read calls have 15-second request bounds. Replies use `Cache-Control: private, no-store`; no credential or private payload is logged.

This is a first-party bearer integration, not an OAuth discovery/login server. For a development client, authenticate your confirmed account with Supabase `auth.signInWithPassword` and retain `session.access_token` privately. The ticket 03 chat route relays the independently verified reader session token; see [chat/memory contracts](08-agent-chat-memory.md). Refresh/re-authenticate using Supabase when a token expires; never print tokens or put them in URLs, source, screenshots, or ticket comments.

Transport is stateless Streamable HTTP with JSON responses and a fresh SDK server/transport per POST. POST supports initialize, initialized notifications (202), tools/list, and tools/call. There are no MCP session IDs or reconnectable server event streams. Authenticated GET/DELETE/OPTIONS receive 405 with `Allow: POST`; unauthenticated requests receive 401. Cross-origin browser/CORS clients are deliberately unsupported. Other methods use Next.js's method rejection. Host/Origin failures are 403, invalid/missing/expired tokens are 401, and configuration/auth outages are 503, with safe `{ error: { code, message } }` HTTP bodies. SDK protocol parsing/version/content-negotiation errors retain the SDK's JSON-RPC format. POST bodies are limited to 64 KiB.

## Tool contract

`search_my_library` accepts a strict object; extra arguments, including `user_id`, fail validation. All fields are optional:

| Field    | Meaning                                                                                   |
| -------- | ----------------------------------------------------------------------------------------- |
| `query`  | Trimmed literal title/author substring, maximum 200 characters                            |
| `status` | `want_to_read`, `reading`, `finished`, or `dropped`                                       |
| `owned`  | Boolean; true selects known owned, false selects known not owned; omit to include unknown |
| `limit`  | Integer 1–50, default 25                                                                  |
| `cursor` | Opaque `nextCursor` from a previous successful search                                     |

Successful structured content:

```json
{
  "ok": true,
  "books": [],
  "nextCursor": null,
  "hasMore": false
}
```

Each book contains `id`, `title`, `authors`, `status`, `rating`, `owned`, `page_count`, `version`, and `created_at`. Ratings, ownership, and pages preserve nulls. Notes and `user_id` are excluded. The adapter validates output and returns the same JSON in text content for clients that do not read `structuredContent`.

Failures return `isError: true` with `{ "ok": false, "error": { "code": "VALIDATION_ERROR" | "UPSTREAM_UNAVAILABLE", "message": "..." } }`; an empty successful read is distinct. Invalid input/cursors and changed cursor filters produce VALIDATION_ERROR. Database/setup failures produce UPSTREAM_UNAVAILABLE. Unknown tool names are SDK JSON-RPC invalid-parameter errors.

Order is `created_at DESC, id DESC`. MCP uses an exclusive keyset `(created_at, id)` cursor and a one-row lookahead; it preserves database timestamp precision. Cursor format v1 contains the last identity/order key and normalized query/status/owned filters, encoded as base64url. Treat it as opaque. It is neither secret nor an authorization token: tampering cannot bypass the owner predicate/RLS. Repeat the same filters with `nextCursor`; changing filters requires restarting without it. Limit may change between calls. Newer inserted books do not shift later cursor pages. This is not snapshot isolation: concurrent edits that change filter membership can change results. UI offset pages retain their existing semantics and can shift when books are added. UI page numbers are bounded to 1–10,000.

`get_book` and `update_book` are now implemented in ticket 02 using these app UUIDs/versions. See [management contracts](07-import-library-management.md) for notes, atomic versions, and durable retries. Search itself remains read-only.

## User verification

After applying the migration, run the app yourself and check title/author search, each status, owned/not-owned versus unknown, empty/error feedback, filtered pagination, manual add, sign-out/in, and refresh. In the existing migration workflow, confirm anonymous execution remains denied. Ticket 02 introduces only the owner-scoped write privileges documented in the management guide. Use two confirmed disposable accounts for UI, MCP, and direct Data API ownership checks.

A compatible SDK client connects over real HTTP like this (illustrative integration code, not an automated smoke suite):

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// endpoint comes from trusted application configuration; accessToken is the
// reader's current Supabase session token, privately supplied by your caller.
const client = new Client({
  name: "reading-companion-client",
  version: "0.1.0",
});
await client.connect(
  new StreamableHTTPClientTransport(endpoint, {
    requestInit: { headers: { Authorization: `Bearer ${accessToken}` } },
  }),
);
const discovery = await client.listTools();
const result = await client.callTool({
  name: "search_my_library",
  arguments: { status: "want_to_read", owned: true, limit: 25 },
});
await client.close();
```

Verify discovery includes the input/output schemas; compare the call with the same UI filters, continue with the returned cursor, try changed filters/invalid inputs, and repeat with account B. Missing/expired/invalid tokens must fail without book data; a foreign Origin must fail. The SDK client performs initialize automatically. For raw POST clients use `Content-Type: application/json`, `Accept: application/json, text/event-stream`, Authorization on every request, and the negotiated `MCP-Protocol-Version` after initialize. No paid-model request is needed. Repeat on the hosted HTTPS origin when ticket 05 deploys; local static checks do not prove that hosting protection allows MCP requests.

## Dependency/API references

Pinned `@modelcontextprotocol/sdk` **1.32.0**, with existing Zod **4.6.5** (supported peer range). The official v1 line remains supported; it provides the Web-standard transport and keeps the package contract suitable for the later Agents SDK integration. No Express adapter or v2 migration is required for this slice. Official sources checked during implementation:

- [SDK v1 server, stateless transport, and structured results](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/docs/server.md)
- [WebStandardStreamableHTTPServerTransport source](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/src/server/webStandardStreamableHttp.ts)
- [SDK low-level Server](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/src/server/index.ts)
- [MCP Streamable HTTP specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [Next.js Web Request/Response route handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) and [GET Form pending/navigation behavior](https://nextjs.org/docs/app/api-reference/components/form)
- [Supabase getUser token verification](https://supabase.com/docs/reference/javascript/auth-getuser), [RPC](https://supabase.com/docs/reference/javascript/rpc), and [invoker database functions](https://supabase.com/docs/guides/database/functions)

Ticket 03 also adds `get_reader_profile` and `update_reader_profile`, sharing profile services with the manual editor. The MCP fetch deadline now also observes request cancellation; a cancelled write can still commit. See [chat/profile contracts](08-agent-chat-memory.md).

Ticket 04 adds `calculate_reading_plan` (read-only), `save_reading_plan` (explicit persisted save), and `list_reading_plans` (read-only). Their schemas/services and owner-derived auth reuse this transport; see [reading-plans contracts](09-reading-plans.md).
