"use client";

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
      <div>
        <label htmlFor="email" className="form-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={254}
          className="form-field"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
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
      <div>
        <label htmlFor="password" className="form-label">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          maxLength={256}
          className="form-field"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="mt-1 text-sm text-muted">At least 8 characters.</p>
      </div>
      <SubmitButton pendingLabel="Saving…">Save password</SubmitButton>
    </form>
  );
}
