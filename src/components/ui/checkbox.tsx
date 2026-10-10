import { Label } from "./label";
import type { ComponentPropsWithRef, ReactNode } from "react";

export function Checkbox(props: Omit<ComponentPropsWithRef<"input">, "type">) {
  return <input type="checkbox" {...props} />;
}
export function CheckboxField({
  label,
  className = "flex gap-2",
  ...props
}: Omit<ComponentPropsWithRef<"input">, "type"> & { label: ReactNode }) {
  return (
    <Label className={className}>
      <Checkbox {...props} />
      {label}
    </Label>
  );
}
