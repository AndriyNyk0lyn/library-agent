import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LibraryBookRow } from "@/lib/supabase/database.types";
import { createBookSchema, sameBookCreation } from "./schemas";
import { z } from "zod";
import {
  bookDetailsSchema,
  bookResultSchema,
  getBookSchema,
  updateBookSchema,
  type BookResult,
} from "./management-schema";
import {
  librarySearchSchema,
  libraryBookSummarySchema,
  type LibrarySearchInput,
  type LibrarySearchResult,
} from "./search-schema";

export type ReaderContext = {
  supabase: SupabaseClient<Database>;
  user: { id: string };
};

const cursorSchema = z.strictObject({
  v: z.literal(1),
  created_at: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  query: z.string(),
  status: z.string().nullable(),
  owned: z.boolean().nullable(),
});

function searchFailure(
  code: "VALIDATION_ERROR" | "UPSTREAM_UNAVAILABLE",
  message: string,
) {
  return { ok: false as const, error: { code, message } };
}

// Offset pages keep existing UI URLs; MCP callers use the same query with a keyset cursor.
async function readLibrary(
  { supabase, user }: ReaderContext,
  input: unknown,
  offset = 0,
) {
  const parsed = librarySearchSchema.safeParse(input);
  if (
    !parsed.success ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 249975
  )
    return searchFailure(
      "VALIDATION_ERROR",
      "Check the search query, filters, and pagination.",
    );
  const filters = parsed.data;
  let cursor: z.output<typeof cursorSchema> | undefined;
  if (filters.cursor) {
    try {
      cursor = cursorSchema.parse(
        JSON.parse(Buffer.from(filters.cursor, "base64url").toString("utf8")),
      );
    } catch {
      return searchFailure(
        "VALIDATION_ERROR",
        "Invalid search cursor. Start a new search.",
      );
    }
    if (
      offset !== 0 ||
      cursor.query !== (filters.query ?? "") ||
      cursor.status !== (filters.status ?? null) ||
      cursor.owned !== (filters.owned ?? null)
    )
      return searchFailure(
        "VALIDATION_ERROR",
        "The search filters changed. Start a new search without a cursor.",
      );
  }
  const { data: books, error } = await supabase
    .rpc("search_library_books", {
      p_query: filters.query,
      p_status: filters.status,
      p_owned: filters.owned,
      p_limit: filters.limit + 1,
      p_offset: offset,
      p_before_created_at: cursor?.created_at,
      p_before_id: cursor?.id,
    })
    .eq("user_id", user.id)
    .abortSignal(AbortSignal.timeout(15000));
  if (error || !books)
    return searchFailure(
      "UPSTREAM_UNAVAILABLE",
      error?.code === "PGRST202" ||
        error?.code === "42883" ||
        error?.code === "42P01"
        ? "Book search is not ready. Apply the library search migration using the setup guide."
        : "Could not load your books. Try again, or check the database setup.",
    );
  const visibleBooks = books.slice(0, filters.limit);
  const hasMore = books.length > filters.limit;
  const lastBook = visibleBooks.at(-1);
  const nextCursor =
    hasMore && lastBook
      ? Buffer.from(
          JSON.stringify({
            v: 1,
            created_at: lastBook.created_at,
            id: lastBook.id,
            query: filters.query ?? "",
            status: filters.status ?? null,
            owned: filters.owned ?? null,
          }),
        ).toString("base64url")
      : null;
  return { ok: true as const, books: visibleBooks, hasMore, nextCursor };
}

export async function searchMyLibrary(
  reader: ReaderContext,
  input: unknown,
): Promise<LibrarySearchResult> {
  const result = await readLibrary(reader, input);
  if (!result.ok) return result;
  const summaries = z
    .array(libraryBookSummarySchema)
    .max(50)
    .safeParse(
      result.books.map(
        ({
          id,
          title,
          authors,
          status,
          rating,
          owned,
          page_count,
          version,
          created_at,
        }) => ({
          id,
          title,
          authors,
          status,
          rating,
          owned,
          page_count,
          version,
          created_at,
        }),
      ),
    );
  if (!summaries.success)
    return searchFailure(
      "UPSTREAM_UNAVAILABLE",
      "Book storage returned unexpected records. Try again after checking the database setup.",
    );
  return { ...result, books: summaries.data };
}

