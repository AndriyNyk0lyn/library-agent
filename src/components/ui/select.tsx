import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  ...props
}: ComponentPropsWithRef<"select">) {
  return <select className={cn("form-field", className)} {...props} />;
}
