import type { ComponentPropsWithRef } from "react";

export function Label({
  className = "form-label",
  ...props
}: ComponentPropsWithRef<"label">) {
  return <label className={className} {...props} />;
}
