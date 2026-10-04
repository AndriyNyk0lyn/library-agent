# Service setup prerequisites

Research ticket: [Verify service setup prerequisites](../../.scratch/reading-companion/issues/01-service-setup.md). Checked: 2026-10-03. Primary documentation only.

## Findings

- Next.js requires Node 20.9 or newer. The parent session observed Node v24.13.0/npm11.6.2, meeting that minimum; compatibility of the future dependency set remains untested. [Installation](https://nextjs.org/docs/app/getting-started/installation).
- Supabase projects can be created through the dashboard independently of app code. [Next.js quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs).
- Publishable keys accompany user authentication; elevated secret keys bypass RLS and are inappropriate for the planned user-scoped CRUD path. [Keys](https://supabase.com/docs/guides/getting-started/api-keys).
- Hosted email auth defaults to confirmation; SSR requires the appropriate PKCE flow. [Password auth](https://supabase.com/docs/guides/auth/passwords).
- Site URL and allowed destinations control auth redirects; actual confirmation/reset paths must come from implemented handlers. [Redirects](https://supabase.com/docs/guides/auth/redirect-urls).
- Default SMTP is restricted testing infrastructure. A production signup flow needs custom delivery configuration. [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
- SSR clients use cookie refresh and verified identity. Session data alone does not authorize private access. [SSR](https://supabase.com/docs/guides/auth/server-side/nextjs).
- Schema changes belong in SQL migration files. CLI local testing requires a container runtime. [Migrations](https://supabase.com/docs/guides/deployment/database-migrations), [CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).
- RLS must restrict private rows to authenticated owners, checking both existing and resulting ownership on updates. [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Outcome

Use [local preparation](../setup/01-local-development.md) followed by [Supabase preparation](../setup/02-supabase.md). Account configuration can begin now. App scripts, environment validation, auth routes/templates, schema/RLS migrations, and user isolation checks require implementation. No accounts, billable services, app, or database were provisioned in this research task.

At the time of this research, the repo contained documentation only and was not a Git checkout. The wayfinder research-branch convention cannot be followed until version control exists; the findings are saved directly with ticket pointers instead. No Git repository was initialized to work around that limitation.

## Remaining implementation gates

Resolve schema/import semantics and MCP identity propagation; scaffold the app without replacing guidance; pin compatible packages; implement auth handlers and migrations; perform two-user tests with user-scoped clients and a real hosted transport. Provider costs, account permissions, email delivery, and production behavior have not been tested. Recheck service docs when implementation starts because APIs and dashboard labels can change.
