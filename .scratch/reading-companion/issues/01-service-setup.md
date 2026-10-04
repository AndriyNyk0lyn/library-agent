# Verify service setup prerequisites

Parent: ../map.md
Type: research
Labels: wayfinder:research
Status: resolved
Assignee: service_setup
Triage: ready-for-agent
Blocked by:

## Question

What are the current supported prerequisites and concrete steps for local Next.js development and a Supabase database/email-password auth project, including keys, SSR identity verification, redirect URLs, migrations, RLS, and production email setup? Which steps can the user perform now, and which require the future app code?

Record official sources, date checked, limitations, checkpoints, and troubleshooting. Write the ordered local/Supabase guides and link research findings; do not create accounts or invent migrations.

## Comments

### Resolution — 2026-10-03 — service_setup

Verified official Next.js and Supabase prerequisites. Node's observed version meets Next.js's current minimum; project/auth account configuration is possible before app code. Actual auth handlers, cookie refresh, migrations, RLS, and isolation remain implementation gates. Added [local preparation](../../../docs/setup/01-local-development.md), [Supabase setup](../../../docs/setup/02-supabase.md), and the [research record](../../../docs/research/service-setup.md) with sources and checkpoints. No provisioning or app checks performed. No Git repository exists, so no research branch was created.
