# 01 — Prepare local development

Checked against official documentation on 2026-10-03. The Next.js / TypeScript / Tailwind scaffold now exists with a committed npm lockfile. The auth/library integration and initial migration now exist. Follow [first-library setup](05-first-library.md) to configure your environment and apply the migration.

## 1. Open the project

Open Terminal and run:

```sh
cd /Users/andriynykolyn/Documents/SideProjects/library-agent
pwd
```

The printed path should end in `SideProjects/library-agent`. Open that folder in your editor. Keep the application here; do not create a nested `library-agent/library-agent` project.

## 2. Check Node and npm

```sh
node --version
npm --version
```

The initial environment inspection reported Node `v24.13.0` and npm `11.6.2`. Next.js currently requires Node **20.9 or later**, so that Node version meets its minimum. Prefer a supported Node LTS release and use the same major release locally and on the host. If either command is missing, install Node LTS from the [official Node download page](https://nodejs.org/en/download), reopen Terminal, and repeat these checks. [Next.js system requirements](https://nextjs.org/docs/app/getting-started/installation#system-requirements).

Use npm for this single application unless a later decision changes it. Once code exists, commit one npm lockfile and avoid mixing package managers.

## 3. Prepare source control

```sh
git --version
```

This folder has no Git repository yet. Choose a private or public remote before sharing or deployment. When initialization is authorized, include the documentation and `.scratch/` tracker in source control; exclude secrets and generated files. A public remote must never include personal Goodreads exports, account tokens, or private reading notes.

## 4. Prepare accounts

Follow [Supabase setup](02-supabase.md) and [OpenAI setup](03-openai.md). Store credentials in a password manager. Do not paste secret values into chat or tracker tickets. The current scaffold runs independently of these accounts. OpenAI is only needed when chat is implemented.

## 5. Install and run

From the project root:

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000), or the URL printed by the development server if that port is occupied. `/` redirects to `/library`. Use the navigation to open `/setup`.

Auth/library routes now need `.env.local` with your Supabase URL, publishable key, and trusted `APP_BASE_URL`. OpenAI is not needed yet. Follow [first-library setup](05-first-library.md) for email templates and migration application.

## 6. Check the scaffold

```sh
npm run lint
npm run typecheck
npm run build
```

ESLint and TypeScript run separately from the production build. `npm run test` verifies book input, retry recovery, cookies, and the initial migration/RLS in embedded PostgreSQL. Run `npm run format:check` to check formatting. The typecheck script generates Next.js route types before running TypeScript, so it also works on a fresh installation before a build.

To run the built app:

```sh
npm run start
```

Stop the server with Ctrl+C. Keep existing `AGENTS.md` and `CLAUDE.md` when upgrading or using generators. [Next.js installation](https://nextjs.org/docs/app/getting-started/installation) and [Tailwind PostCSS setup](https://tailwindcss.com/docs/installation/using-postcss) describe the underlying configuration.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| `node: command not found` | Install Node LTS, reopen Terminal, check again. |
| `npm` cannot find `package.json` | Check that you are in the project root. |
| Wrong folder in `pwd` | Repeat the `cd` step before any installation. |
| Generator refuses a populated folder | Preserve these docs; let the implementer scaffold safely and merge generated files. |
| Environment changes seem ignored later | Restart the dev process after editing `.env.local`. |

The local scaffold is ready when installation, checks, and page navigation work. Authentication, saved books, and deployment still require their own verification. See the [research record](../research/service-setup.md).
