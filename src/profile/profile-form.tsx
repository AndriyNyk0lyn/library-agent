"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { saveProfile, type ProfileFormState } from "./actions";
function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving preferences…" : "Save preferences"}
    </Button>
  );
}
export function ProfileForm({ initial }: { initial: ProfileFormState }) {
  const [state, action] = useActionState(saveProfile, initial);
  return (
    <form action={action} className="max-w-xl space-y-4">
      <div>
        <label htmlFor="preferences" className="form-label">
          Lasting reading preferences
        </label>
        <textarea
          id="preferences"
          name="preferences"
          maxLength={4000}
          defaultValue={state.profile.preferences}
          className="form-field"
          rows={5}
        />
        <p className="text-sm text-muted">
          Saving here explicitly confirms these preferences for future chats.
        </p>
      </div>
      <div>
        <label htmlFor="pages-per-hour" className="form-label">
          Pages per hour (optional)
        </label>
        <input
          id="pages-per-hour"
          name="pages_per_hour"
          type="number"
          min="0"
          max="10000"
          step="any"
          defaultValue={state.profile.pages_per_hour ?? ""}
          className="form-field"
        />
      </div>
      <div>
        <label htmlFor="daily-minutes" className="form-label">
          Daily reading minutes (optional)
        </label>
        <input
          id="daily-minutes"
          name="daily_reading_minutes"
          type="number"
          min={1}
          max={1440}
          step={1}
          defaultValue={state.profile.daily_reading_minutes ?? ""}
          className="form-field"
        />
      </div>
      <div>
        <label htmlFor="timezone" className="form-label">
          Confirmed timezone (optional)
        </label>
        <input
          id="timezone"
          name="timezone"
          maxLength={100}
          placeholder="Europe/Kyiv"
          defaultValue={state.profile.timezone ?? ""}
          className="form-field"
        />
        <p className="text-sm text-muted">
          Enter your IANA timezone or UTC. Relative dates require a confirmed
          timezone.
        </p>
      </div>
      {state.error && (
        <p role="alert">
          {state.error}{" "}
          <a href="/profile" className="text-link">
            Reload current profile
          </a>
          . Your entered values remain here.
        </p>
      )}
      {state.saved && <p role="status">Preferences saved.</p>}
      <SaveButton />
    </form>
  );
}
