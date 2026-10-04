# Setup overview

These guides explain the required accounts and the later technical setup. They do not create resources or authorize charges. Never paste API keys, database credentials, or personal CSV contents into this chat.

## What can be done now

1. Check local Node/npm and decide where version control will live using [local development](01-local-development.md).
2. Create a Supabase project, copy its URL and publishable key locally, and configure auth using [Supabase setup](02-supabase.md).
3. Create an OpenAI API project/key and check model access and billing using [OpenAI setup](03-openai.md).
4. Prepare a hosting account and repository using [deployment setup](04-deployment.md).

## What waits for implementation

The application scaffold can be installed and run now using the [local guide](01-local-development.md). Authentication, private book creation/listing, and the initial migration now exist. Complete [the first-library setup](05-first-library.md). Agent and MCP integration remain future work. Schema application, MCP calls, and deployment verification await implementation; do not guess migration filenames or create tables manually to match an unfinished app.

After implementation starts, keep setup steps aligned with the committed package scripts, lockfile, migrations, environment validation, and deployed smoke-test results.

## Credential map

| Value | Location | Browser exposure |
| --- | --- | --- |
| Supabase project URL | `.env.local` and hosting variables | Allowed |
| Supabase publishable key | `.env.local` and hosting variables | Allowed; RLS still required |
| OpenAI API key | `.env.local` and hosting variables | Never |
| Supabase user access token | Auth session and server-to-server MCP requests | Never include in logs or user-facing tool events |
| Supabase secret/service-role key | Not required by routine app/tool paths | Never |
| CLI login/database password | Local Supabase tooling when applying migrations | Never commit |

Do not treat a hosting URL or API key alone as proof of a successful setup. Complete the checkpoints in each guide and the [verification checklist](../verification.md).
