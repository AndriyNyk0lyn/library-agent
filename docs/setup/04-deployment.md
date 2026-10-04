# 4. Host the MCP showcase

Deploy one Next.js app to Vercel using its assigned domain. Do this for the first MCP milestone after local sign-in, book persistence, and one authenticated MCP tool work. Library/profile MCP tools and agent chat routes are implemented. Apply the [chat/memory migration and setup](08-agent-chat-memory.md), and confirm the host supports the configured 90-second chat duration. Apply the [library search migration and client setup](06-library-search-mcp.md) before verifying MCP. No hosted app has been verified.

## Minimal deployment

1. Put the project in a Git repository and push it to your chosen remote. Exclude `.env.local` and private CSVs.
2. In [Vercel](https://vercel.com/), import that repository as a Next.js project. Use the folder containing `package.json` as the root, Node 24, and the existing npm lockfile/scripts. [Next.js deployment guide](https://vercel.com/docs/frameworks/full-stack/nextjs).
3. Add the environment values:

   | Variable                               | Value                                   |
   | -------------------------------------- | --------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`             | Existing project URL                    |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Existing publishable key                |
   | `APP_BASE_URL`                         | The app's actual HTTPS hosting origin   |
   | `OPENAI_API_KEY`                       | Server-only API key, required for /chat |
   | `OPENAI_MODEL`                         | Selected model ID, required for /chat   |

4. Deploy. If the domain is only known afterward, update `APP_BASE_URL` and redeploy. Environment changes require a new deployment.
5. In Supabase, set Site URL to that same origin and allow its exact `/auth/confirm` URL. Keep the templates from [First working library](05-first-library.md). Reuse the confirmed demo account.
6. Use a deployment reachable by server-side MCP calls. If MCP receives a hosting login page, check Deployment Protection for that demo deployment. App authentication remains required. Preview bypass automation is outside this setup path.

Use the existing Supabase project. With the current Site URL templates, local email links and hosted email links use whichever origin is configured; switch it deliberately when needed.

## What the implementer must verify

- Node.js MCP and agent handlers, compatible installed SDKs, and real HTTP calls to `APP_BASE_URL` + `/api/mcp`.
- A total agent deadline below the host's function duration, with bounded turns/revisions and honest errors.
- Missing/invalid tokens rejected; authenticated tool discovery and library search succeed.
- Two accounts cannot read/update each other's books through MCP or direct database access.
- Agent recommendations use real eligible books; requested updates and validated plans persist after refresh.
- Chat memory reloads, tool activity is visible, and reconnecting does not repeat writes.

Run the available checks for each milestone; record results in [verification](../verification.md). Do not claim the full showcase works after only deploying the library. Use the client contract and manual steps in [library search and MCP setup](06-library-search-mcp.md); no automatic transport smoke suite is provided.

No custom domain, extra backend, CI pipeline, preview environments, or monitoring service is required.
