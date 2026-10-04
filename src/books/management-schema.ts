import { z } from "zod";
import { readingStatuses } from "./schemas";
import { libraryBookSummarySchema } from "./search-schema";

export const bookDateSchema = z.iso.date().refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    value >= "0001-01-01" &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}, "Enter a valid calendar date.");
export const bookDetailsSchema = libraryBookSummarySchema.extend({
  notes: z.string().max(20000),
  isbn10: z.string().nullable(),
  isbn13: z.string().nullable(),
  goodreads_book_id: z.string().nullable(),
  imported_shelves: z.array(z.string()).max(100),
  goodreads_date_added: bookDateSchema.nullable(),
  started_at: bookDateSchema.nullable(),
  finished_at: bookDateSchema.nullable(),
  updated_at: z.iso.datetime({ offset: true }),
});
export type BookDetails = z.output<typeof bookDetailsSchema>;
export const getBookSchema = z.strictObject({ id: z.uuid() });
export const bookPatchSchema = z
  .strictObject({
    status: z.enum(readingStatuses).optional(),
    rating: z.number().min(0.5).max(5).multipleOf(0.5).nullable().optional(),
    owned: z.boolean().nullable().optional(),
    page_count: z.number().int().min(1).max(100000).nullable().optional(),
    notes: z.string().max(20000).optional(),
    notes_mode: z.enum(["append", "replace"]).optional(),
    started_at: bookDateSchema.nullable().optional(),
    finished_at: bookDateSchema.nullable().optional(),
  })
  .refine(
    (patch) =>
      Object.keys(patch).length > 0 &&
      (!patch.notes_mode || patch.notes !== undefined),
    "Supply at least one field; notes_mode requires notes.",
  );
export const updateBookSchema = z.strictObject({
  id: z.uuid(),
  expected_version: z.number().int().positive(),
  operation_id: z.uuid(),
  patch: bookPatchSchema,
});
export const bookResultSchema = z.discriminatedUnion("ok", [
  z.strictObject({ ok: z.literal(true), book: bookDetailsSchema }),
  z.strictObject({
    ok: z.literal(false),
    error: z.strictObject({
      code: z.enum([
        "VALIDATION_ERROR",
        "NOT_FOUND",
        "CONFLICT",
        "UPSTREAM_UNAVAILABLE",
      ]),
      message: z.string(),
    }),
    current: bookDetailsSchema.optional(),
  }),
]);
export type BookResult = z.output<typeof bookResultSchema>;
