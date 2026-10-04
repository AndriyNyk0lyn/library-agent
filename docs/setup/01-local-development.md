# 1. Run locally

## Install

Use Node 24, matching `.nvmrc` and `package.json`. From Terminal:

```sh
cd /Users/andriynykolyn/Documents/SideProjects/library-agent
node --version
npm ci
```

If Node is missing, install Node 24 from the [official download page](https://nodejs.org/en/download). Use npm and the existing lockfile.

## Configure and start

Your `.env.local` already exists. It needs the Supabase URL, publishable key, and:

```dotenv
APP_BASE_URL=http://localhost:3000
```

OpenAI is required only for `/chat`; see [chat/memory setup](08-agent-chat-memory.md) for its migration and existing key/model variables. Follow [First working library](05-first-library.md) for the remaining auth and database steps.

```sh
npm run dev
```

Open [localhost:3000](http://localhost:3000). Keep port 3000 available so confirmation links match the app. Restart the server after changing `.env.local`; stop it with Ctrl+C.

## Development checks

```sh
npm run lint
npm run typecheck
npm run test
npm run format:check
npm run build
```

These are developer checks, not steps to repeat before every demo. Tests use embedded PostgreSQL and mocks; they do not prove hosted persistence. Docker is not required. To run the completed build, stop the dev server and run `npm run start`.

## Troubleshooting

| Problem                       | Action                                                    |
| ----------------------------- | --------------------------------------------------------- |
| Cannot find `package.json`    | Run the `cd` command above.                               |
| Port 3000 is occupied         | Stop the other server before testing confirmation links.  |
| Missing environment setting   | Compare variable names with `.env.example`, then restart. |
| Library reports missing table | Apply the migration in the first-library guide.           |

Source control and a remote repository are needed for the hosted Git deployment, not to run locally. Keep `.env.local` and personal CSVs out of source control.
