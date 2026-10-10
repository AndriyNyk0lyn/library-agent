"use client";
import { InputField } from "@/components/ui/field";

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
      <InputField
        label="Title or search query"
        id="query"
        name="query"
        maxLength={200}
        defaultValue={query}
      />
      <InputField
        label="Author (optional)"
        id="author"
        name="author"
        maxLength={200}
        defaultValue={author}
      />
      <InputField
        label="ISBN (optional, without hyphens)"
        id="isbn"
        name="isbn"
        maxLength={13}
        defaultValue={isbn}
      />
      <SubmitButton pendingLabel="Searching Open Library…">
        Search Open Library
      </SubmitButton>
    </Form>
  );
}
