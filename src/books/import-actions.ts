"use server";
import { revalidatePath } from "next/cache";
import { requireReader } from "@/auth/reader";
import { importGoodreads } from "./import-service";
import {
  importChoicesSchema,
  maxImportBytes,
  type ImportState,
} from "./import-schema";

export async function processImport(form: FormData): Promise<ImportState> {
  const reader = await requireReader({ writable: true });
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > maxImportBytes)
    return { error: "Choose a UTF-8 CSV up to 2 MB and 1,000 books." };
  try {
    const csv = new TextDecoder("utf-8", { fatal: true }).decode(
      await file.arrayBuffer(),
    );
    const choices = importChoicesSchema.parse(
      JSON.parse(String(form.get("choices") ?? "{}")),
    );
    const confirmed = form.get("confirm") === "true";
    const report = await importGoodreads(reader, csv, choices, confirmed);
    if (confirmed) revalidatePath("/library");
    return { report, confirmed };
  } catch (error) {
    return {
      error:
        error instanceof Error && !error.name.includes("Zod")
          ? error.message
          : "Check the CSV, shelf mappings, and selected rows.",
    };
  }
}
