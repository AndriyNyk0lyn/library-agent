import { z } from "zod";

export const editionIdSchema = z
  .string()
  .regex(/^OL[0-9]+M$/)
  .max(40);
export const catalogSearchSchema = z.strictObject({
  query: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1).max(200).optional(),
  isbn: z
    .string()
    .regex(/^(?:[0-9]{9}[0-9X]|[0-9]{13})$/)
    .optional(),
  limit: z.number().int().min(1).max(10).default(5),
});
export const catalogCandidateSchema = z.strictObject({
  provider: z.literal("open_library"),
  kind: z.enum(["work", "edition"]),
  provider_id: z
    .string()
    .regex(/^OL[0-9]+[WM]$/)
    .max(40),
  source_url: z
    .string()
    .regex(
      /^https:\/\/openlibrary\.org\/(?:works\/OL[0-9]+W|books\/OL[0-9]+M)$/,
    ),
  title: z.string().trim().min(1).max(500),
  authors: z.array(z.string().trim().min(1).max(200)).max(10),
  edition_id: editionIdSchema.nullable(),
  isbn10: z
    .string()
    .regex(/^[0-9]{9}[0-9X]$/)
    .nullable(),
  isbn13: z
    .string()
    .regex(/^[0-9]{13}$/)
    .nullable(),
  page_count: z.number().int().min(1).max(100000).nullable(),
  cover_url: z
    .string()
    .regex(/^https:\/\/covers\.openlibrary\.org\/b\/id\/[0-9]+-M\.jpg$/)
    .nullable(),
  description: z.string().max(2000).nullable(),
  language: z.array(z.string().regex(/^[a-z]{3}$/)).max(10),
  publishers: z.array(z.string().max(200)).max(10),
  publish_date: z.string().max(100).nullable(),
});
export type CatalogCandidate = z.output<typeof catalogCandidateSchema>;
export const catalogSearchResultSchema = z.discriminatedUnion("ok", [
  z.strictObject({
    ok: z.literal(true),
    candidates: z.array(catalogCandidateSchema).max(10),
  }),
  z.strictObject({
    ok: z.literal(false),
    error: z.strictObject({
      code: z.enum(["VALIDATION_ERROR", "UPSTREAM_UNAVAILABLE"]),
      message: z.string(),
    }),
  }),
]);
export type CatalogSearchResult = z.output<typeof catalogSearchResultSchema>;
