"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/library", label: "Library" },
  { href: "/plans", label: "Plans" },
  { href: "/chat", label: "Chat" },
  { href: "/profile", label: "Preferences" },
  { href: "/setup", label: "Setup" },
];

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex flex-wrap gap-1">
      {navigation.map(({ href, label }) => {
        const isCurrent = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className={`rounded px-3 py-2 text-sm font-medium ${isCurrent ? "bg-foreground text-surface" : "text-muted hover:bg-stone-200 hover:text-foreground"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
