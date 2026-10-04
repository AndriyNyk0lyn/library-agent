import { z } from "zod";
import { readingStatuses } from "./schemas";

export const maxImportBytes = 2 * 1024 * 1024;
export const importChoicesSchema = z.strictObject({
  mappings: z.record(z.string().max(200), z.enum(readingStatuses)).default({}),
  selected: z.array(z.number().int().min(1).max(1000)).max(1000).optional(),
  allowAmbiguous: z
    .array(z.number().int().min(1).max(1000))
    .max(1000)
    .default([]),
});
export type ImportChoices = z.output<typeof importChoicesSchema>;
export const importBatchResultSchema = z
  .array(
    z.strictObject({
      row: z.number().int().min(1).max(1000),
      code: z.enum(["duplicate", "ambiguous", "ready", "added", "failed"]),
      candidates: z
        .array(
          z.strictObject({
            id: z.uuid(),
            title: z.string(),
            authors: z.array(z.string()),
            isbn10: z.string().nullable(),
            isbn13: z.string().nullable(),
          }),
        )
        .max(10),
    }),
  )
  .max(50);
export type ImportRow = {
  row: number;
  title: string;
  authors: string[];
  shelf: string;
  status: (typeof readingStatuses)[number] | null;
  rating: number | null;
  warnings: string[];
  error?: string;
  code:
    | "excluded"
    | "duplicate"
    | "ambiguous"
    | "ready"
    | "added"
    | "failed"
    | "uncertain";
  candidates: z.output<typeof importBatchResultSchema>[number]["candidates"];
};
export type ImportReport = {
  rows: ImportRow[];
  shelves: string[];
  added: number;
  skipped: number;
  failed: number;
  uncertain: number;
  excluded: number;
};
export type ImportState = {
  error?: string;
  report?: ImportReport;
  confirmed?: boolean;
};
