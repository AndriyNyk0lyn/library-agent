import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

const surface = "rounded border border-line bg-surface";
export function Card({
  className,
  ...props
}: ComponentPropsWithRef<"article">) {
  return <article className={cn(surface, className)} {...props} />;
}
export function CardSection({
  className,
  ...props
}: ComponentPropsWithRef<"section">) {
  return <section className={cn(surface, className)} {...props} />;
}
export function CardListItem({
  className,
  ...props
}: ComponentPropsWithRef<"li">) {
  return <li className={cn(surface, className)} {...props} />;
}
