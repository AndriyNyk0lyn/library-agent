"use client";
import { EditBookFeedback } from "./edit-book-feedback";
import { CheckboxField } from "@/components/ui/checkbox";
import {
  NotesField,
  OwnershipField,
  PageCountField,
  RatingField,
  ReadingStatusField,
} from "@/books/book-fields";

import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { useState, useTransition, useRef } from "react";
import { TextLink } from "@/components/ui/text-link";
import { saveBookEdit } from "./edit-actions";
import { type BookDetails, type BookResult } from "./management-schema";

function fieldsFor(book: BookDetails) {
  return {
    status: book.status,
    rating: book.rating === null ? "" : String(book.rating),
    owned: book.owned === null ? "unknown" : String(book.owned),
    page_count: book.page_count === null ? "" : String(book.page_count),
    notes: book.notes,
    started_at: book.started_at ?? "",
    finished_at: book.finished_at ?? "",
  };
}
export function EditBookForm({ book }: { book: BookDetails }) {
  const [saved, setSaved] = useState(book);
  const [fields, setFields] = useState(fieldsFor(book));
  const [replaceNotes, setReplaceNotes] = useState(false);
  const [result, setResult] = useState<BookResult>();
  const [pending, startTransition] = useTransition();
  const operation = useRef<{ payload: string; id: string } | null>(null);
  const notesChanged = fields.notes !== saved.notes;
  function change(
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
    <form
      className="max-w-2xl space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const input = {
          id: saved.id,
          expected_version: saved.version,
          patch: {
            status: fields.status,
            rating: fields.rating === "" ? null : Number(fields.rating),
            owned: fields.owned === "unknown" ? null : fields.owned === "true",
            page_count:
              fields.page_count === "" ? null : Number(fields.page_count),
            started_at: fields.started_at || null,
            finished_at: fields.finished_at || null,
            ...(notesChanged
              ? { notes: fields.notes, notes_mode: "replace" }
              : {}),
          },
        };
        const payload = JSON.stringify(input);
        if (operation.current?.payload !== payload)
          operation.current = { payload, id: crypto.randomUUID() };
        const operationId = operation.current.id;
        startTransition(async () => {
          try {
            const outcome = await saveBookEdit({
              ...input,
              operation_id: operationId,
            });
            setResult(outcome);
            if (outcome.ok) {
              setSaved(outcome.book);
              setFields(fieldsFor(outcome.book));
              setReplaceNotes(false);
              operation.current = null;
            }
          } catch {
            setResult({
              ok: false,
              error: {
                code: "UPSTREAM_UNAVAILABLE",
                message:
                  "Could not confirm the save. Input retained. Retry unchanged to recover the operation outcome, or reload the current book.",
              },
            });
          }
        });
      }}
    >
      <p className="text-muted">
        Version {saved.version}. Blank optional fields stay unknown.
      </p>
      <EditBookFeedback
        result={result}
        bookId={saved.id}
        onLoadCurrent={(current) => {
          setSaved(current);
          setFields(fieldsFor(current));
          setReplaceNotes(false);
          setResult(undefined);
          operation.current = null;
        }}
      />
      <fieldset disabled={pending} className="space-y-5">
        <legend className="sr-only">Edit book details</legend>
        <ReadingStatusField
          label="Reading status"
          id="edit-status"
          name="status"
          value={fields.status}
          onChange={change}
        />
        <OwnershipField
          label="Ownership"
          id="edit-owned"
          name="owned"
          value={fields.owned}
          onChange={change}
        />
        <RatingField
          label="Rating (optional, out of 5)"
          id="edit-rating"
          name="rating"
          value={fields.rating}
          onChange={change}
        />
        <PageCountField
          label="Pages (optional)"
          id="edit-pages"
          name="page_count"
          value={fields.page_count}
          onChange={change}
        />
        <InputField
          label="Started date (optional)"
          id="edit-started"
          name="started_at"
          type="date"
          value={fields.started_at}
          onChange={change}
        />
        <InputField
          label="Finished date (optional)"
          id="edit-finished"
          name="finished_at"
          type="date"
          value={fields.finished_at}
          onChange={change}
        />
        <div>
          <NotesField
            label="Personal notes"
            id="edit-notes"
            name="notes"
            rows={8}
            value={fields.notes}
            onChange={change}
          />
          {notesChanged ? (
            <CheckboxField
              className="mt-2 flex items-center gap-2"
              label="Replace the saved notes with this text"
              checked={replaceNotes}
              onChange={(event) => setReplaceNotes(event.target.checked)}
              required
            />
          ) : null}
        </div>
        <Button
          type="submit"
          disabled={pending || (notesChanged && !replaceNotes)}
        >
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </fieldset>
      <TextLink href="/library">Back to library</TextLink>
    </form>
  );
}
