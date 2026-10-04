import { z } from "zod";

export const readingStatuses = [
  "want_to_read",
  "reading",
  "finished",
  "dropped",
] as const;
export const statusLabels: Record<(typeof readingStatuses)[number], string> = {
  want_to_read: "Want to read",
  reading: "Reading",
  finished: "Finished",
  dropped: "Dropped",
};

const optionalNumber = z
  .union([z.string(), z.number(), z.null()])
  .transform((value) =>
    value === null || (typeof value === "string" && value.trim() === "")
      ? null
      : Number(value),
  );

export const createBookSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1, "Enter a title.").max(500),
  authors: z
    .array(z.string().trim().min(1).max(200))
    .min(1, "Enter at least one author.")
    .max(10),
  status: z.enum(readingStatuses),
  rating: optionalNumber.pipe(
    z.number().min(0.5).max(5).multipleOf(0.5).nullable(),
  ),
  owned: z.union([z.boolean(), z.null()]),
  notes: z.string().max(20000),
  page_count: optionalNumber.pipe(
    z.number().int().min(1).max(100000).nullable(),
  ),
});

export type CreateBookInput = z.output<typeof createBookSchema>;

export function parseBookForm(form: FormData) {
  const ownership = form.get("owned");
  return createBookSchema.safeParse({
    id: form.get("id"),
    title: form.get("title"),
    authors:
      typeof form.get("authors") === "string"
        ? String(form.get("authors"))
            .split("\n")
            .map((author) => author.trim())
            .filter(Boolean)
        : [],
    status: form.get("status"),
    rating: form.get("rating"),
    owned:
      ownership === "unknown"
        ? null
        : ownership === "owned"
          ? true
          : ownership === "not_owned"
            ? false
            : ownership,
    notes: form.get("notes"),
    page_count: form.get("page_count"),
  });
}

export function sameBookCreation(
  book: CreateBookInput,
  input: CreateBookInput,
) {
  return (
    book.id === input.id &&
    book.title === input.title &&
    book.authors.length === input.authors.length &&
    book.authors.every((author, index) => author === input.authors[index]) &&
    book.status === input.status &&
    book.rating === input.rating &&
    book.owned === input.owned &&
    book.notes === input.notes &&
    book.page_count === input.page_count
  );
}
