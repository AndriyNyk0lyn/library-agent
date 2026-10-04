import "server-only";
import type { ReaderContext } from "@/books/service";
import { getBook } from "@/books/service";
import { calculateReadingPlan, planFailure } from "./calculate";
import {
  planInputSchema,
  savePlanSchema,
  savePlanResultSchema,
  listPlansSchema,
  listPlansResultSchema,
  planCursorSchema,
  type SavePlanResult,
  type ListPlansResult,
  type CalculatePlanResult,
} from "./schema";

export async function previewReadingPlan(
  reader: ReaderContext,
  input: unknown,
): Promise<CalculatePlanResult> {
  const parsed = planInputSchema.safeParse(input);
  if (!parsed.success)
    return planFailure(
      "VALIDATION_ERROR",
      "Provide valid plan inputs, remaining pages and a confirmed timezone.",
    );
  const book = await getBook(reader, { id: parsed.data.book_id });
  return book.ok ? calculateReadingPlan(parsed.data, book.book) : book;
}
export async function saveReadingPlan(
  reader: ReaderContext,
  input: unknown,
): Promise<SavePlanResult> {
  const parsed = savePlanSchema.safeParse(input);
  if (!parsed.success)
    return planFailure(
      "VALIDATION_ERROR",
      "Check dates, pages, timezone, positive constraints, book version and operation ID.",
    );
  try {
    // The RPC checks the durable outcome before reading the book: retries survive later book edits/date changes.
    const { data, error } = await reader.supabase
      .rpc("save_reading_plan", { p_input: parsed.data })
      .abortSignal(AbortSignal.timeout(10000));
    if (error) return unavailable(true);
    return savePlanResultSchema.parse(data);
  } catch {
    return unavailable(true);
  }
}
export async function listReadingPlans(
  reader: ReaderContext,
  input: unknown = {},
): Promise<ListPlansResult> {
  const parsed = listPlansSchema.safeParse(input);
  if (!parsed.success)
    return planFailure(
      "VALIDATION_ERROR",
      "Check the book/status filters and pagination.",
    );
  const filters = parsed.data;
  let cursor;
  if (filters.cursor) {
    try {
      cursor = planCursorSchema.parse(
        JSON.parse(Buffer.from(filters.cursor, "base64url").toString("utf8")),
      );
    } catch {
      return planFailure(
        "VALIDATION_ERROR",
        "Invalid plan cursor. Start again without a cursor.",
      );
    }
    if (
      cursor.book_id !== (filters.book_id ?? null) ||
      cursor.status !== (filters.status ?? null)
    )
      return planFailure(
        "VALIDATION_ERROR",
        "Plan filters changed. Start again without a cursor.",
      );
  }
  try {
    const { data, error } = await reader.supabase
      .rpc("list_reading_plans", {
        p_book_id: filters.book_id,
        p_status: filters.status,
        p_limit: filters.limit + 1,
        p_before_created_at: cursor?.created_at,
        p_before_id: cursor?.id,
      })
      .abortSignal(AbortSignal.timeout(10000));
    if (error) return unavailable(false);
    const result = listPlansResultSchema.parse({
      ok: true,
      plans: Array.isArray(data) ? data.slice(0, filters.limit) : data,
      next_cursor: null,
    });
    if (!result.ok) return result;
    const last = result.plans.at(-1);
    const next =
      Array.isArray(data) && data.length > filters.limit && last
        ? Buffer.from(
            JSON.stringify({
              created_at: last.created_at,
              id: last.id,
              book_id: filters.book_id ?? null,
              status: filters.status ?? null,
            }),
          ).toString("base64url")
        : null;
    return { ...result, next_cursor: next };
  } catch {
    return unavailable(false);
  }
}
function unavailable(write: boolean) {
  return planFailure(
    "UPSTREAM_UNAVAILABLE",
    write
      ? "Plan save is uncertain. Check saved plans or retry identical inputs and the same operation ID. Check the reading-plans migration."
      : "Could not load plans. Check the reading-plans migration and try again.",
  );
}
