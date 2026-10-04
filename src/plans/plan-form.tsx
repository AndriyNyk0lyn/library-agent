"use client";
import {
  useActionState,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlanResultCard } from "./plan-summary";
import { submitPlan, type PlanFormState, type PlanFormValues } from "./actions";

function PlanButtons({
  uncertain,
  saved,
}: {
  uncertain: boolean;
  saved: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-3">
      {!uncertain && (
        <Button
          type="submit"
          variant="outline"
          name="intent"
          value="preview"
          disabled={pending || saved}
        >
          Check schedule without saving
        </Button>
      )}
      <Button
        type="submit"
        name="intent"
        value="save"
        disabled={pending || saved}
      >
        {pending
          ? "Checking schedule…"
          : uncertain
            ? "Retry identical save"
            : "Save reading plan"}
      </Button>
    </div>
  );
}
export function PlanForm({ initial }: { initial: PlanFormState }) {
  const [state, action] = useActionState(submitPlan, initial);
  const [values, setValues] = useState(initial.values);
  const saved = state.result?.kind === "saved";
  return (
    <form action={action} className="max-w-xl space-y-4">
      <p className="text-sm text-muted">
        Dates include both endpoints. Declare your remaining pages and confirm
        your timezone. Saving uses these inputs for this plan and does not
        change your preferences.
      </p>
      <PlanFields
        values={values}
        setValues={setValues}
        locked={state.uncertain || saved}
      />
      {state.result && <PlanResultCard result={state.result} />}
      {state.result?.kind === "rejected" && (
        <p role="alert">
          Your inputs are retained.{" "}
          {state.result.error.code === "CONFLICT" && (
            <Link
              href={`/plans/new?book_id=${state.bookId}`}
              className="text-link"
            >
              Reload current book version
            </Link>
          )}
        </p>
      )}
      {state.uncertain && (
        <p role="alert">
          The save may have completed. Inputs are locked for an identical retry.{" "}
          <Link href={`/plans?book_id=${state.bookId}`} className="text-link">
            Check saved plans
          </Link>{" "}
          before starting another save.
        </p>
      )}
      <PlanButtons uncertain={state.uncertain} saved={saved} />
    </form>
  );
}

function PlanFields({
  values,
  setValues,
  locked,
}: {
  values: PlanFormValues;
  setValues: Dispatch<SetStateAction<PlanFormValues>>;
  locked: boolean;
}) {
  const { pending } = useFormStatus();
  const fields: {
    name: keyof PlanFormValues;
    label: string;
    type: string;
    min?: number;
    max?: number;
    step?: string;
    required?: boolean;
  }[] = [
    { name: "start_date", label: "Start date", type: "date", required: true },
    { name: "target_date", label: "Target date", type: "date", required: true },
    {
      name: "timezone",
      label: "Confirmed timezone (IANA name or UTC)",
      type: "text",
      required: true,
    },
    {
      name: "remaining_pages",
      label: "Remaining pages",
      type: "number",
      min: 1,
      max: 100000,
      step: "1",
      required: true,
    },
    {
      name: "pages_read",
      label: "Pages read (optional)",
      type: "number",
      min: 0,
      max: 100000,
      step: "1",
    },
    {
      name: "pages_per_hour",
      label: "Pages per hour (optional)",
      type: "number",
      min: 0,
      max: 10000,
      step: "any",
    },
    {
      name: "daily_reading_minutes",
      label: "Daily reading minutes (optional)",
      type: "number",
      min: 1,
      max: 1440,
      step: "1",
    },
  ];
  return (
    <fieldset disabled={locked || pending} className="space-y-4">
      {fields.map(({ label, ...field }) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="form-label">
            {label}
          </label>
          <input
            {...field}
            id={field.name}
            maxLength={field.type === "text" ? 100 : undefined}
            value={values[field.name]}
            onChange={(event) =>
              setValues((previous) => ({
                ...previous,
                [field.name]: event.target.value,
              }))
            }
            className="form-field"
          />
        </div>
      ))}
    </fieldset>
  );
}
