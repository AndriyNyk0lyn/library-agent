"use client";
import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { saveBookEdit } from "./edit-actions";
import { readingStatuses, statusLabels } from "./schemas";
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
      {result?.ok ? (
        <p role="status">Book saved. Version {result.book.version}.</p>
      ) : result ? (
        <section
          role="alert"
          className="space-y-3 rounded border border-line p-4"
        >
          <p>
            {result.error.code}: {result.error.message}
          </p>
          {result.current ? (
            <>
              <h2 className="font-semibold">
                Current saved version {result.current.version}
              </h2>
              <p>
                {statusLabels[result.current.status]} · Rating{" "}
                {result.current.rating ?? "Unrated"} · Pages{" "}
                {result.current.page_count ?? "Unknown"} · Ownership{" "}
                {result.current.owned === null
                  ? "Unknown"
                  : result.current.owned
                    ? "Owned"
                    : "Not owned"}
              </p>
              <p>
                Started {result.current.started_at ?? "Unknown"}; finished{" "}
                {result.current.finished_at ?? "Unknown"}
              </p>
              <p className="whitespace-pre-wrap break-words">
                {result.current.notes || "No notes"}
              </p>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  if (result.current) {
                    setSaved(result.current);
                    setFields(fieldsFor(result.current));
                    setReplaceNotes(false);
                    setResult(undefined);
                    operation.current = null;
                  }
                }}
              >
                Load this version into the form
              </button>
              <p>Your draft stays in the form until you load this version.</p>
            </>
          ) : (
            <a href={`/library/${saved.id}`} className="text-link">
              Reload current book
            </a>
          )}
        </section>
      ) : null}
      <fieldset disabled={pending} className="space-y-5">
        <legend className="sr-only">Edit book details</legend>
        <div>
          <label className="form-label" htmlFor="edit-status">
            Reading status
          </label>
          <select
            id="edit-status"
            name="status"
            value={fields.status}
            onChange={change}
            className="form-field"
          >
            {readingStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="edit-owned">
            Ownership
          </label>
          <select
            id="edit-owned"
            name="owned"
            value={fields.owned}
            onChange={change}
            className="form-field"
          >
            <option value="unknown">Unknown</option>
            <option value="true">Owned</option>
            <option value="false">Not owned</option>
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="edit-rating">
            Rating (optional, out of 5)
          </label>
          <input
            id="edit-rating"
            name="rating"
            type="number"
            min={0.5}
            max={5}
            step={0.5}
            value={fields.rating}
            onChange={change}
            className="form-field"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="edit-pages">
            Pages (optional)
          </label>
          <input
            id="edit-pages"
            name="page_count"
            type="number"
            min={1}
            max={100000}
            step={1}
            value={fields.page_count}
            onChange={change}
            className="form-field"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="edit-started">
            Started date (optional)
          </label>
          <input
            id="edit-started"
            name="started_at"
            type="date"
            value={fields.started_at}
            onChange={change}
            className="form-field"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="edit-finished">
            Finished date (optional)
          </label>
          <input
            id="edit-finished"
            name="finished_at"
            type="date"
            value={fields.finished_at}
            onChange={change}
            className="form-field"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="edit-notes">
            Personal notes
          </label>
          <textarea
            id="edit-notes"
            name="notes"
            maxLength={20000}
            rows={8}
            value={fields.notes}
            onChange={change}
            className="form-field"
          />
          {notesChanged ? (
            <label className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={replaceNotes}
                onChange={(event) => setReplaceNotes(event.target.checked)}
                required
              />
              Replace the saved notes with this text
            </label>
          ) : null}
        </div>
        <button
          className="button-primary"
          type="submit"
          disabled={pending || (notesChanged && !replaceNotes)}
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </fieldset>
      <Link href="/library" className="text-link">
        Back to library
      </Link>
    </form>
  );
}
