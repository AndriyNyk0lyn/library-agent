import { bookResultSchema } from "@/books/management-schema";
import { librarySearchResultSchema } from "@/books/search-schema";

// These short references are for the model only; database IDs remain server-owned.
// The run prefix prevents references in older continuation history from being reused.
export class RecommendationCandidates {
  private byId = new Map<string, string>();
  private byReference = new Map<string, string>();
  constructor(private prefix: string) {}

  private reference(id: string) {
    let reference = this.byId.get(id);
    if (!reference) {
      reference = `${this.prefix}:${this.byId.size + 1}`;
      this.byId.set(id, reference);
      this.byReference.set(reference, id);
    }
    return reference;
  }

  resolve(reference: string) {
    return this.byReference.get(reference);
  }

  annotate(tool: string, output: unknown): Record<string, unknown> | undefined {
    if (tool === "search_my_library") {
      const result = librarySearchResultSchema.safeParse(output);
      if (!result.success || !result.data.ok) return;
      return {
        ...result.data,
        books: result.data.books.map((book) => ({
          ...book,
          ...(book.status === "want_to_read"
            ? { candidate_ref: this.reference(book.id) }
            : {}),
        })),
      };
    }
    if (
      tool === "get_book" ||
      tool === "update_book" ||
      tool === "add_catalog_book"
    ) {
      const result = bookResultSchema.safeParse(output);
      if (!result.success || !result.data.ok) return;
      const book = result.data.book;
      return {
        ...result.data,
        book: {
          ...book,
          ...(book.status === "want_to_read"
            ? { candidate_ref: this.reference(book.id) }
            : {}),
        },
      };
    }
  }
}
