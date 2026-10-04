# Showcase MVP setup

Use one Supabase project, one local Next.js app, and one OpenAI API key when agent work starts. Add one hosted app for the MCP showcase. No extra infrastructure is needed.

## Do now

Your Supabase project and `.env.local` are already created by your report. Auth and private book creation/listing are implemented; hosted migration and real-account checks remain unverified.

1. Follow [First working library](05-first-library.md): finish confirmation settings, apply the migration, sign in, and save one book.
2. Apply and manually verify [library search/MCP](06-library-search-mcp.md) and [import/library management](07-import-library-management.md). Verify authorization and account isolation.
3. Apply the [chat/profile migration](08-agent-chat-memory.md), configure [OpenAI](03-openai.md), and manually verify recommendations, explicit memory and run recovery.
4. Apply and manually verify [reading plans](09-reading-plans.md), including deterministic rejection, explicit saves, refresh and retry recovery.
5. Follow [Showcase hosting](04-deployment.md) for the first hosted MCP milestone, before expanding to all tools.
6. Continue ticket 05 for hosted showcase preparation and handoff.

[Local development](01-local-development.md) covers installation and checks. [Supabase setup](02-supabase.md) is the reference if you need to revisit project configuration.

## Skip for this prototype

Custom SMTP and email domains, custom app domains, separate staging/production projects, preview protection bypass setup, Docker-based local Supabase, CI/CD pipelines, analytics, and extra monitoring services are not setup requirements. Use the default email sender and a provider-assigned hosting URL.

Keep authentication, RLS, server-only secrets, real persistence, bounded agent execution, and retry safety. These support the showcase's actual features and account isolation.

## Credentials

| Value                                           | Where it belongs                                    |
| ----------------------------------------------- | --------------------------------------------------- |
| Supabase URL and publishable key                | `.env.local`; hosting variables when deploying      |
| `APP_BASE_URL`                                  | Local app origin; hosted app origin when deploying  |
| OpenAI key and model ID                         | Server environment; needed when chat is implemented |
| Scoped Supabase CLI token and database password | Terminal only while applying migrations             |

No service-role key is needed for the app. Never commit secrets or private Goodreads exports. These guides do not provision resources or change billing settings. Record real results in [verification](../verification.md).
