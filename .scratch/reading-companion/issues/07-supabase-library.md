# Connect Supabase authentication and private book storage

Parent: ../map.md
Type: task
Labels: wayfinder:task
Status: resolved
Assignee: root
Triage: ready-for-agent
Blocked by: 06

## Scope

User completed project setup steps 1–3 and `.env.local`, and chose the default Supabase email sender for now. Implement server-verified cookie auth, signup/confirmation/sign-in/sign-out/password recovery, and manual book creation/listing with RLS. Supply the migration and exact remaining dashboard/CLI steps. Do not provision SMTP or silently apply changes to an unverified remote target. MCP and import remain subsequent steps.

## Acceptance

- Private pages and writes verify identity independently; browser-provided ownership is ignored.
- Database policies enforce owner-only reads and inserts; other operations remain denied until implemented.
- Form errors retain book input; retrying an uncertain creation uses the same ID without duplicating a book.
- Setup docs include actual email templates, callback paths, and migration commands.
- Report local checks separately from hosted persistence and two-user verification.

## Comments

### 2026-10-03 — Resolution

Implemented Supabase cookie sessions, confirmation/recovery/resend flows, sign-in/out, private book creation/listing, a reviewed CLI-generated migration, and shared form controls. Supabase Auth connectivity verified read-only. Lint/typecheck/format/build and 21 tests passed; see [verification](../../../docs/verification.md). User chose to defer custom SMTP. No hosted schema or account was changed; remaining email-template and migration instructions are concrete in [first-library setup](../../../docs/setup/05-first-library.md). Real email delivery, hosted persistence, and two-user isolation still require that setup and live tests.
