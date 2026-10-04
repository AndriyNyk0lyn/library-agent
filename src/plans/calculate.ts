import type { BookDetails } from "@/books/management-schema";
import {
  planInputSchema,
  type CalculatePlanResult,
  type PlanFailure,
  type PlanCalculation,
} from "./schema";

export function planFailure(
  code: PlanFailure["error"]["code"],
  message: string,
): PlanFailure {
  return { ok: false, error: { code, message } };
}
export function readerCalendarDate(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join("-");
}
export function calculateReadingPlan(
  input: unknown,
  book: BookDetails,
  now = new Date(),
): CalculatePlanResult {
  const parsed = planInputSchema.safeParse(input);
  if (!parsed.success)
    return planFailure(
      "VALIDATION_ERROR",
      "Provide book/version, valid dates, remaining pages and a confirmed timezone. Optional speed must be positive; minutes must be positive.",
    );
  const fields = parsed.data;
  if (fields.book_id !== book.id)
    return planFailure("NOT_FOUND", "Book not found in your library.");
  if (fields.expected_book_version !== book.version)
    return planFailure(
      "CONFLICT",
      "This book changed. Reload the current book version before calculating or saving.",
    );
  if (
    fields.start_date > fields.target_date ||
    fields.start_date < readerCalendarDate(fields.timezone, now)
  )
    return planFailure(
      "VALIDATION_ERROR",
      "Start on or after today in the confirmed timezone, and choose a target on or after the start date.",
    );
  if (
    book.page_count !== null &&
    (fields.remaining_pages > book.page_count ||
      (fields.pages_read !== null &&
        fields.pages_read + fields.remaining_pages !== book.page_count))
  )
    return planFailure(
      "VALIDATION_ERROR",
      "Remaining pages cannot exceed the book's page count. If pages read are supplied, pages read plus remaining pages must equal that count.",
    );
  const availableDays =
    Math.round(
      (Date.parse(`${fields.target_date}T00:00:00Z`) -
        Date.parse(`${fields.start_date}T00:00:00Z`)) /
        86400000,
    ) + 1;
  const dailyPages = Math.ceil(fields.remaining_pages / availableDays);
  // Round up hundredths so displayed estimates never understate the declared daily target.
  const estimatedMinutes =
    fields.pages_per_hour === null
      ? null
      : Math.ceil((dailyPages * 6000) / fields.pages_per_hour) / 100;
  if (estimatedMinutes !== null && !Number.isFinite(estimatedMinutes))
    return planFailure(
      "VALIDATION_ERROR",
      "This reading speed is too small to represent a time estimate. Check the speed and units.",
    );
  const feasibility =
    estimatedMinutes === null || fields.daily_reading_minutes === null
      ? "unknown"
      : estimatedMinutes > fields.daily_reading_minutes
        ? "infeasible"
        : "feasible";
  const assumptions = [
    "Read every calendar day, including the start and target dates; the last day may need fewer pages.",
    "Remaining pages and progress are reader-declared; reading status does not establish progress.",
    ...(fields.pages_per_hour === null
      ? ["Reading speed is unknown; time feasibility is unknown."]
      : [
          "Time estimates assume a constant declared reading speed and exclude breaks.",
        ]),
    ...(fields.daily_reading_minutes === null
      ? ["Daily time budget is unknown; time feasibility is unknown."]
      : []),
    ...(book.page_count === null
      ? [
          "Full page count is unknown; remaining pages cannot be checked against edition length.",
        ]
      : []),
  ];
  const { expected_book_version: bookVersion, ...values } = fields;
  const calculation: PlanCalculation = {
    ...values,
    book_version: bookVersion,
    page_count: book.page_count,
    title: book.title,
    authors: book.authors,
    available_days: availableDays,
    daily_pages: dailyPages,
    estimated_daily_minutes: estimatedMinutes,
    time_feasibility: feasibility,
    assumptions,
  };
  return feasibility === "infeasible"
    ? {
        ...planFailure(
          "PLAN_INFEASIBLE",
          "The daily page target exceeds the declared time budget. Agree on a later target, more time, or a shorter book before changing constraints.",
        ),
        constraints: calculation,
      }
    : { ok: true, calculation };
}
