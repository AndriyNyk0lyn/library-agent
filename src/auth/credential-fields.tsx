import type { ComponentProps } from "react";
import { InputField } from "@/components/ui/field";

export function EmailField(
  props: Omit<ComponentProps<typeof InputField>, "label">,
) {
  return (
    <InputField
      label="Email"
      name="email"
      type="email"
      autoComplete="email"
      required
      maxLength={254}
      {...props}
    />
  );
}
export function PasswordField({
  label = "Password",
  autoComplete,
  ...props
}: Omit<ComponentProps<typeof InputField>, "autoComplete" | "label"> & {
  label?: string;
  autoComplete: "current-password" | "new-password";
}) {
  return (
    <InputField
      label={label}
      name="password"
      type="password"
      autoComplete={autoComplete}
      required
      minLength={autoComplete === "new-password" ? 8 : 1}
      maxLength={256}
      description={
        autoComplete === "new-password" ? "At least 8 characters." : undefined
      }
      {...props}
    />
  );
}
