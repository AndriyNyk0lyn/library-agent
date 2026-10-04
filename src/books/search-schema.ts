import { z } from "zod";
import { readingStatuses } from "./schemas";

export const librarySearchSchema = z.strictObject({
  query: z.string().trim().max(200).optional(),
  status: z.enum(readingStatuses).optional(),
  owned: z.boolean().optional(),
  limit: z.number().int().min(1).max(50).default(25),
  cursor: z
    .string()
    .min(1)
    .max(2048)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
});

export const libraryBookSummarySchema = z.strictObject({
  id: z.uuid(),
  title: z.string().min(1).max(500),
  authors: z.array(z.string()).min(1).max(10),
  status: z.enum(readingStatuses),
  rating: z.number().min(0.5).max(5).multipleOf(0.5).nullable(),
  owned: z.boolean().nullable(),
  page_count: z.number().int().min(1).max(100000).nullable(),
  version: z.number().int().positive(),
  created_at: z.iso.datetime({ offset: true }),
});

export const librarySearchResultSchema = z.discriminatedUnion("ok", [
  z.strictObject({
    ok: z.literal(true),
    books: z.array(libraryBookSummarySchema).max(50),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
  z.strictObject({
    ok: z.literal(false),
    error: z.strictObject({
      code: z.enum(["VALIDATION_ERROR", "UPSTREAM_UNAVAILABLE"]),
      message: z.string(),
    }),
  }),
]);

export type LibrarySearchInput = z.output<typeof librarySearchSchema>;
export type LibrarySearchResult = z.output<typeof librarySearchResultSchema>;
