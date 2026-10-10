# design-sync notes

- This is a Next.js app, not a published package. `.design-sync/pkg/` stands in for one:
  - `index.ts` is the barrel listing exactly what syncs. **Add a line there to sync a new component.**
  - `package.json` sets `types` to the generated declarations.
  - `tsconfig.json` holds the esbuild aliases.
- Run the converter with `--entry ./.design-sync/pkg/index.ts`. That makes `PKG_DIR` `.design-sync/pkg`, so every package-relative config path (`cssEntry`, `tsconfig`, `srcDir`, `guidelinesGlob`) resolves from there. `cssEntry` and `tsconfig` are refused if they point outside `pkg/`, which is why `app.css` and the alias tsconfig live inside it.
- Run `cfg.buildCmd` (`node .design-sync/prebuild.mjs`) before every build. It does two things:
  1. Compiles `.design-sync/tailwind.css` (the app's `globals.css` plus an `@source inline()` safelist) into `pkg/app.css`. Tailwind v4 only emits classes it sees in use; `.design-sync/previews` gets scanned automatically.
  2. Runs `tsc -p .design-sync/tsconfig.types.json` to emit `.d.ts` into `pkg/types/`, then rewrites `@/x` imports to relative paths, because the converter's ts-morph reader has no path aliases.
  Both outputs are gitignored.
- Types use the real `next/link` types. Only the esbuild bundle uses the `next-shim` aliases.
- zod-derived prop types (`z.output<…>`) don't flatten, and `LibraryBookRow` comes out unnamed. `cfg.dtsPropsFor` hand-writes the contracts for `BookCard`, `CatalogCandidateCard`, `PlanSummary` and `PlanResultCard`. Update them when the schemas change (`src/books/catalog/schema.ts`, `src/plans/schema.ts`, `database.types.ts`).
- `AppNavigation`, `NavigationLink`, `TextLink` and `AppHeader` import `next/link` and `next/navigation`. Bundling real Next breaks the whole bundle (`process is not defined`). `pkg/tsconfig.json` aliases both to `.design-sync/next-shim/*`. The link shim drops `prefetch`/`replace`/`scroll`. `CurrentPathProvider` is exported from the barrel and excluded from cards via `componentSrcMap: null`.
- Don't name a preview export after a global (`Error`, `Map`...).
- `SkipLink` can't hold focus inside a static card, so its preview reveals it with a parent `[&>a]:not-sr-only`.
- Playwright is NOT installed (user's choice, 2026-10-10). Run validate/driver with `--no-render-check`; the capture stage fails, which is expected. Grade by eye in the desktop app's browser pane against `node .ds-sync/storybook/http-serve.mjs ./ds-bundle`, plus a DOM check (load each card, assert non-empty, no floor card or errors).
- Not synced on purpose: `library-view`, `plans-view`, import/chat/conversation components. They use `next/form`, server actions, or assistant-ui runtime context.

## Known render warns
- `[RENDER_SKIPPED]`: render check disabled (see above).

## Re-sync risks
- The `dtsPropsFor` data contracts are hand copies of zod schemas and go stale silently.
- The barrel is an explicit list, so a new component in `src/` isn't synced until it's added to `pkg/index.ts` and given a preview.
- The `next-shim` stubs cover only `Link` and `usePathname`. A synced component using `useRouter`/`useSearchParams`/`next/form` will break the bundle.
- Grades are by eye in the browser pane, not machine-captured.
