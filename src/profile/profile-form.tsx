"use client";
import { useActionState } from "react";
import { InputField, TextareaField } from "@/components/ui/field";
import { ErrorMessage, StatusMessage } from "@/components/ui/feedback";
import { AnchorLink } from "@/components/ui/text-link";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveProfile, type ProfileFormState } from "./actions";

export function ProfileForm({ initial }: { initial: ProfileFormState }) {
  const [state, action] = useActionState(saveProfile, initial);
  return (
    <form action={action} className="max-w-xl space-y-4">
      <TextareaField
        id="preferences"
        label="Lasting reading preferences"
        name="preferences"
        maxLength={4000}
        defaultValue={state.profile.preferences}
        rows={5}
        descriptionClassName="text-sm text-muted"
        description="Saving here explicitly confirms these preferences for future chats."
      />
      <InputField
        id="pages-per-hour"
        label="Pages per hour (optional)"
        name="pages_per_hour"
        type="number"
        min="0"
        max="10000"
        step="any"
        defaultValue={state.profile.pages_per_hour ?? ""}
      />
      <InputField
        id="daily-minutes"
        label="Daily reading minutes (optional)"
        name="daily_reading_minutes"
        type="number"
        min={1}
        max={1440}
        step={1}
        defaultValue={state.profile.daily_reading_minutes ?? ""}
      />
      <InputField
        id="timezone"
        label="Confirmed timezone (optional)"
        name="timezone"
        maxLength={100}
        placeholder="Europe/Kyiv"
        defaultValue={state.profile.timezone ?? ""}
        descriptionClassName="text-sm text-muted"
        description="Enter your IANA timezone or UTC. Relative dates require a confirmed timezone."
      />
      {state.error && (
        <ErrorMessage>
          {state.error}{" "}
          <AnchorLink href="/profile">Reload current profile</AnchorLink>. Your
          entered values remain here.
        </ErrorMessage>
      )}
      {state.saved && <StatusMessage>Preferences saved.</StatusMessage>}
      <SubmitButton pendingLabel="Saving preferences…">
        Save preferences
      </SubmitButton>
    </form>
  );
}
