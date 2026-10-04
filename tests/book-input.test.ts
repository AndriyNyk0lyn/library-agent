import { describe, expect, it } from "vitest";
import {
  createBookSchema,
  parseBookForm,
  sameBookCreation,
} from "@/books/schemas";

const validBook = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "  Test title  ",
  authors: ["Test Author"],
  status: "want_to_read",
  rating: "",
  owned: null,
  notes: "A note\nwith another line.",
  page_count: "",
};

describe("manual book input", () => {
  it("keeps unknown values absent, trims identity, and preserves notes", () => {
    const book = createBookSchema.parse(validBook);
    expect(book).toMatchObject({
      title: "Test title",
      rating: null,
      owned: null,
      page_count: null,
      notes: validBook.notes,
    });
  });

  it.each([0, 5.5, 3.7, "not a number"])(
    "rejects invalid rating %s instead of rounding",
    (rating) => {
      expect(createBookSchema.safeParse({ ...validBook, rating }).success).toBe(
        false,
      );
    },
  );

  it.each([0, -1, 3.5, "NaN", "Infinity"])(
    "rejects invalid page count %s",
    (page_count) => {
      expect(
        createBookSchema.safeParse({ ...validBook, page_count }).success,
      ).toBe(false);
    },
  );

  it("splits authors on lines while preserving commas in names and ignores supplied ownership IDs", () => {
    const form = new FormData();
    Object.entries({
      ...validBook,
      authors: "Last, First\nSecond Author",
      owned: "unknown",
      user_id: "an-attacker-id",
    }).forEach(([key, value]) => form.set(key, String(value)));
    const result = parseBookForm(form);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.authors).toEqual(["Last, First", "Second Author"]);
      expect(result.data.owned).toBeNull();
      expect(result.data).not.toHaveProperty("user_id");
    }
  });

  it("distinguishes an identical retry from changed notes or reordered authors", () => {
    const book = createBookSchema.parse({
      ...validBook,
      authors: ["First", "Second"],
    });
    expect(sameBookCreation(book, { ...book })).toBe(true);
    expect(sameBookCreation(book, { ...book, notes: "Different" })).toBe(false);
    expect(
      sameBookCreation(book, { ...book, authors: ["Second", "First"] }),
    ).toBe(false);
  });
});
