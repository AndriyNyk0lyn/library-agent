"use client";

import { NavigationLink } from "./ui/navigation-link";
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
          <NavigationLink key={href} href={href} current={isCurrent}>
            {label}
          </NavigationLink>
        );
      })}
    </nav>
  );
}
