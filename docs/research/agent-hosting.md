# OpenAI agent and hosting findings

Research date: 2026-10-03. Scope: resolve documented setup requirements for one Next.js app, one TypeScript Agents SDK agent, and a first-party authenticated MCP endpoint. This is source research, not deployment evidence. No API keys were accessed, paid requests sent, resources provisioned, or application code run. No research branch could be created because this folder is not a Git repository.

## Findings

### OpenAI configuration

Project keys and server environment storage are documented. API access requires the chosen project's permissions, model access, and billing/credit readiness; [production guidance](https://developers.openai.com/api/docs/guides/production-best-practices) covers separate staging projects, key governance, and rotation. Setup must use the owner's actual dashboard, not claim those permissions have been verified.

The planned key-based integration uses API billing. [Sign in with ChatGPT](https://developers.openai.com/siwc/quickstart) is a separate supported integration with separate scopes; it is not implemented or required here. `OPENAI_MODEL` is an app-owned configurable setting. Select and check a tool-capable model from [models](https://developers.openai.com/api/docs/models) and [pricing](https://developers.openai.com/api/docs/pricing) during implementation; there is no locked model decision yet.

[Spend limits](https://developers.openai.com/api/docs/guides/spend-limits) distinguish notification alerts from enforced organization/project limits. Enforcement can lag and credit/rate-limit errors have separate causes. The guide therefore asks the owner to choose alerts and hard-limit enforcement deliberately.

### Runtime MCP and authentication

The [Agents SDK MCP guide](https://openai.github.io/openai-agents-js/guides/mcp/) documents `MCPServerStreamableHttp`, `requestInit`, per-request timeout configuration, and connect/close lifecycle. This provides the documented mechanism for the app server to send a user bearer credential to its own HTTPS endpoint. Use a fresh authenticated client per run; do not share a connection bearing one user's token with others. Credential forwarding remains an implementation task, not something this research tested.

The [MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/) documents stateless Streamable HTTP and JSON response examples. Pin a version compatible with the Agents SDK and validate its Next.js adapter. Do not copy a Node `IncomingMessage`/`ServerResponse` example into a Web Request/Response handler without a tested bridge.

There is protocol-version drift: [current transport documentation](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports) describes per-request metadata, while earlier versions use initialization sessions. The hosted smoke test must record the installed pair's negotiated revision and exercise its real discovery/call sequence. Reading the latest specification alone does not prove SDK interoperability.

The PRD specifies Supabase user tokens for this controlled first-party integration. Validate the issuer, expiry, applicable audience, and user identity server-side; use that user's scoped database access. This does not establish general MCP OAuth support. [MCP authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) defines a broader OAuth resource-server flow and token validation requirements. Third-party client interoperability would need its own deliberate design and verification.

### Continuation and tracing

[Running agents](https://openai.github.io/openai-agents-js/guides/running-agents/) documents manual `result.history`, SDK sessions, and Responses-managed continuation as alternatives. Choose one strategy per conversation. The same guide documents `maxTurns` and cancellation via `signal`; a turn count alone is not a wall-clock deadline. Store continuation durably under a verified user; final visible text is insufficient for reconstructing every tool exchange. The exact persistence format and retention decision stays in the open chat-continuation ticket.

[Tracing](https://openai.github.io/openai-agents-js/guides/tracing/) is enabled by default in supported server runtimes and can capture generation/tool inputs and outputs. Use `traceIncludeSensitiveData: false` or disable tracing, redact custom metadata, and inspect the result. Trace export lifecycle also needs checking on a short-lived host; SDK flush support exists, but a reliable Vercel export has not been demonstrated. Safe UI tool summaries are separate from provider traces and hidden reasoning.

### Host constraints

[Vercel supports Next.js](https://vercel.com/docs/frameworks/full-stack/nextjs). [Environment variables](https://vercel.com/docs/environment-variables) are deployment-scoped; align Preview/Production backends and redeploy after changes. Use a configured trusted app origin for MCP self-calls.

[Function limits](https://vercel.com/docs/functions/limitations) depend on plan/runtime/configuration. Request duration includes streaming and may end in a hosting timeout. Keep total run, model/tool timeouts, and retries within a smaller application deadline; reserve time to store results and close resources. This research does not select a paid plan or prove a particular execution budget.

[Deployment protection bypass](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) supports an automation header. A protected preview may block internal HTTP MCP calls even when browser access works. Only add a server-held bypass secret if that protected testing environment needs it. Keep app bearer authentication in place and verify that the request reaches the MCP handler.

## Resolution and remaining evidence

The account preparation and ordered deployment requirements are documented in [OpenAI setup](../setup/03-openai.md) and [deployment setup](../setup/04-deployment.md). Proceed with a single Node.js Next.js deployment as the proposed implementation path, subject to an early hosted transport spike. A failed spike should lead to a documented, minimal architecture adjustment, not a silent in-process MCP replacement.

Before implementation can claim compatibility, prove: the pinned SDK/protocol pair and Next.js adapter; real hosted authenticated discovery/call; two-user isolation; deadline and retry behaviour; persisted continuation; and trace privacy/export. Account permissions, model access, spend controls, hosting plan, auth redirect paths, real URLs, and passing checks remain unverified.
