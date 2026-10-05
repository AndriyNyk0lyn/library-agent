import { z } from "zod";
import { bookPatchSchema, bookResultSchema } from "./management-schema";
import { librarySearchSchema } from "./search-schema";

export const bulkFiltersSchema = librarySearchSchema.pick({
  query: true,
  status: true,
  owned: true,
});
export const previewBookUpdateSchema = z.strictObject({
  preview_id: z.uuid(),
  filters: bulkFiltersSchema,
  patch: bookPatchSchema,
});
export const applyBookUpdateSchema = z.strictObject({
  preview_id: z.uuid(),
  operation_id: z.uuid(),
});
export const bulkUpdateResultSchema = z.discriminatedUnion("ok", [
  z.strictObject({
    ok: z.literal(true),
    preview_id: z.uuid(),
    matched_count: z.number().int().min(0).max(5000),
    applied: z.boolean(),
    changed_count: z.number().int().min(0).max(5000),
    patch: bookPatchSchema,
    sample: z
      .array(
        z.strictObject({
          id: z.uuid(),
          title: z.string(),
          authors: z.array(z.string()),
        }),
      )
      .max(5),
    expires_at: z.iso.datetime({ offset: true }),
  }),
  bookResultSchema.options[1].omit({ current: true }),
]);
export type BulkUpdateResult = z.output<typeof bulkUpdateResultSchema>;
