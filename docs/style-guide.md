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

| Situation             | Required behaviour                                                          |
| --------------------- | --------------------------------------------------------------------------- |
| Empty library         | Explain the state and offer import/manual add                               |
| Loading               | Show which operation is running; prevent repeated submit for that operation |
| Validation error      | Explain the field or constraint and retain useful entered input             |
| Save succeeds         | Show confirmed persistence and refresh affected records                     |
| Save fails            | Keep the user's input and provide a specific retry path where safe          |
| Stale record          | Explain the conflict and offer the current version before another write     |
| Import partly fails   | Show real counts and row-level problems                                     |
| Catalog unavailable   | Keep existing library operations usable                                     |
| Agent run disconnects | Show uncertain status honestly; do not resubmit a mutation automatically    |
| Missing plan inputs   | Ask for the missing information; do not invent page counts or speed         |

Use normal React state and server fetching first. Avoid duplicate copies of the same record state and unnecessary optimistic updates for complex or uncertain writes.

## Copy

Write short, direct, concrete labels: “Import Goodreads CSV”, “Save rating”, “Try again”. State what happened and how to recover. No marketing filler, fake personalization, unexplained technical errors, or claims that a prediction is certain.

Tool activity describes user-relevant actions such as “Reading your unread shelf”. Keep implementation payloads, credentials, and hidden reasoning out of the UI.

## Before finishing a change

Check existing reuse, domain naming, input validation, ownership, persistence, error states, keyboard interaction, and appropriate verification. Do not add unrelated cleanup or create tests that simply repeat the implementation. Keep a future redesign possible through shared primitives and tokens rather than a speculative theme system.

## UI component locations and reuse

Use named component exports and direct imports. Generic controls live in
`src/components/ui`: `Input`, `Textarea`, `Select`, `Checkbox`, `Label`, and
`Button`. `InputField`, `TextareaField`, and `SelectField` compose labels, help,
errors, and controls; supply an explicit unique `id`. Field components associate
help/errors through `aria-describedby` and set `aria-invalid` for errors, while
preserving caller-provided descriptions and native control props/ref behavior.
Keep controlled `value`/`checked` and uncontrolled `defaultValue`/`defaultChecked`
usage consistent with the existing form; see the [React input reference](https://react.dev/reference/react-dom/components/input).

Use `SubmitButton` for submissions driven by `useActionState`/form actions. It
reads the enclosing form's pending state and accepts the same button props,
including intent name/value and an additional disabled condition. Forms with
explicit transition state, such as editing and importing, use `Button` with that
state. Use `variant="link"` for text actions, `TextLink` for Next.js navigation,
and `AnchorLink` for external destinations or deliberate full-page reloads.

Shared presentation includes semantic `Card`/`CardSection`/`CardListItem`,
`MetadataItem`, `Disclosure`/`NotesDisclosure`, `Pagination`, and
`ErrorMessage`/`StatusMessage`/`LoadingMessage`/`EmptyState`. Keep existing classes
and heading levels at composition sites; ordinary layout HTML stays inside
components. Preserve existing loading, error, success, and empty-state copy.

Feature components stay with their feature:

- Books: `BookCard`, `BookAuthors`, reusable book fields, library search/results,
  metadata/actions, edit feedback, and import preview components. Ownership fields
  accept the caller's actual option values; create, edit, and filter encodings
  must not be silently normalized.
- Catalog: search fields, candidate cards, and edition details. Edition navigation
  retains `prefetch={false}` so rendering a result does not fetch its edition.
- Auth: shared email/password fields retain the existing autocomplete and limits.
- Plans: search/results reuse `PlanSummary` and `PlanResultCard`.
- Chat: transcript/messages, result cards/activity, composer, history/recovery
  controls, and conversation navigation render the existing app-owned state.
  Keep assistant-ui's composer input, runtime context, resizing, and keyboard
  handling. Run coordination, drafts, cancellation, pagination, and GET-only
  recovery stay in `chat.tsx` and `chat-workspace.tsx`.

Pages own authentication, data fetching, and URL parsing; presentation components
receive existing records and callbacks. Do not put services into shared controls
or replace feature state with a generic form/card framework. Visible native form
controls belong to the shared primitives; hidden inputs and established library
primitives are intentional exceptions. Browser QA, functional testing, and builds
remain user-owned under the showcase verification boundary.
