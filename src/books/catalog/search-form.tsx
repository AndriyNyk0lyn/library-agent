"use client";

import Form from "next/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function CatalogSearchForm({
  query,
  author,
  isbn,
}: {
  query: string;
  author: string;
  isbn: string;
}) {
  return (
    <Form action="/library/catalog" className="max-w-2xl space-y-4">
      <div>
        <label htmlFor="query" className="form-label">
          Title or search query
        </label>
        <input
          id="query"
          name="query"
          maxLength={200}
          defaultValue={query}
          className="form-field"
        />
      </div>
      <div>
        <label htmlFor="author" className="form-label">
          Author (optional)
        </label>
        <input
          id="author"
          name="author"
          maxLength={200}
          defaultValue={author}
          className="form-field"
        />
      </div>
      <div>
        <label htmlFor="isbn" className="form-label">
          ISBN (optional, without hyphens)
        </label>
        <input
          id="isbn"
          name="isbn"
          maxLength={13}
          defaultValue={isbn}
          className="form-field"
        />
      </div>
      <SubmitButton pendingLabel="Searching Open Library…">
        Search Open Library
      </SubmitButton>
    </Form>
  );
}
