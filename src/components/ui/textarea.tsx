import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: ComponentPropsWithRef<"textarea">) {
  return <textarea className={cn("form-field", className)} {...props} />;
}
