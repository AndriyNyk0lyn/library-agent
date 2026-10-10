"use client";
import { EmailField, PasswordField } from "./credential-fields";

import { useActionState, useState } from "react";
import { FormFeedback, type FormState } from "@/components/ui/form-feedback";
import { SubmitButton } from "@/components/ui/submit-button";

type CredentialsFormProps = {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  label: string;
  passwordAutocomplete: "current-password" | "new-password";
};

export function CredentialsForm({
  action,
  label,
  passwordAutocomplete,
}: CredentialsFormProps) {
  const [state, formAction] = useActionState(action, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form action={formAction} className="max-w-md space-y-5">
      <FormFeedback state={state} />
      <EmailField
        id="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <PasswordField
        id="password"
        autoComplete={passwordAutocomplete}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <SubmitButton pendingLabel="Submitting…">{label}</SubmitButton>
    </form>
  );
}
