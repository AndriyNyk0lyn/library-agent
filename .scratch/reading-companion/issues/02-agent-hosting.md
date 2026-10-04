# Verify OpenAI and hosted MCP requirements

Parent: ../map.md
Type: research
Labels: wayfinder:research
Status: resolved
Assignee: agent_hosting
Triage: ready-for-agent
Blocked by:

## Question

What are the current steps for OpenAI API project/key/billing setup and Vercel deployment of this single Next.js app using the Agents SDK and a first-party, stateless Streamable HTTP MCP endpoint? Verify token forwarding, host limits and deployment protection, server-only secrets, bounded execution, and SDK conversation continuation requirements.

Write the ordered OpenAI/deployment guides and research findings with official sources, dated facts, and explicit distinction between documented support and a verified deployed spike. No provisioning, billing changes, secret access, or app implementation.

## Comments

### Resolution — 2026-10-03 — agent_hosting

Verified official setup and runtime documentation; recorded the account/key/billing steps, configurable model contract, trace privacy controls, MCP bearer forwarding mechanism, stateless transport and protocol compatibility gate, continuation alternatives, Vercel duration limits, and conditional deployment-protection handling. Assets: [OpenAI setup](../../../docs/setup/03-openai.md), [deployment setup](../../../docs/setup/04-deployment.md), and [research findings](../../../docs/research/agent-hosting.md).

This resolves documentation research only. No Git repository exists, so no research branch was created. No accounts or billable resources were provisioned, credentials inspected, app implemented, API requests sent, or hosted tests run. SDK/protocol versions, model access, actual hosting limits, adapter compatibility, two-user isolation, and deployed transport remain future verification gates.
