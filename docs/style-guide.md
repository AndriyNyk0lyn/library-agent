# Code and functional UI style

## Priority

Make the feature work, then make it easy to use. Visual design and redesign are later phases. Build a small, consistent interface that can be restyled without moving business logic.

## TypeScript and modules

- Use strict types, descriptive domain names, early validation, and small cohesive functions.
- Prefer inference within functions and explicit contracts at boundaries. Validate unknown external data instead of asserting its type.
- Name variables for meaning: `libraryBook`, `remainingPages`, `targetDate`. Avoid catch-all names like `data` when a domain name is available.
- Use named exports for reusable functions/components; follow framework requirements for route/page exports.
- Keep dependencies directed toward shared contracts and domain services. UI and MCP adapters do not import each other's implementation.
- Keep comments for reasons and unusual constraints. Avoid comments that merely narrate the next line or vague TODOs without a tracked issue.
- Use one formatter/linter setup after scaffolding. Do not spend the first milestone building custom lint rules.
- No `any` as an escape hatch, unchecked casts, duplicated validation, generic catch-and-continue, or disabled checks to force a build through.

## Reuse without overcomplication

Reuse behaviour that has the same purpose and contract. Two identical mutation implementations should become one shared service. A shared form control should support the interactions its actual callers need, not every conceivable future screen.

Prefer composition over giant components with many mode flags. Keep page orchestration separate from calculation and persistence. Do not turn a two-line expression into a helper merely to claim deduplication; extract when it gives a meaningful name or prevents rule drift.

Before adding something new, search for an existing equivalent. Do not create a second toast, modal, date parser, status mapping, or Supabase client factory because the feature lives in a different folder.

## Minimal UI rules

- Use semantic HTML and normal Next.js navigation. Buttons perform actions; links navigate.
- Keep one clear primary action per task. Prefer visible labels over icon-only controls.
- Use readable text, a consistent small spacing scale, and a simple responsive layout. No decorative dashboards, hero sections, gradients, fake charts, or animation frameworks for routine library work.
- Select a few tokens for spacing, typography, colours, borders, and focus. Feature logic must not depend on colours or layout.
- Use established accessible primitives for dialogs and complex controls only when needed. Plain native inputs are sufficient for simple forms.
- Preserve keyboard use, visible focus, labelled inputs, adequate contrast, and announced errors. Function-first includes accessibility.
- Show meaningful book identity: title and author, with edition detail when it disambiguates. Do not require a cover to use a record.
- Keep private reviews and notes readable without forcing a rich-text editor into the MVP.

## State and feedback

| Situation | Required behaviour |
| --- | --- |
| Empty library | Explain the state and offer import/manual add |
| Loading | Show which operation is running; prevent repeated submit for that operation |
| Validation error | Explain the field or constraint and retain useful entered input |
| Save succeeds | Show confirmed persistence and refresh affected records |
| Save fails | Keep the user's input and provide a specific retry path where safe |
| Stale record | Explain the conflict and offer the current version before another write |
| Import partly fails | Show real counts and row-level problems |
| Catalog unavailable | Keep existing library operations usable |
| Agent run disconnects | Show uncertain status honestly; do not resubmit a mutation automatically |
| Missing plan inputs | Ask for the missing information; do not invent page counts or speed |

Use normal React state and server fetching first. Avoid duplicate copies of the same record state and unnecessary optimistic updates for complex or uncertain writes.

## Copy

Write short, direct, concrete labels: “Import Goodreads CSV”, “Save rating”, “Try again”. State what happened and how to recover. No marketing filler, fake personalization, unexplained technical errors, or claims that a prediction is certain.

Tool activity describes user-relevant actions such as “Reading your unread shelf”. Keep implementation payloads, credentials, and hidden reasoning out of the UI.

## Before finishing a change

Check existing reuse, domain naming, input validation, ownership, persistence, error states, keyboard interaction, and appropriate verification. Do not add unrelated cleanup or create tests that simply repeat the implementation. Keep a future redesign possible through shared primitives and tokens rather than a speculative theme system.
