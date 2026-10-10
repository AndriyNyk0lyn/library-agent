# Design System: Reading Companion

Function-first personal library for tracking books, plans, and reading conversations. Paper-and-stone surfaces, forest-green actions, and a compact single-column reading width. No decorative dashboards, hero gradients, or animation chrome.

## 1. Visual Theme & Atmosphere

Light stone canvas (`#fafaf9`) with white paper cards and a cool-warm mineral palette. Density is compact and editorial: one primary action per task, visible labels, and a quiet header. The interface should feel like a well-kept reading desk, not a SaaS control panel.

## 2. Color Palette & Roles

### Primary Foundation
- **Stone Paper (`#fafaf9`)**: Page canvas / `--color-background`.
- **Page White (`#ffffff`)**: Cards, header bar, inputs, and raised surfaces / `--color-surface`.
- **Ink Stone (`#1c1917`)**: Primary text, current-nav fill, and high-contrast chrome / `--color-foreground`.
- **Pebble Line (`#d6d3d1`)**: Structural 1px borders and hairlines / `--color-line`.

### Accent & Interactive
- **Library Green (`#166534`)**: Primary buttons, text links, and focus rings / `--color-accent`.
- **Deep Grove (`#166534` hover `#166534` → Tailwind `green-800`)**: Primary button hover.
- **Pebble Wash (`#e7e5e4` / `stone-200`)**: Navigation hover wash.
- **Quiet Stone (`#f5f5f4` / `stone-100`)**: Outline-button hover.

### Typography & Text Hierarchy
- **Ink Stone (`#1c1917`)**: Headings, body, and form values.
- **Dust Ink (`#57534e`)**: Supporting copy, metadata, and inactive nav / `--color-muted`.

### Functional States
- **Alert Clay (`#991b1b` / `red-800`)**: Field errors and destructive copy on light surfaces.
- **Alert Wash (`#fef2f2` / `red-50`)**: Error banner fill with **Alert Rim (`#fca5a5` / `red-300`)**.
- **Disabled Green**: Primary actions at `60%` opacity with `cursor-wait` while submitting.

## 3. Typography Rules

- **Arial / Helvetica / sans-serif** (`--font-sans`): The only type family. Clean grotesk used for display, body, and controls. No mono stack.
- **Display / page title**: `24px/32px` (`text-2xl`) `600` `-0.025em` tracking; `30px/36px` from `sm`.
- **Section title**: `18px/28px` (`text-lg`) `600`.
- **Brand mark**: `18px/28px` `600` tight tracking.
- **Body**: `16px/24px` `400` on Ink Stone; supporting sentences in Dust Ink, `max-w-2xl`.
- **Labels / nav / metadata**: `14px/20px` (`text-sm`); labels `500`; nav items `500`.
- **Links**: `500` Library Green, underline with `4px` offset.

## 4. Component Stylings

- **Buttons**: `44px` min height (`min-h-11`), `4px` radius, `16px/8px` padding. Primary: Library Green fill, white label, Deep Grove hover. Outline: Page White fill, Pebble Line border, Quiet Stone hover. Disabled: `60%` opacity, wait cursor.
- **Cards & banners**: Page White, `1px` Pebble Line, `4px` radius, `16px`–`24px` padding. Error banners use Alert Wash / Alert Rim / Alert Clay. Success/status banners reuse the card treatment.
- **Navigation**: Header on Page White with a bottom Pebble Line. Current item is an Ink Stone pill with Page White type; idle items are Dust Ink with Pebble Wash hover. Skip-link is a Page White chip that only appears on focus.
- **Inputs & forms**: Page White field, `1px` Pebble Line, `4px` radius, `12px/8px` padding. Labels sit above fields (`14px` `500`, `4px` gap). Focus-visible: `2px` Library Green outline, `4px` offset. Forms cap at `28rem` (auth), `36rem` (plans/profile), or `42rem` (book entry).
- **Book / plan cards**: Same card recipe as library list items; title is a Library Green text link; metadata uses a compact `dl` with Dust Ink terms.

## 5. Layout Principles

- **Grid & spacing**: `4px` / `8px` baseline. Desktop content column `max-w-5xl` (`64rem`) centered. Horizontal padding `20px` (`px-5`), `32px` from `sm`. Main vertical padding `40px`. Header inner padding `16px` vertical. Common stacks: `16px`, `20px`, `24px`, `32px`.
- **Responsive behavior**: Single reading column. Two-up form pairs (`sm:grid-cols-2`) collapse to one column. Header wraps brand and nav. Minimum control height `44px`. No floating action bars or multi-pane dashboards.

## 6. Design System Notes for Stitch Generation

- **Atmosphere keywords**: Paper-and-stone reading desk, function-first library, Library Green actions, compact editorial column, no decorative dashboard chrome.
- **Canonical colors**: Stone Paper `#fafaf9`, Page White `#ffffff`, Ink Stone `#1c1917`, Dust Ink `#57534e`, Pebble Line `#d6d3d1`, Library Green `#166534`.
- **Component prompts**: `44px` `4px`-radius Library Green buttons; white cards with `1px` Pebble Line and `20px` padding; Arial page titles at `24px/30px` `600` over Dust Ink descriptions.
