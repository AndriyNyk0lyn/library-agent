# Reading Companion

A hosted personal book librarian and next-read planner, built around an authenticated library and one agent using a custom MCP server.

## Current status

The app implements Supabase cookie authentication, confirmation/password recovery, and private book creation/listing. The migration is written and tested locally; applying it and finishing email templates on your hosted project remain manual setup steps. Goodreads import, editing, agent, MCP, and deployment remain future work.

Follow [Connect the first working library](docs/setup/05-first-library.md) to finish the remaining setup.

## Run locally

Use Node 24 (`.nvmrc`) and npm:

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Auth and library routes require the Supabase values and `APP_BASE_URL` in `.env.local`. Follow the [local development guide](docs/setup/01-local-development.md) for checks and troubleshooting.

```sh
npm run lint
npm run typecheck
npm run test
npm run format:check
npm run build
```

Tests cover book input, retry recovery, session-cookie propagation, and the actual migration/RLS in embedded PostgreSQL. Hosted persistence and two-user Auth/PostgREST checks still need verification.

## Start here

1. Follow the [setup overview](docs/setup/README.md).
2. Read the [MVP requirements](docs/product/mvp-prd.md) and [engineering guide](docs/engineering.md).
3. Use the [wayfinder map](.scratch/reading-companion/map.md) to navigate remaining decisions.
4. Follow the [style guide](docs/style-guide.md): working features first, visual redesign later.

## Documentation

- [Local development](docs/setup/01-local-development.md)
- [Supabase database and authentication](docs/setup/02-supabase.md)
- [OpenAI account and model access](docs/setup/03-openai.md)
- [Hosted deployment and MCP verification](docs/setup/04-deployment.md)
- [Verification and showcase checklist](docs/verification.md)
- [Domain glossary](CONTEXT.md)
- [Agent development instructions](AGENTS.md)
- [Issue tracker conventions](docs/agents/issue-tracker.md)

## Scope

Next.js App Router, TypeScript, Supabase database/auth, OpenAI Agents SDK for TypeScript, and a custom authenticated MCP endpoint. Goodreads CSV import, library editing, grounded recommendations, and validated reading plans form the MVP.

No Obsidian or Hardcover sync, multiple runtime agents, embeddings, full-book analysis, or premature UI redesign. Development research agents do not imply a multi-agent application.

This folder is the project root. It is not currently a Git repository. Initialize version control and choose a remote before sharing or deployment; local tracker files belong in version control rather than an ignored scratch directory.
