# 4. Deployment and hosted MCP verification

Official documentation checked: 2026-10-03. Proposed host: Vercel, for one Next.js application. This is a guide for a future deployment; no project, URL, build, or hosted transport has been verified. Complete [Supabase](02-supabase.md) and [OpenAI](03-openai.md) preparation first.

## Before deployment

1. Wait for a runnable app with a committed lockfile, real migrations/RLS, and the documented build and verification commands. This folder currently has no Git repository or package manifest. Choose your remote and establish version control before using Vercel's Git integration; do not publish secrets or personal CSVs.
2. Verify local sign-in and one user-scoped library operation. Apply the project's actual reviewed migrations using the procedure implementation documents. There are no migration files or migration commands to run yet.
3. Prove the chosen SDK transport locally. Pin compatible Next.js, Agents SDK, and MCP SDK versions; record the negotiated MCP protocol revision. Use Node.js handlers for chat and `/api/mcp`. A Node HTTP example is not automatically a Next.js route handler: verify the installed MCP SDK's Web Request/Response adapter or a small tested bridge before deployment. See [MCP SDK](https://ts.sdk.modelcontextprotocol.io/) and [Agents SDK MCP](https://openai.github.io/openai-agents-js/guides/mcp/).

## Configure Vercel

1. Sign in to [Vercel](https://vercel.com/), choose the intended personal/team workspace, and review the applicable plan and usage controls. When ready to deploy, use **Add New → Project** and import your repository. Select Next.js and the `library-agent` project root. Use the real package scripts and lockfile; avoid speculative command overrides. See [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs).
2. In **Settings → Environment Variables**, configure the following for the intended deployment scope. Keep Preview and Production values distinct when they use different backends. See [environment scopes](https://vercel.com/docs/environment-variables).

   | Variable | Value | Exposure |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL of your chosen Supabase project | Browser-visible |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Its publishable key | Browser-visible; requires RLS |
   | `OPENAI_API_KEY` | Your dedicated API project secret | Server only |
   | `OPENAI_MODEL` | Chosen exact model ID | Server configuration |
   | `APP_BASE_URL` | Trusted app origin, such as your actual `https://…vercel.app` domain | Server configuration |

   Derive the MCP URL from `APP_BASE_URL` plus `/api/mcp`. Do not configure a second independently maintained MCP URL or accept the destination from an untrusted Host header. Use the assigned project domain shown by Vercel; no example URL here is a real deployment. If its origin is not known until the first deployment, add the correct value afterward and redeploy before chat verification.
3. In the app, set function duration within your plan/runtime's supported range. Set an application deadline below it, allowing time for final persistence and cleanup. Bound model turns, upstream requests, and retries separately. Vercel's duration covers streaming too; sending events does not grant unlimited time. Check the [current limits](https://vercel.com/docs/functions/limitations), rather than copying a timeout from an old tutorial.
4. Inspect **Settings → Deployment Protection**. An authenticated browser reaching a preview does not prove a server-side MCP client can reach it. Prefer the intended accessible production origin while retaining app token authentication. If testing requires a protected preview, deliberately configure [Protection Bypass for Automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation): keep its secret server-side and send `x-vercel-protection-bypass` on internal MCP requests alongside the user's Authorization header. This is conditional infrastructure configuration, not a required baseline app secret. Never put a bypass secret in a URL, model input, or client code. It does not replace app authorization.
5. Deploy. Review build logs and fix actual errors. After environment changes, redeploy. Update Supabase's Site URL and allowed redirect URLs to match the exact deployed origin and implemented callback path; follow [Supabase setup](02-supabase.md).

**Checkpoint:** the actual deployed origin serves the app, sign-in returns to it, and the server has the correct scoped configuration. Do not declare completion yet.

## Prove the real hosted integration

Use two disposable test accounts and harmless books. Use the installed SDK's client or the implementation's documented smoke command; none exists yet.

1. Call `/api/mcp` without a token and with an invalid/expired token. Confirm rejection without private data.
2. With account A, establish the connection, discover tools, and call one library search over HTTPS. For SDKs using the earlier connection protocol this is initialize → list tools → call tool. The current MCP specification has revised per-request semantics, so record which compatible revision the installed SDK actually uses; see [transport/version compatibility](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports).
3. Run agent chat as A. Verify the server uses A's validated access token on the actual MCP HTTP requests, not a public key, service-role token, or direct service shortcut. Confirm the tool returns only A's books.
4. Make one requested update, refresh, and verify persistence. As B, attempt to read/update A's book and create a plan referencing it; confirm rejection. Repeat read isolation through direct user-scoped database access.
5. Force an upstream error or deadline in a controlled test. Confirm a failed/uncertain result is visible and a reconnect does not duplicate a write. Verify no authenticated MCP connection or user context is reused across accounts.
6. Refresh chat and continue a conversation that previously used a tool. Confirm persisted SDK continuation preserves it. Check private trace settings, safe activity summaries, and server logs for secret leakage.
7. Record the real domain, SDK/protocol versions, date, tests, outcomes, and any gaps in the project's verification record. Only then label hosted MCP support verified.

## Troubleshooting

| Failure | Next check |
| --- | --- |
| MCP returns HTML/login redirect | Wrong origin or Vercel protection blocked the internal request. Confirm server-side reachability before investigating JSON schemas. |
| MCP returns 401 | Valid current user access token, validation and forwarding on every request; refresh/re-authenticate appropriately. |
| 404/405/protocol error | Correct `/api/mcp` path, deployed handler, adapter, supported methods, content types, and protocol revision. |
| Hosting 504 | Runtime duration and application deadline; inspect latency and bounded retries. Do not replay uncertain writes blindly. |
| Missing conversation after refresh | Durable continuation storage and ownership lookup; process memory is not persistence. |
| Login returns to localhost | Supabase Site URL, redirect allowlist, implemented callback path, and deployment environment. |

Research rationale and remaining uncertainty: [agent and hosting findings](../research/agent-hosting.md).
