import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LibraryBookRow } from "@/lib/supabase/database.types";
import { createBookSchema, sameBookCreation } from "./schemas";

type ReaderContext = {
  supabase: SupabaseClient<Database>;
  user: { id: string };
};

export async function listBooks(
  { supabase, user }: ReaderContext,
  page: number,
) {
  const pageSize = 25;
  const { data: books, error } = await supabase
    .from("library_books")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize);
  if (error)
    return {
      books: [],
      hasMore: false,
      error:
        error.code === "PGRST205" || error.code === "42P01"
          ? "Book storage is not ready. Apply the library migration using the setup guide."
          : "Could not load your books. Try again, or check the database setup.",
    };
  return {
    books: books.slice(0, pageSize),
    hasMore: books.length > pageSize,
    error: null,
  };
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
    .single();
  if (!error) return { book, error: null };

  // A stable book ID lets a manual retry recover a committed insert without repeating it.
  if (error.code === "23505") {
    const { data: existingBook, error: readError } = await supabase
      .from("library_books")
      .select()
      .eq("user_id", user.id)
      .eq("id", result.data.id)
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
