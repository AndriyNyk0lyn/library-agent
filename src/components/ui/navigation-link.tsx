import Link from "next/link";
import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

export function NavigationLink({
  current,
  className,
  ...props
}: ComponentPropsWithRef<typeof Link> & { current: boolean }) {
  return (
    <Link
      {...props}
      aria-current={current ? "page" : undefined}
      className={cn(
        "rounded px-3 py-2 text-sm font-medium",
        current
          ? "bg-foreground text-surface"
          : "text-muted hover:bg-stone-200 hover:text-foreground",
        className,
      )}
    />
  );
}
