"use client";

import { useActionState } from "react";
import { signOut } from "./actions";
import { FormFeedback } from "@/components/ui/form-feedback";
import { SubmitButton } from "@/components/ui/submit-button";

export function SignOutForm() {
  const [state, action] = useActionState(signOut, {});
  return (
    <form action={action} className="space-y-2">
      <FormFeedback state={state} />
      <SubmitButton pendingLabel="Signing out…">Sign out</SubmitButton>
    </form>
  );
}
