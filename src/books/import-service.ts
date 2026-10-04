import "server-only";
import {
  importBatchResultSchema,
  importChoicesSchema,
  type ImportReport,
} from "./import-schema";
import { parseGoodreads } from "./goodreads";
import type { ReaderContext } from "./service";

export async function importGoodreads(
  reader: ReaderContext,
  csv: string,
  input: unknown,
  confirm: boolean,
): Promise<ImportReport> {
  const choices = importChoicesSchema.parse(input);
  if (confirm && !choices.selected)
    throw new Error("Select preview rows before confirming.");
  const rows = parseGoodreads(csv, reader.user.id, choices);
  const selected = new Set(choices.selected);
  const allowAmbiguous = new Set(choices.allowAmbiguous);
  const seen = new Set<string>();
  const uniqueRows = rows.filter((row) => {
    if (!row.book) return false;
    const keys = [
      row.book.id,
      ...(row.book.goodreads_book_id
        ? [`gr:${row.book.goodreads_book_id}`]
        : [
            row.book.isbn10 ? `isbn10:${row.book.isbn10}` : "",
            row.book.isbn13 ? `isbn13:${row.book.isbn13}` : "",
          ].filter(Boolean)),
    ];
    if (keys.some((key) => seen.has(key))) {
      if (!confirm || selected.has(row.preview.row))
        row.preview.code = "duplicate";
      return false;
    }
    keys.forEach((key) => seen.add(key));
    return true;
  });
  const csvAmbiguous = new Set<number>();
  for (const row of uniqueRows) {
    const candidates = uniqueRows.filter(
      (candidate) =>
        candidate !== row &&
        candidate.preview.title.trim().toLowerCase() ===
          row.preview.title.trim().toLowerCase() &&
        candidate.preview.authors.some((author) =>
          row.preview.authors.some(
            (other) =>
              author.trim().toLowerCase() === other.trim().toLowerCase(),
          ),
        ),
    );
    if (candidates.length) {
      csvAmbiguous.add(row.preview.row);
      row.preview.warnings.push(
        `Other title/author candidates in this CSV: rows ${candidates
          .slice(0, 10)
          .map((candidate) => candidate.preview.row)
          .join(", ")}. Select explicitly to keep separate editions.`,
      );
    }
  }
  const eligible = uniqueRows.filter((row) => {
    if (confirm && !selected.has(row.preview.row)) return false;
    if (
      confirm &&
      csvAmbiguous.has(row.preview.row) &&
      !allowAmbiguous.has(row.preview.row)
    ) {
      row.preview.code = "ambiguous";
      return false;
    }
    return true;
  });
  for (let offset = 0; offset < eligible.length; offset += 50) {
    const batch = eligible.slice(offset, offset + 50);
    try {
      const { data, error } = await reader.supabase
        .rpc("import_library_batch", {
          p_rows: batch.map(({ preview, book }) => ({
            row: preview.row,
            book,
            allow_ambiguous: allowAmbiguous.has(preview.row),
          })),
          p_confirm: confirm,
        })
        .abortSignal(AbortSignal.timeout(15000));
      const parsed = importBatchResultSchema.safeParse(data);
      if (
        error ||
        !parsed.success ||
        parsed.data.length !== batch.length ||
        parsed.data.some(
          (result, index) => result.row !== batch[index].preview.row,
        )
      )
        throw new Error(
          "Could not confirm this batch. Check the import migration, then retry this same CSV and selection; committed rows will be skipped.",
        );
      for (const [index, result] of parsed.data.entries()) {
        batch[index].preview.code = result.code;
        batch[index].preview.candidates = result.candidates;
        if (result.code === "failed")
          batch[index].preview.error =
            "Book storage rejected this row. Check its fields.";
      }
    } catch (error) {
      if (!confirm)
        throw new Error(
          "Could not check duplicates. Apply the management migration and try preview again.",
        );
      for (const row of batch) {
        row.preview.code = "uncertain";
        row.preview.error =
          error instanceof Error
            ? error.message
            : "Batch outcome is uncertain. Retry the same CSV; committed rows will be skipped.";
      }
    }
  }
  if (!confirm) {
    for (const row of eligible) {
      if (
        row.preview.code === "ready" &&
        csvAmbiguous.has(row.preview.row) &&
        !allowAmbiguous.has(row.preview.row)
      )
        row.preview.code = "ambiguous";
    }
  }
  const previews = rows.map(({ preview }) => preview);
  return {
    rows: previews,
    shelves: [
      ...new Set(previews.filter((row) => !row.status).map((row) => row.shelf)),
    ],
    added: previews.filter((row) => row.code === "added").length,
    skipped: previews.filter((row) => row.code === "duplicate").length,
    failed: previews.filter((row) => row.code === "failed").length,
    uncertain: previews.filter((row) => row.code === "uncertain").length,
    excluded: previews.filter(
      (row) => row.code === "excluded" || row.code === "ambiguous",
    ).length,
  };
}
