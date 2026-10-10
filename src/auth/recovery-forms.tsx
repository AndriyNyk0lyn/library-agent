"use client";
import { EmailField, PasswordField } from "./credential-fields";

import { useActionState, useState } from "react";
import { updatePassword } from "./actions";
import { FormFeedback, type FormState } from "@/components/ui/form-feedback";
import { SubmitButton } from "@/components/ui/submit-button";

export function RequestEmailForm({
  action: requestAction,
  label,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  label: string;
}) {
  const [state, action] = useActionState(requestAction, {});
  const [email, setEmail] = useState("");
  return (
    <form action={action} className="max-w-md space-y-5">
      <FormFeedback state={state} />
      <EmailField
        id="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <SubmitButton pendingLabel="Sending…">{label}</SubmitButton>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePassword, {});
  const [password, setPassword] = useState("");
  return (
    <form action={action} className="max-w-md space-y-5">
      <FormFeedback state={state} />
      <PasswordField
        id="password"
        label="New password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <SubmitButton pendingLabel="Saving…">Save password</SubmitButton>
    </form>
  );
}
