import { z } from "zod";
import { bookDateSchema } from "@/books/management-schema";
import { timezoneSchema } from "@/profile/schema";

export const planInputSchema = z.strictObject({
  book_id: z.uuid(),
  expected_book_version: z.number().int().positive(),
  start_date: bookDateSchema,
  target_date: bookDateSchema,
  timezone: timezoneSchema,
  remaining_pages: z.number().int().positive().max(100000),
  pages_read: z
    .number()
    .int()
    .nonnegative()
    .max(100000)
    .nullable()
    .default(null),
  pages_per_hour: z.number().positive().max(10000).nullable().default(null),
  daily_reading_minutes: z
    .number()
    .int()
    .positive()
    .max(1440)
    .nullable()
    .default(null),
});
export const savePlanSchema = planInputSchema.extend({
  operation_id: z.uuid(),
});
export type PlanInput = z.output<typeof planInputSchema>;
export const calculationSchema = planInputSchema
  .omit({ expected_book_version: true })
  .extend({
    pages_read: z.number().int().nonnegative().max(100000).nullable(),
    pages_per_hour: z.number().positive().max(10000).nullable(),
    daily_reading_minutes: z.number().int().positive().max(1440).nullable(),
    book_version: z.number().int().positive(),
    page_count: z.number().int().positive().max(100000).nullable(),
    title: z.string().min(1).max(500),
    authors: z.array(z.string()).min(1).max(10),
    available_days: z.number().int().positive(),
    daily_pages: z.number().int().positive().max(100000),
    estimated_daily_minutes: z.number().nonnegative().nullable(),
    time_feasibility: z.enum(["feasible", "unknown", "infeasible"]),
    assumptions: z.array(z.string().max(500)).max(10),
  });
export type PlanCalculation = z.output<typeof calculationSchema>;
export const savedPlanSchema = calculationSchema.extend({
  time_feasibility: z.enum(["feasible", "unknown"]),
  id: z.uuid(),
  operation_id: z.uuid(),
  status: z.enum(["active", "completed", "cancelled"]),
  created_at: z.iso.datetime({ offset: true }),
});
export type SavedPlan = z.output<typeof savedPlanSchema>;
export const planFailureSchema = z.strictObject({
  ok: z.literal(false),
  error: z.strictObject({
    code: z.enum([
      "VALIDATION_ERROR",
      "NOT_FOUND",
      "CONFLICT",
      "PLAN_INFEASIBLE",
      "UPSTREAM_UNAVAILABLE",
      "REVISION_LIMIT",
    ]),
    message: z.string().max(1000),
  }),
  constraints: calculationSchema.optional(),
});
export const calculatePlanResultSchema = z.discriminatedUnion("ok", [
  z.strictObject({ ok: z.literal(true), calculation: calculationSchema }),
  planFailureSchema,
]);
export const savePlanResultSchema = z.discriminatedUnion("ok", [
  z.strictObject({ ok: z.literal(true), plan: savedPlanSchema }),
  planFailureSchema,
]);
export const planCursorSchema = z.strictObject({
  created_at: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  book_id: z.uuid().nullable(),
  status: savedPlanSchema.shape.status.nullable(),
});
export const listPlansSchema = z.strictObject({
  book_id: z.uuid().optional(),
  status: savedPlanSchema.shape.status.optional(),
  limit: z.number().int().min(1).max(25).default(10),
  cursor: z.string().min(1).max(1000).optional(),
});
export const listPlansResultSchema = z.discriminatedUnion("ok", [
  z.strictObject({
    ok: z.literal(true),
    plans: z.array(savedPlanSchema).max(25),
    next_cursor: z.string().nullable(),
  }),
  planFailureSchema,
]);
export type PlanFailure = z.output<typeof planFailureSchema>;
export type CalculatePlanResult = z.output<typeof calculatePlanResultSchema>;
export type SavePlanResult = z.output<typeof savePlanResultSchema>;
export type ListPlansResult = z.output<typeof listPlansResultSchema>;

// Results come from the observed HTTP tool call, never from model-generated schedule fields.
export const planDisplaySchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("saved"), plan: savedPlanSchema }),
  z.strictObject({
    kind: z.literal("suggestion"),
    calculation: calculationSchema,
  }),
  z.strictObject({
    kind: z.literal("rejected"),
    error: planFailureSchema.shape.error,
    constraints: calculationSchema.optional(),
  }),
]);
export type PlanDisplay = z.output<typeof planDisplaySchema>;
