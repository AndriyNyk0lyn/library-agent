"use client";
import {
  NotesField,
  OwnershipField,
  PageCountField,
  RatingField,
  ReadingStatusField,
} from "@/books/book-fields";

import { InputField, TextareaField } from "@/components/ui/field";

import { useActionState, useState } from "react";
import { TextLink } from "@/components/ui/text-link";
import { addBook, type BookFormState } from "./actions";
import type { CreateBookInput } from "./schemas";

import { FormFeedback } from "@/components/ui/form-feedback";
import { SubmitButton } from "@/components/ui/submit-button";

export function BookForm({
  bookId,
  initialDetails,
  saveAction = addBook,
}: {
  bookId: string;
  initialDetails?: Pick<CreateBookInput, "title" | "authors" | "page_count">;
  saveAction?: (
    previous: BookFormState,
    form: FormData,
  ) => Promise<BookFormState>;
}) {
  const [state, action] = useActionState(saveAction, {});
  const [fields, setFields] = useState({
    title: initialDetails?.title ?? "",
    authors: initialDetails?.authors.join("\n") ?? "",
    status: "want_to_read",
    rating: "",
    owned: "unknown",
    notes: "",
    page_count: initialDetails?.page_count?.toString() ?? "",
  });
  function updateField(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    setFields((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  return (
    <form action={action} className="max-w-2xl space-y-5">
      <input type="hidden" name="id" value={bookId} />
      <FormFeedback state={state} />
      <InputField
        error={state.fieldErrors?.["title"]}
        label="Title"
        id="title"
        name="title"
        required
        maxLength={500}
        value={fields.title}
        onChange={updateField}
      />
      <TextareaField
        error={state.fieldErrors?.["authors"]}
        label="Authors — one per line"
        id="authors"
        name="authors"
        required
        rows={2}
        value={fields.authors}
        onChange={updateField}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <ReadingStatusField
          error={state.fieldErrors?.["status"]}
          label="Reading status"
          id="status"
          name="status"
          value={fields.status}
          onChange={updateField}
        />
        <OwnershipField
          error={state.fieldErrors?.["owned"]}
          label="Ownership"
          id="owned"
          name="owned"
          value={fields.owned}
          onChange={updateField}
          ownedValue="owned"
          notOwnedValue="not_owned"
        />
        <RatingField
          error={state.fieldErrors?.["rating"]}
          label="Rating (optional, out of 5)"
          id="rating"
          name="rating"
          value={fields.rating}
          onChange={updateField}
        />
        <PageCountField
          error={state.fieldErrors?.["page_count"]}
          label="Pages (optional)"
          id="page_count"
          name="page_count"
          value={fields.page_count}
          onChange={updateField}
        />
      </div>
      <NotesField
        error={state.fieldErrors?.["notes"]}
        label="Notes (optional)"
        id="notes"
        name="notes"
        rows={5}
        value={fields.notes}
        onChange={updateField}
      />
      <div className="flex items-center gap-5">
        <SubmitButton pendingLabel="Saving…">Save book</SubmitButton>
        <TextLink href="/library">Back to library</TextLink>
      </div>
    </form>
  );
}
