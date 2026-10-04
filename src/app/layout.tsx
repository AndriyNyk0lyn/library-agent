import type { Metadata } from "next";
import Link from "next/link";
import { AppNavigation } from "@/components/app-navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Reading Companion", template: "%s | Reading Companion" },
  description: "Your personal book library and next-read planner.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only z-10 rounded bg-surface p-3 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <Link
              href="/library"
              className="text-lg font-semibold tracking-tight"
            >
              Reading Companion
            </Link>
            <AppNavigation />
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-5xl px-5 py-10 sm:px-8"
        >
          {children}
        </main>
      </body>
    </html>
  );
}
