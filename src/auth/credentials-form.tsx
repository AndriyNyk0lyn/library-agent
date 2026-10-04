"use client";

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
      <div>
        <label htmlFor="email" className="form-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className="form-field"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="password" className="form-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={passwordAutocomplete}
          required
          minLength={passwordAutocomplete === "new-password" ? 8 : 1}
          maxLength={256}
          className="form-field"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {passwordAutocomplete === "new-password" ? (
          <p className="mt-1 text-sm text-muted">At least 8 characters.</p>
        ) : null}
      </div>
      <SubmitButton pendingLabel="Submitting…">{label}</SubmitButton>
    </form>
  );
}