export async function listBooks(
  reader: ReaderContext,
  page: number,
  filters: Pick<LibrarySearchInput, "query" | "status" | "owned"> = {},
) {
  const result = await readLibrary(
    reader,
    { ...filters, limit: 25 },
    (page - 1) * 25,
  );
  return result.ok
    ? { books: result.books, hasMore: result.hasMore, error: null }
    : { books: [], hasMore: false, error: result.error.message };
}

type SaveResult =
  { book: LibraryBookRow; error: null } | { book: null; error: string };

export async function createBook(
  { supabase, user }: ReaderContext,
  input: unknown,
): Promise<SaveResult> {
  const result = createBookSchema.safeParse(input);
  if (!result.success)
    return { book: null, error: "Check the book details and try again." };
  const { data: book, error } = await supabase
    .from("library_books")
    .insert({ ...result.data, user_id: user.id })
    .select()
    .abortSignal(AbortSignal.timeout(15000))
    .single();
  if (!error) return { book, error: null };

  // A stable book ID lets a manual retry recover a committed insert without repeating it.
  if (error.code === "23505") {
    const { data: existingBook, error: readError } = await supabase
      .from("library_books")
      .select()
      .eq("user_id", user.id)
      .eq("id", result.data.id)
      .abortSignal(AbortSignal.timeout(15000))
      .maybeSingle();
    if (
      !readError &&
      existingBook &&
      sameBookCreation(existingBook, result.data)
    )
      return { book: existingBook, error: null };
    return {
      book: null,
      error:
        "This save ID is already used. Check your library before starting a new book entry.",
    };
  }

  return {
    book: null,
    error:
      "Could not confirm this save. Your input is retained. Check your library, or retry with these same details; the save ID prevents duplicates.",
  };
}

export async function getBook(
  reader: ReaderContext,
  input: unknown,
): Promise<BookResult> {
  const parsed = getBookSchema.safeParse(input);
  if (!parsed.success)
    return bookFailure("VALIDATION_ERROR", "Enter a book UUID.");
  try {
    const { data, error } = await reader.supabase
      .from("library_books")
      .select()
      .eq("user_id", reader.user.id)
      .eq("id", parsed.data.id)
      .abortSignal(AbortSignal.timeout(15000))
      .maybeSingle();
    if (error)
      return bookFailure(
        "UPSTREAM_UNAVAILABLE",
        "Could not load this book. Check the management migration and try again.",
      );
    if (!data)
      return bookFailure("NOT_FOUND", "Book not found in your library.");
    const { user_id: owner, ...details } = data;
    if (owner !== reader.user.id)
      return bookFailure("NOT_FOUND", "Book not found in your library.");
    const book = bookDetailsSchema.safeParse(details);
    return book.success
      ? { ok: true, book: book.data }
      : bookFailure(
          "UPSTREAM_UNAVAILABLE",
          "Unexpected book fields. Apply the management migration.",
        );
  } catch {
    return bookFailure(
      "UPSTREAM_UNAVAILABLE",
      "Could not load this book. Try again.",
    );
  }
}

export function bookFailure(
  code: Extract<BookResult, { ok: false }>["error"]["code"],
  message: string,
): BookResult {
  return { ok: false, error: { code, message } };
}

export async function updateBook(
  reader: ReaderContext,
  input: unknown,
): Promise<BookResult> {
  const parsed = updateBookSchema.safeParse(input);
  if (!parsed.success)
    return bookFailure(
      "VALIDATION_ERROR",
      "Check the allowed fields, rating, pages, dates, version, and operation ID.",
    );
  try {
    const { data, error } = await reader.supabase
      .rpc("update_library_book", {
        p_id: parsed.data.id,
        p_expected_version: parsed.data.expected_version,
        p_operation_id: parsed.data.operation_id,
        p_patch: parsed.data.patch,
      })
      .abortSignal(AbortSignal.timeout(15000));
    if (error)
      return bookFailure(
        "UPSTREAM_UNAVAILABLE",
        "Could not confirm this save. Keep the same inputs and operation ID to retry, or read the current book first. Check the management migration.",
      );
    const result = bookResultSchema.safeParse(data);
    return result.success
      ? result.data
      : bookFailure(
          "UPSTREAM_UNAVAILABLE",
          "Could not confirm the saved result. Read the current book before changing the operation ID.",
        );
  } catch {
    return bookFailure(
      "UPSTREAM_UNAVAILABLE",
      "Save outcome is uncertain. Retry the same inputs and operation ID, or read the current book.",
    );
  }
}
