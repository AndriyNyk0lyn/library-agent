# Reading Companion — how to build with it

A function-first personal reading library (books, reading plans, agent chat). Plain, readable, accessible screens: no hero sections, gradients, decorative dashboards or fake charts. One clear primary action per task.

## Setup

No theme provider is needed: `styles.css` carries every token and utility. The one context-dependent component is `AppNavigation`, which highlights the current route. Wrap it in `CurrentPathProvider` (without it, no link is marked current):

```jsx
const { AppNavigation, CurrentPathProvider } = window.ReadingCompanion;
<CurrentPathProvider pathname="/library"><AppNavigation /></CurrentPathProvider>
```

Routes: `/library`, `/plans`, `/chat`, `/profile` (labelled "Preferences"), `/setup`.

## Styling idiom: Tailwind v4 utilities on the app's tokens

Style your own layout with Tailwind classes built on these tokens, never raw hex:

| Token | Utilities | Use |
|---|---|---|
| `--color-background` #fafaf9 | `bg-background` | page background |
| `--color-surface` #ffffff | `bg-surface` | cards, inputs, panels |
| `--color-foreground` #1c1917 | `text-foreground`, `bg-foreground` | body text, selected nav |
| `--color-muted` #57534e | `text-muted` | secondary text, descriptions |
| `--color-line` #d6d3d1 | `border-line` | borders, dividers |
| `--color-accent` #166534 | `bg-accent`, `text-accent`, `border-accent` | primary action, links, focus |

Errors use `border-red-300 bg-red-50 text-red-800`. Font is `font-sans` (Arial/Helvetica). Corners are `rounded` and borders 1px `border border-line`. Spacing uses the default scale (`gap-3`, `p-3`, `px-4 py-2`, `mb-8`, `space-y-4`). Headings use `text-2xl font-semibold tracking-tight`.

The app also defines component classes, which the field components below apply for you:
- `form-label` for a field label (block, small, medium weight)
- `form-field` for text inputs, selects and textareas (full width, bordered, surface)
- `text-link` for inline links (accent, underlined)

## Components (prefer these over raw markup)

- **Actions:** `Button` with `variant="default"` (solid green, the one primary action), `"outline"` (secondary) or `"link"` (inline action styled as a link). Always set `type`. `SubmitButton` goes inside a `<form>`: `pendingLabel` replaces the label and disables it while the action runs.
- **Links:** `TextLink` for in-app routes and `AnchorLink` for external URLs (add `target="_blank" rel="noreferrer"`). `LinkedText text=…` auto-links URLs in agent answers. `Pagination` takes `previousHref`/`nextHref`.
- **Forms:** `InputField`, `SelectField` and `TextareaField` (`id` and `label` required; optional `description` and `error`) wire the label, help and error with aria for you. Book-specific fields: `ReadingStatusField` (`emptyLabel` for filters), `OwnershipField`, `RatingField`, `PageCountField`, `NotesField`. Bare controls: `Input`, `Select`, `Textarea`, `Label`, `Checkbox`, `CheckboxField label=…`.
- **Surfaces:** `Card` (article), `CardSection` (section) and `CardListItem` (li, so put it inside a `<ul>`) give the bordered surface box. Pass padding yourself, e.g. `className="p-5"`.
- **Feedback:** `FormFeedback state={{ error } | { message }}` for form results. `EmptyState title=…` (`className="p-6"`) for empty lists. `ErrorMessage` (role=alert) and `StatusMessage`/`LoadingMessage` (role=status) are unstyled, so add classes such as `rounded border border-red-300 bg-red-50 p-3 text-red-800`.
- **Data display:** `MetadataItem label=…` renders a dt/dd pair (wrap in `<dl>`). `Disclosure summary=…` and `NotesDisclosure notes=…` are native `<details>`.
- **Domain cards:** `BookCard book={…}` (an li, so wrap in `<ul className="space-y-4">`), `BookAuthors`, `CatalogCandidateCard candidate={…}` (li), `PlanSummary calculation={…}`, and `PlanResultCard result={{ kind: "saved" | "suggestion" | "rejected", … }}`. Their `.d.ts` files list every field.
- **Layout:** `PageHeading` (title plus one-sentence description) goes at the top of every page. `AppHeader` (logo plus nav) sits above it inside `CurrentPathProvider`.

Read `styles.css` (→ `_ds_bundle.css`) for the full compiled class set, and `components/<group>/<Name>/<Name>.prompt.md` for examples. `guidelines/docs/style-guide.md` has the copy and state rules: short, concrete labels such as "Import Goodreads CSV" and "Try again", plus honest empty, loading and error states.

## Example

```jsx
const { PageHeading, InputField, Button, TextLink, BookCard, FormFeedback } = window.ReadingCompanion;
<main className="mx-auto max-w-4xl px-4 py-8">
  <PageHeading title="Library" description="Keep your books, reading status, ratings, and notes in one place." />
  <form className="flex flex-wrap items-end gap-3">
    <InputField id="q" name="query" type="search" label="Search title or author" />
    <Button type="submit">Search library</Button>
    <TextLink href="/library">Clear filters</TextLink>
  </form>
  <ul className="mt-6 space-y-4" aria-label="Your books">
    <BookCard book={{ id: "b1", title: "The Dispossessed", authors: ["Ursula K. Le Guin"], status: "reading", rating: null, owned: true, page_count: 387, notes: "", isbn10: null, isbn13: null }} />
  </ul>
  <FormFeedback state={{ message: "Saved to your library." }} />
</main>
```
