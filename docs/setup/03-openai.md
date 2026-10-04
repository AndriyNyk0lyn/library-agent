# 3. OpenAI for the agent

Do this before using `/chat`. Agent/MCP integration is implemented in ticket 03; paid requests, model access and runtime interoperability remain unverified. Library and profile editing do not use OpenAI. See [chat/memory setup](08-agent-chat-memory.md).

## Minimal setup

1. Open the [API dashboard](https://platform.openai.com/). Use an existing API project or create one for this app.
2. Ensure API billing has enough credit for a few test requests. Choose a small spending budget and available alerts/limits. Check usage after paid tests.
3. Create an API key for that project and put it in the existing `.env.local`:

   ```dotenv
   OPENAI_API_KEY=YOUR_SERVER_ONLY_OPENAI_API_KEY
   OPENAI_MODEL=YOUR_MODEL_ID
   ```

4. Choose an available model supporting tool calling from the [model documentation](https://developers.openai.com/api/docs/models), checking its [price](https://developers.openai.com/api/docs/pricing). The agent uses this exact ID with no default substitution. Choose a model supporting Responses API tools and structured output.
5. Restart the local app after changing environment values.

Keep the key server-only; never use a `NEXT_PUBLIC_` prefix. [API quickstart](https://developers.openai.com/api/docs/quickstart).

## First agent check

After applying the chat migration, send a small request using disposable book data. Confirm that the agent retrieves books through the authenticated MCP HTTP endpoint and returns real library records. Then verify a requested update persists. No runnable agent smoke command exists yet.

Provider tracing and sensitive SDK logging are disabled; the UI exposes only safe tool activity. Verify those privacy boundaries during your manual checks. You do not need a separate tracing service or dashboard setup.

## Troubleshooting

| Problem                | Check                                                        |
| ---------------------- | ------------------------------------------------------------ |
| Authentication failure | API project key and server environment; restart after edits. |
| Model unavailable      | Exact model ID and project access.                           |
| Rate/credit error      | Error details, API credit, and project limits.               |
| Tool cannot read books | Authenticated MCP connection and user-scoped permissions.    |

Next: [Showcase hosting](04-deployment.md). Model responses and hosted MCP remain unverified until implementation and real checks.
