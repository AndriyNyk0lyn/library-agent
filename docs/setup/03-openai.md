# 3. OpenAI API setup

Official documentation checked: 2026-10-03. This repository has no runnable application yet. These steps prepare your account; the application checkpoint waits for implementation. No account, key, billing setting, or API request was created during this research.

## Prepare your account

1. Sign in to the [OpenAI API dashboard](https://platform.openai.com/). Check the organization selected in the dashboard. In its project settings, create a project named Reading Companion, or select an existing project you intend to use. Keep its name/ID in your password manager or private setup notes.
2. Open Billing in that API organization. Review the payment method, available credits, and usage limits before enabling paid use. This application's planned integration uses an API project key and API billing. A ChatGPT subscription is not the credential used here. OpenAI also documents a separate [Sign in with ChatGPT integration](https://developers.openai.com/siwc/quickstart); that is outside this MVP.
3. In the project's Limits settings, select a monthly amount you are comfortable spending. Add a spend alert. If you want traffic to stop at the limit, select **Enforce a hard limit** if available to your account, then save. Alerts alone do not stop requests; hard-limit enforcement can lag slightly. See [spend limits](https://developers.openai.com/api/docs/guides/spend-limits). Do not enable automatic credit replenishment without choosing a budget deliberately.
4. Open API Keys for the selected project and create a dedicated key. Give it a descriptive name, choose the permissions the implemented application needs, and set an expiry/rotation reminder. Save the secret directly in a password manager. Do not paste it into chat, tickets, screenshots, or a tracked file. See [key and project guidance](https://developers.openai.com/api/docs/guides/production-best-practices).
5. Select a text model available to your project that supports tool calling and the chosen Agents SDK provider. Compare its [documented capabilities](https://developers.openai.com/api/docs/models) and [current pricing](https://developers.openai.com/api/docs/pricing). Record the exact model ID, not a marketing name. No model has been selected or account access verified for this project.

**Checkpoint:** you know the intended API project, have stored its key privately, and have chosen a model and spending controls. A dashboard key alone does not prove model access or sufficient credit.

## Configure the app after scaffolding

1. Follow [local development](01-local-development.md). Copy the checked-in `.env.example` to the ignored `.env.local` when configuring the scaffolded app.
2. Fill in `OPENAI_API_KEY` with your project key and `OPENAI_MODEL` with your chosen exact model ID. Both belong on the server. Never prefix the API key with `NEXT_PUBLIC_`.
3. Implementation must explicitly wire `OPENAI_MODEL` into agent configuration. It is this project's configuration contract, not a promise that every SDK automatically reads it. Use the TypeScript [Agents SDK](https://developers.openai.com/api/docs/guides/agents/sdk); do not substitute the separately documented managed Agents API.
4. Before running real private-library prompts, ensure sensitive trace capture is disabled in code with `traceIncludeSensitiveData: false`, or tracing is disabled entirely until safe tracing is verified. Review [SDK tracing](https://openai.github.io/openai-agents-js/guides/tracing/). Safe tool-event summaries in the app remain useful even when provider tracing is disabled.
5. Once a real verification command is implemented and documented, run one small paid smoke request using harmless test data. Confirm its project/model, successful response, recorded usage, and honest error state. Then test a real tool request against your own test account. The current scaffold has no OpenAI verification command or integration.

**Checkpoint:** the configured model responds from the server, library retrieval crosses the real authenticated MCP endpoint, and no key or access token appears in browser assets or logs. Record the date, model, and result without the secret.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Authentication error | Correct API project key, expiry, permissions, and server environment; restart local server after changes. |
| Model unavailable | Exact model ID and that project's access. Change configuration deliberately; do not silently fall back. |
| HTTP 429 | Read the error code: rate limits, credit exhaustion, and spend limits need different remedies. See [spend-limit recovery](https://developers.openai.com/api/docs/guides/spend-limits). |
| Works locally, fails hosted | Production environment scope, redeployment, server-only key loading, and MCP reachability. Continue with [deployment](04-deployment.md). |
| Private content appears in traces | Disable sensitive capture or tracing, remove private custom metadata/logging, and repeat using test data. Disabling tracing does not prevent prompts from reaching the model. |

Next: [deployment and hosted MCP verification](04-deployment.md).
