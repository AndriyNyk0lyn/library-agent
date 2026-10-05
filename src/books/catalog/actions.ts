import "server-only";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireReader } from "@/auth/reader";
import { parseBookForm } from "@/books/schemas";
import { createBook } from "@/books/service";
import type { BookFormState } from "@/books/actions";
import { catalogEnabled } from "./config";
import { catalogCandidateSchema, type CatalogCandidate } from "./schema";

// Called by the edition page action with its encrypted closure snapshot; retries never refetch metadata.
export async function addCatalogBook(
  candidate: CatalogCandidate,
  _previous: BookFormState,
  form: FormData,
): Promise<BookFormState> {
  const reader = await requireReader({ writable: true });
  if (!catalogEnabled())
    return { error: "Catalog discovery is disabled. Add the book manually." };
  const edition = catalogCandidateSchema.safeParse(candidate);
  if (!edition.success || edition.data.kind !== "edition")
    return { error: "Choose an edition again before saving." };
  const input = parseBookForm(form);
  if (!input.success)
    return {
      error: "Check the highlighted book details.",
      fieldErrors: input.error.flatten().fieldErrors,
    };
  let result;
  try {
    result = await createBook(reader, {
      ...input.data,
      isbn10: edition.data.isbn10,
      isbn13: edition.data.isbn13,
      catalog_metadata: edition.data,
    });
  } catch {
    return {
      error:
        "Could not confirm this save. Keep these details and retry, or check your library first. The same save ID prevents duplicates.",
    };
  }
  if (!result.book) return { error: result.error };
  revalidatePath("/library");
  redirect(`/library/${result.book.id}`);
}
