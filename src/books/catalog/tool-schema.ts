import { z } from "zod";
import { bookPatchSchema } from "../management-schema";
import {
  editionIdSchema,
  catalogCandidateSchema,
  catalogSearchResultSchema,
} from "./schema";

export const getCatalogBookSchema = z.strictObject({
  edition_id: editionIdSchema,
});
export const catalogBookResultSchema = z.discriminatedUnion("ok", [
  z.strictObject({ ok: z.literal(true), candidate: catalogCandidateSchema }),
  catalogSearchResultSchema.options[1],
]);
export const addCatalogBookSchema = z.strictObject({
  operation_id: z.uuid(),
  edition_id: editionIdSchema,
  // Reader inputs can correct metadata, but cannot supply or rewrite provider provenance.
  fields: bookPatchSchema.optional(),
});
