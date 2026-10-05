"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { addBook, type BookFormState } from "./actions";
import type { CreateBookInput } from "./schemas";
import { readingStatuses, statusLabels } from "./schemas";
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
  function fieldError(name: string) {
    const errors = state.fieldErrors?.[name];
    return errors ? (
      <p id={`${name}-error`} className="mt-1 text-sm text-red-800">
        {errors.join(" ")}
      </p>
    ) : null;
  }
  const invalid = (name: string) =>
    state.fieldErrors?.[name] ? true : undefined;
  const describedBy = (name: string) =>
    state.fieldErrors?.[name] ? `${name}-error` : undefined;

  return (
    <form action={action} className="max-w-2xl space-y-5">
      <input type="hidden" name="id" value={bookId} />
      <FormFeedback state={state} />
      <div>
        <label htmlFor="title" className="form-label">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={500}
          value={fields.title}
          onChange={updateField}
          className="form-field"
          aria-invalid={invalid("title")}
          aria-describedby={describedBy("title")}
        />
        {fieldError("title")}
      </div>
      <div>
        <label htmlFor="authors" className="form-label">
          Authors — one per line
        </label>
        <textarea
          id="authors"
          name="authors"
          required
          rows={2}
          value={fields.authors}
          onChange={updateField}
          className="form-field"
          aria-invalid={invalid("authors")}
          aria-describedby={describedBy("authors")}
        />
        {fieldError("authors")}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="status" className="form-label">
            Reading status
          </label>
          <select
            id="status"
            name="status"
            value={fields.status}
            onChange={updateField}
            className="form-field"
            aria-invalid={invalid("status")}
            aria-describedby={describedBy("status")}
          >
            {readingStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
          {fieldError("status")}
        </div>
        <div>
          <label htmlFor="owned" className="form-label">
            Ownership
          </label>
          <select
            id="owned"
            name="owned"
            value={fields.owned}
            onChange={updateField}
            className="form-field"
            aria-invalid={invalid("owned")}
            aria-describedby={describedBy("owned")}
          >
            <option value="unknown">Unknown</option>
            <option value="owned">Owned</option>
            <option value="not_owned">Not owned</option>
          </select>
          {fieldError("owned")}
        </div>
        <div>
          <label htmlFor="rating" className="form-label">
            Rating (optional, out of 5)
          </label>
          <input
            id="rating"
            name="rating"
            type="number"
            min={0.5}
            max={5}
            step={0.5}
            value={fields.rating}
            onChange={updateField}
            className="form-field"
            aria-invalid={invalid("rating")}
            aria-describedby={describedBy("rating")}
          />
          {fieldError("rating")}
        </div>
        <div>
          <label htmlFor="page_count" className="form-label">
            Pages (optional)
          </label>
          <input
            id="page_count"
            name="page_count"
            type="number"
            min={1}
            max={100000}
            step={1}
            value={fields.page_count}
            onChange={updateField}
            className="form-field"
            aria-invalid={invalid("page_count")}
            aria-describedby={describedBy("page_count")}
          />
          {fieldError("page_count")}
        </div>
      </div>
      <div>
        <label htmlFor="notes" className="form-label">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={5}
          maxLength={20000}
          value={fields.notes}
          onChange={updateField}
          className="form-field"
          aria-invalid={invalid("notes")}
          aria-describedby={describedBy("notes")}
        />
        {fieldError("notes")}
      </div>
      <div className="flex items-center gap-5">
        <SubmitButton pendingLabel="Saving…">Save book</SubmitButton>
        <Link href="/library" className="text-link">
          Back to library
        </Link>
      </div>
    </form>
  );
}
