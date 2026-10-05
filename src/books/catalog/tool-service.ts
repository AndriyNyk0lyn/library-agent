import "server-only";
import type { ReaderContext } from "../service";
import { bookResultSchema, type BookResult } from "../management-schema";
import { getCatalogBookSchema, addCatalogBookSchema } from "./tool-schema";
import { getBookDetails } from "./provider";

export async function getCatalogBook(_reader: ReaderContext, input: unknown) {
  const parsed = getCatalogBookSchema.safeParse(input);
  return parsed.success
    ? getBookDetails(parsed.data.edition_id)
    : {
        ok: false as const,
        error: {
          code: "VALIDATION_ERROR" as const,
          message: "Supply an Open Library edition ID.",
        },
      };
}
export async function addCatalogBook(
  reader: ReaderContext,
  input: unknown,
): Promise<BookResult> {
  const parsed = addCatalogBookSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Supply an edition ID, stable operation UUID and valid optional reader fields.",
      },
    };
  // Recover a durable outcome before contacting the catalog: retries survive outages and later edits.
  const recovery = await reader.supabase
    .rpc("add_catalog_book", { p_input: parsed.data, p_candidate: null })
    .abortSignal(AbortSignal.timeout(10000));
  if (recovery.error)
    return {
      ok: false,
      error: {
        code: "UPSTREAM_UNAVAILABLE",
        message:
          "Could not check this addition. Apply the tool expansion migration; retain the same inputs and operation ID.",
      },
    };
  if (recovery.data !== null) return bookResultSchema.parse(recovery.data);
  const details = await getBookDetails(parsed.data.edition_id);
  if (!details.ok) return details;
  const saved = await reader.supabase
    .rpc("add_catalog_book", {
      p_input: parsed.data,
      p_candidate: details.candidate,
    })
    .abortSignal(AbortSignal.timeout(10000));
  const result = bookResultSchema.safeParse(saved.data);
  return !saved.error && result.success
    ? result.data
    : {
        ok: false,
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message:
            "Addition outcome is uncertain. Check your library or explicitly retry identical inputs and operation ID.",
        },
      };
}
