import "server-only";
import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { createBookSchema, type CreateBookInput } from "./schemas";
import { bookDateSchema } from "./management-schema";
import {
  maxImportBytes,
  type ImportChoices,
  type ImportRow,
} from "./import-schema";

const standardMappings: Record<string, CreateBookInput["status"]> = {
  "to-read": "want_to_read",
  "currently-reading": "reading",
  read: "finished",
  dnf: "dropped",
  "did-not-finish": "dropped",
  "didn't-finish": "dropped",
  abandoned: "dropped",
};
export type ImportBook = CreateBookInput & {
  isbn10: string | null;
  isbn13: string | null;
  goodreads_book_id: string | null;
  imported_shelves: string[];
  goodreads_date_added: string | null;
  started_at: string | null;
  finished_at: string | null;
};
export type ParsedImportRow = { preview: ImportRow; book: ImportBook | null };

export function parseGoodreads(
  csv: string,
  readerId: string,
  choices: ImportChoices,
): ParsedImportRow[] {
  if (Buffer.byteLength(csv, "utf8") > maxImportBytes)
    throw new Error("Choose a UTF-8 CSV no larger than 2 MB.");
  let cells: string[][];
  try {
    const parsed: unknown = parse(csv, {
      bom: true,
      skip_empty_lines: true,
      max_record_size: maxImportBytes,
    });
    cells = z.array(z.array(z.string())).max(1001).parse(parsed);
  } catch {
    throw new Error(
      "Could not parse this CSV. Check its quoting and the 1,000-row limit.",
    );
  }
  const headers = cells.shift()?.map((header) => header.trim()) ?? [];
  if (
    !headers.includes("Title") ||
    !headers.includes("Author") ||
    !headers.includes("Exclusive Shelf") ||
    new Set(headers).size !== headers.length
  )
    throw new Error(
      "CSV needs unique headers including Title, Author, and Exclusive Shelf.",
    );
  if (!cells.length) throw new Error("The CSV contains no books.");
  return cells.map((values, index) => {
    const row = Object.fromEntries(
      headers.map((header, column) => [header, values[column] ?? ""]),
    );
    const warnings: string[] = [];
    function optional<T>(
      column: string,
      normalize: (value: string) => T | null,
    ): T | null {
      const value = (row[column] ?? "").trim();
      if (
        !value ||
        ((column === "ISBN" || column === "ISBN13") && value === '=""')
      )
        return null;
      const result = normalize(value);
      if (result === null)
        warnings.push(`${column}: invalid value; left unknown.`);
      return result;
    }
    function date(value: string) {
      const parsed = bookDateSchema.safeParse(value.replaceAll("/", "-"));
      return parsed.success ? parsed.data : null;
    }
    function isbn(value: string, length: 10 | 13) {
      const normalized = value
        .replace(/^="(.*)"$/, "$1")
        .replace(/[\s-]/g, "")
        .toUpperCase();
      if (length === 10) {
        if (!/^\d{9}[\dX]$/.test(normalized)) return null;
        const sum = [...normalized].reduce(
          (total, digit, index) =>
            total + (digit === "X" ? 10 : Number(digit)) * (10 - index),
          0,
        );
        return sum % 11 === 0 ? normalized : null;
      }
      if (!/^\d{13}$/.test(normalized)) return null;
      return [...normalized].reduce(
        (total, digit, index) =>
          total + Number(digit) * (index % 2 === 0 ? 1 : 3),
        0,
      ) %
        10 ===
        0
        ? normalized
        : null;
    }
    const shelf = (row["Exclusive Shelf"] ?? "").trim();
    const shelves = [
      ...new Set(
        [
          shelf,
          ...(row.Bookshelves ?? "").split(",").map((value) => value.trim()),
        ].filter(Boolean),
      ),
    ];
    const dnf = shelves.some(
      (value) =>
        Object.hasOwn(standardMappings, value.toLowerCase()) &&
        standardMappings[value.toLowerCase()] === "dropped",
    );
    const status =
      (Object.hasOwn(choices.mappings, shelf)
        ? choices.mappings[shelf]
        : undefined) ??
      (dnf
        ? "dropped"
        : Object.hasOwn(standardMappings, shelf.toLowerCase())
          ? standardMappings[shelf.toLowerCase()]
          : undefined) ??
      null;
    const personalRating = optional("My Rating", (value) => {
      if (value === "0") return 0;
      const parsed = z.coerce
        .number()
        .min(0.5)
        .max(5)
        .multipleOf(0.5)
        .safeParse(value);
      return parsed.success ? parsed.data : null;
    });
    const rating = personalRating === 0 ? null : personalRating;
    const page_count = optional("Number of Pages", (value) => {
      const parsed = z.coerce
        .number()
        .int()
        .min(1)
        .max(100000)
        .safeParse(value);
      return parsed.success ? parsed.data : null;
    });
    const isbn10 = optional("ISBN", (value) => isbn(value, 10));
    const isbn13 = optional("ISBN13", (value) => isbn(value, 13));
    const goodreads_book_id = optional("Book Id", (value) =>
      /^\d{1,30}$/.test(value) ? value : null,
    );
    const finished_at = optional("Date Read", date);
    const goodreads_date_added = optional("Date Added", date);
    let started_at = optional("Date Started", date);
    if (started_at && finished_at && started_at > finished_at) {
      warnings.push("Date Started follows Date Read; start left unknown.");
      started_at = null;
    }
    const review = row["My Review"] ?? "";
    let notes = review ? `Imported Goodreads review:\n${review}` : "";
    if (notes.length > 20000) {
      notes = "";
      warnings.push("My Review: exceeds 20,000 characters; review excluded.");
    }
    const hash = createHash("sha256")
      .update(readerId)
      .update(JSON.stringify(row))
      .digest("hex");
    // A content-derived UUID makes retries of rows without external IDs safe too.
    const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    const input = createBookSchema.safeParse({
      id,
      title: row.Title,
      authors: [row.Author?.trim()].filter(Boolean),
      status: status ?? "want_to_read",
      rating,
      owned: null,
      notes,
      page_count,
    });
    const preview: ImportRow = {
      row: index + 1,
      title: row.Title ?? "",
      authors: [row.Author ?? ""],
      shelf,
      status,
      rating,
      warnings,
      code: "excluded",
      candidates: [],
    };
    if (
      !input.success ||
      shelves.length > 100 ||
      shelves.some((value) => value.length > 200)
    ) {
      preview.error =
        "Check the required title/author or shelf limits. Row excluded.";
      return { preview, book: null };
    }
    return {
      preview,
      book: status
        ? {
            ...input.data,
            isbn10,
            isbn13,
            goodreads_book_id,
            imported_shelves: shelves,
            goodreads_date_added,
            started_at,
            finished_at,
          }
        : null,
    };
  });
}
