"use server";
import { revalidatePath } from "next/cache";
import { requireReader } from "@/auth/reader";
import { previewReadingPlan, saveReadingPlan } from "./service";
import type { PlanDisplay } from "./schema";

export type PlanFormValues = {
  start_date: string;
  target_date: string;
  timezone: string;
  remaining_pages: string;
  pages_read: string;
  pages_per_hour: string;
  daily_reading_minutes: string;
};
export type PlanFormState = {
  bookId: string;
  bookVersion: number;
  operationId: string;
  values: PlanFormValues;
  result: PlanDisplay | null;
  uncertain: boolean;
};
export async function submitPlan(
  previous: PlanFormState,
  form: FormData,
): Promise<PlanFormState> {
  const reader = await requireReader({ writable: true });
  const values = previous.uncertain
    ? previous.values
    : {
        start_date: String(form.get("start_date") ?? ""),
        target_date: String(form.get("target_date") ?? ""),
        timezone: String(form.get("timezone") ?? ""),
        remaining_pages: String(form.get("remaining_pages") ?? ""),
        pages_read: String(form.get("pages_read") ?? ""),
        pages_per_hour: String(form.get("pages_per_hour") ?? ""),
        daily_reading_minutes: String(form.get("daily_reading_minutes") ?? ""),
      };
  const input = {
    book_id: previous.bookId,
    expected_book_version: previous.bookVersion,
    start_date: values.start_date,
    target_date: values.target_date,
    timezone: values.timezone,
    remaining_pages: Number(values.remaining_pages),
    pages_read: values.pages_read === "" ? null : Number(values.pages_read),
    pages_per_hour:
      values.pages_per_hour === "" ? null : Number(values.pages_per_hour),
    daily_reading_minutes:
      values.daily_reading_minutes === ""
        ? null
        : Number(values.daily_reading_minutes),
  };
  const saving = previous.uncertain || form.get("intent") === "save";
  const result = saving
    ? await saveReadingPlan(reader, {
        ...input,
        operation_id: previous.operationId,
      })
    : await previewReadingPlan(reader, input);
  const uncertain =
    saving && !result.ok && result.error.code === "UPSTREAM_UNAVAILABLE";
  let display: PlanDisplay;
  if (result.ok && "plan" in result) {
    display = { kind: "saved", plan: result.plan };
    revalidatePath("/plans");
    revalidatePath(`/library/${previous.bookId}`);
  } else if (result.ok)
    display = { kind: "suggestion", calculation: result.calculation };
  else
    display = {
      kind: "rejected",
      error: result.error,
      ...(result.constraints ? { constraints: result.constraints } : {}),
    };
  return {
    ...previous,
    values,
    result: display,
    uncertain,
    operationId: uncertain ? previous.operationId : crypto.randomUUID(),
  };
}
