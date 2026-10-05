# Reading Companion

A hosted personal book librarian and next-read planner, built around an authenticated library and one agent using a custom MCP server.

## Current status

The app implements Supabase cookie authentication, confirmation/password recovery, and private book creation/listing, title/author search with status/ownership filters, and a stateless bearer-authenticated MCP read endpoint. The user reports first-library setup steps 1–5 complete, including email configuration, migration application, and saving/reloading a book. Real two-account isolation remains unverified. Goodreads preview/confirmed import, book details/editing, and durable versioned MCP updates are also implemented. Agent chat, explicit profile preferences, grounded recommendation cards, durable SDK continuation and database-backed run limits are implemented. Validated reading-plan preview/saving/listing and structured chat plan results are implemented. Separate saved conversations, stable chat links and paginated display history are implemented. Catalog discovery and deployment remain future work. Migration application and UI/MCP/model behavior require user verification.

The [agent/MCP maintainability refactor](.scratch/chat-history-maintainability/issues/01-agent-mcp-refactor.md) is implemented and independently reviewed, with preserved contracts and static checks; runtime QA remains unverified. Separate saved conversations and paginated history are implemented in [History 02](.scratch/chat-history-maintainability/issues/02-chat-history.md); its new migration and runtime QA remain unverified. Continue with ticket 05, hosted showcase and handoff, in the [approved showcase tickets](.scratch/showcase-mvp/README.md). See [library search and MCP setup](docs/setup/06-library-search-mcp.md) for its migration and client contracts. [Import/edit setup and contracts](docs/setup/07-import-library-management.md) describes the next migration. [Agent chat/memory setup](docs/setup/08-agent-chat-memory.md) covers the new migration, model configuration and recovery contract. [Reading-plans setup](docs/setup/09-reading-plans.md) covers the next migration, deterministic calculations and retry contracts. [First-library setup](docs/setup/05-first-library.md) remains the setup reference.

Setup targets a controlled showcase prototype: one Supabase project, its default email sender, and one hosted app when MCP is ready. Custom SMTP, custom domains, extra environments, and operational services are not prerequisites.

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
- [Library search and authenticated MCP](docs/setup/06-library-search-mcp.md)
- [Verification and showcase checklist](docs/verification.md)
- [Import and library management](docs/setup/07-import-library-management.md)
- [Agent chat and persistent memory](docs/setup/08-agent-chat-memory.md)
- [Reading plans](docs/setup/09-reading-plans.md)
- [Separate conversations and chat history](docs/setup/10-chat-history.md)
- [Domain glossary](CONTEXT.md)
- [Agent development instructions](AGENTS.md)
- [Issue tracker conventions](docs/agents/issue-tracker.md)

## Scope

Next.js App Router, TypeScript, Supabase database/auth, OpenAI Agents SDK for TypeScript, and a custom authenticated MCP endpoint. Goodreads CSV import, library editing, grounded recommendations, and validated reading plans form the MVP.

No Obsidian or Hardcover sync, multiple runtime agents, embeddings, full-book analysis, or premature UI redesign. Development research agents do not imply a multi-agent application.

This folder is the project root and a Git checkout. Hosted deployment remains unverified. Local tracker files belong in version control rather than an ignored scratch directory.
