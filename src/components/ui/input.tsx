import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  type,
  ...props
}: ComponentPropsWithRef<"input">) {
  return (
    <input
      type={type}
      className={cn(type === "file" ? undefined : "form-field", className)}
      {...props}
    />
  );
}
