import Link from "next/link";
import { AppNavigation } from "./app-navigation";

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only z-10 rounded bg-surface p-3 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Skip to content
    </a>
  );
}
export function AppHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/library" className="text-lg font-semibold tracking-tight">
          Reading Companion
        </Link>
        <AppNavigation />
      </div>
    </header>
  );
}
