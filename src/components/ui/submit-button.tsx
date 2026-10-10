"use client";

import { Button } from "./button";
import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  ...props
}: {
  children: React.ReactNode;
  pendingLabel: string;
} & Omit<ComponentProps<typeof Button>, "children">) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} type="submit" disabled={pending || disabled}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
