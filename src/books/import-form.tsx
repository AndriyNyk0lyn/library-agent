"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { processImport } from "./import-actions";
import {
  maxImportBytes,
  type ImportChoices,
  type ImportState,
} from "./import-schema";
import { readingStatuses, statusLabels } from "./schemas";

export function ImportForm() {
  const [file, setFile] = useState<File>();
  const [state, setState] = useState<ImportState>({});
  const [mappings, setMappings] = useState<ImportChoices["mappings"]>({});
  const [mappingShelves, setMappingShelves] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [allowAmbiguous, setAllowAmbiguous] = useState<number[]>([]);
  const [needsPreview, setNeedsPreview] = useState(false);
  const [pending, startTransition] = useTransition();
  function run(confirm: boolean) {
    if (!file) {
      setState({ error: "Choose a CSV first." });
      return;
    }
    const form = new FormData();
    form.set("file", file);
    form.set("confirm", String(confirm));
    form.set(
      "choices",
      JSON.stringify({
        mappings,
        ...(confirm ? { selected } : {}),
        allowAmbiguous,
      }),
    );
    startTransition(async () => {
      try {
        const result = await processImport(form);
        setState(result);
        if (result.report && !confirm) {
          setMappingShelves((previous) => [
            ...new Set([...previous, ...(result.report?.shelves ?? [])]),
          ]);
          setSelected(
            result.report.rows
              .filter((row) => row.code === "ready")
              .map((row) => row.row),
          );
          setNeedsPreview(false);
        }
      } catch {
        setState((previous) => ({
          ...previous,
          error:
            "Import response was interrupted. Retry the same CSV and selection; committed rows will be skipped.",
        }));
      }
    });
  }
  const report = state.report;
  const excluded = report ? report.rows.length - selected.length : 0;
  return (
    <div className="space-y-6">
      {state.error ? <p role="alert">{state.error}</p> : null}
      <fieldset disabled={pending} className="space-y-4">
        <legend className="sr-only">Import CSV</legend>
        <label htmlFor="goodreads-file" className="form-label">
          UTF-8 CSV (up to 2 MB and 1,000 books)
        </label>
        <input
          id="goodreads-file"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const next = event.target.files?.[0];
            setFile(next);
            setMappings({});
            setMappingShelves([]);
            setSelected([]);
            setAllowAmbiguous([]);
            setState(
              next && next.size > maxImportBytes
                ? { error: "CSV exceeds 2 MB." }
                : {},
            );
            setNeedsPreview(false);
          }}
        />
        <button
          type="button"
          className="button-primary"
          disabled={!file || file.size > maxImportBytes}
          onClick={() => run(false)}
        >
          {pending ? "Processing CSV…" : "Preview CSV"}
        </button>
        {mappingShelves.length ? (
          <section className="space-y-3">
            <h2 className="font-semibold">Shelf mappings</h2>
            <p>
              Unmapped shelves stay excluded. Apply mappings with Preview CSV
              before importing.
            </p>
            {mappingShelves.map((shelf, index) => (
              <div key={shelf}>
                <label htmlFor={`shelf-${index}`} className="form-label">
                  {shelf || "Blank exclusive shelf"}
                </label>
                <select
                  id={`shelf-${index}`}
                  value={mappings[shelf] ?? ""}
                  className="form-field"
                  onChange={(event) => {
                    const value = event.target.value;
                    setMappings((previous) => {
                      const next = { ...previous };
                      const status = readingStatuses.find(
                        (status) => status === value,
                      );
                      if (status) next[shelf] = status;
                      else delete next[shelf];
                      return next;
                    });
                    setNeedsPreview(true);
                  }}
                >
                  <option value="">Exclude</option>
                  {readingStatuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </section>
        ) : null}
        {report ? (
          <>
            <p role="status">
              {state.confirmed
                ? `Added ${report.added}; skipped ${report.skipped}; failed ${report.failed}; uncertain ${report.uncertain}; excluded ${report.excluded}.`
                : `Selected ${selected.length}; excluded ${excluded}; duplicates ${report.rows.filter((row) => row.code === "duplicate").length}.`}
            </p>
            {state.confirmed ? (
              <p>
                Retry this same CSV and selection if any batch was uncertain.
                Rows already committed will be skipped.
              </p>
            ) : (
              <p>
                Ambiguous matches stay excluded until you select “Import as a
                separate edition”. No records are merged.
              </p>
            )}
            <ul className="space-y-4" aria-label="Import preview">
              {report.rows.map((row) => (
                <li
                  key={row.row}
                  className="rounded border border-line p-4 space-y-2"
                >
                  <h3 className="font-semibold">
                    Row {row.row}: {row.title} — {row.authors.join(", ")}
                  </h3>
                  <p>
                    {row.status ? statusLabels[row.status] : "Unmapped shelf"} ·
                    Rating {row.rating ?? "Unrated"} · {row.code}
                  </p>
                  {row.error ? <p>{row.error}</p> : null}
                  {row.warnings.length ? (
                    <ul aria-label="Row warnings">
                      {row.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : null}
                  {row.candidates.length ? (
                    <div>
                      <p>Existing title/author candidates:</p>
                      <ul>
                        {row.candidates.map((candidate) => (
                          <li key={candidate.id}>
                            <Link
                              href={`/library/${candidate.id}`}
                              className="text-link"
                            >
                              {candidate.title} — {candidate.authors.join(", ")}
                            </Link>{" "}
                            · ISBN{" "}
                            {candidate.isbn13 ?? candidate.isbn10 ?? "Unknown"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {!state.confirmed &&
                  (row.code === "ready" || row.code === "ambiguous") ? (
                    <label className="flex gap-2">
                      <input
                        type="checkbox"
                        checked={selected.includes(row.row)}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setSelected((previous) =>
                            checked
                              ? [...previous, row.row]
                              : previous.filter((number) => number !== row.row),
                          );
                          if (row.code === "ambiguous")
                            setAllowAmbiguous((previous) =>
                              checked
                                ? [...previous, row.row]
                                : previous.filter(
                                    (number) => number !== row.row,
                                  ),
                            );
                        }}
                      />
                      {row.code === "ambiguous"
                        ? "Import as a separate edition"
                        : "Import this row"}
                    </label>
                  ) : null}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="button-primary"
              disabled={needsPreview || selected.length === 0}
              onClick={() => run(true)}
            >
              {state.confirmed
                ? "Retry selected import"
                : `Confirm import of ${selected.length} selected books`}
            </button>
            {needsPreview ? (
              <p>Preview again to apply the changed mappings.</p>
            ) : null}
          </>
        ) : null}
      </fieldset>
      <Link href="/library" className="text-link">
        Back to library
      </Link>
    </div>
  );
}
