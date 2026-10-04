# Domain docs

This project uses a single context.

## Before exploring

Read root `CONTEXT.md` and any relevant decisions in `docs/adr/`. If either is absent, proceed without creating placeholder documentation.

## Vocabulary

Use the canonical terms in `CONTEXT.md` in code, issues, and explanations. The context file is a domain glossary, not an implementation spec. Add a definition when a term is actually settled.

## Decisions

Create an ADR only for a consequential, hard-to-reverse trade-off whose reasoning would surprise a future maintainer. Flag conflicts with existing ADRs explicitly instead of silently overriding them. No context map or per-package contexts are needed.
