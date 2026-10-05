import {
  catalogCandidateSchema,
  catalogSearchResultSchema,
  type CatalogCandidate,
} from "@/books/catalog/schema";
import { catalogBookResultSchema } from "@/books/catalog/tool-schema";

// External recommendation identities come from observed HTTP results, never model-generated metadata.
export class CatalogCandidates {
  private candidates = new Map<string, CatalogCandidate>();
  private references = new Map<string, string>();
  constructor(private prefix: string) {}
  private record(candidate: CatalogCandidate) {
    let reference = this.references.get(candidate.provider_id);
    if (!reference) {
      reference = `${this.prefix}:catalog:${this.references.size + 1}`;
      this.references.set(candidate.provider_id, reference);
    }
    this.candidates.set(reference, catalogCandidateSchema.parse(candidate));
    return { ...candidate, catalog_ref: reference };
  }
  resolve(reference: string) {
    return this.candidates.get(reference);
  }
  annotate(tool: string, output: unknown) {
    if (tool === "search_catalog") {
      const parsed = catalogSearchResultSchema.safeParse(output);
      if (parsed.success && parsed.data.ok)
        return {
          ...parsed.data,
          candidates: parsed.data.candidates.map((candidate) =>
            this.record(candidate),
          ),
        };
    }
    if (tool === "get_catalog_book") {
      const parsed = catalogBookResultSchema.safeParse(output);
      if (parsed.success && parsed.data.ok)
        return {
          ...parsed.data,
          candidate: this.record(parsed.data.candidate),
        };
    }
  }
}
