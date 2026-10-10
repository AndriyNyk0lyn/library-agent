import Link from "next/link";
import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

export function TextLink({
  className,
  ...props
}: ComponentPropsWithRef<typeof Link>) {
  return <Link className={cn("text-link", className)} {...props} />;
}
// Native anchors retain external navigation and deliberate full-page reloads.
export function AnchorLink({
  className,
  ...props
}: ComponentPropsWithRef<"a">) {
  return <a className={cn("text-link", className)} {...props} />;
}
