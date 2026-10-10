import type { Metadata } from "next";
import { AppHeader, SkipLink } from "@/components/app-header";
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
        <SkipLink />
        <AppHeader />
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
