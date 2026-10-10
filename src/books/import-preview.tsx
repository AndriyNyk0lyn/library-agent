import type { ChangeEventHandler } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckboxField } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { CardListItem } from "@/components/ui/card";
import { TextLink } from "@/components/ui/text-link";
import { StatusMessage } from "@/components/ui/feedback";
import { ReadingStatusField } from "./book-fields";
import {
  maxImportBytes,
  type ImportChoices,
  type ImportReport,
  type ImportRow,
} from "./import-schema";
import { statusLabels } from "./schemas";

export function ImportFileSelection({
  file,
  pending,
  onChange,
  onPreview,
}: {
  file?: File;
  pending: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onPreview: () => void;
}) {
  return (
    <>
      <Label htmlFor="goodreads-file">
        UTF-8 CSV (up to 2 MB and 1,000 books)
      </Label>
      <Input
        id="goodreads-file"
        type="file"
        accept=".csv,text/csv"
        onChange={onChange}
      />
      <Button
        type="button"
        disabled={!file || file.size > maxImportBytes}
        onClick={onPreview}
      >
        {pending ? "Processing CSV…" : "Preview CSV"}
      </Button>
    </>
  );
}
export function ShelfMappings({
  shelves,
  mappings,
  onChange,
}: {
  shelves: string[];
  mappings: ImportChoices["mappings"];
  onChange: (shelf: string, value: string) => void;
}) {
  if (!shelves.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Shelf mappings</h2>
      <p>
        Unmapped shelves stay excluded. Apply mappings with Preview CSV before
        importing.
      </p>
      {shelves.map((shelf, index) => (
        <ReadingStatusField
          key={shelf}
          id={`shelf-${index}`}
          label={shelf || "Blank exclusive shelf"}
          value={mappings[shelf] ?? ""}
          emptyLabel="Exclude"
          onChange={(event) => onChange(shelf, event.target.value)}
        />
      ))}
    </section>
  );
}
export function ImportReportSummary({
  report,
  confirmed,
  selectedCount,
}: {
  report: ImportReport;
  confirmed: boolean;
  selectedCount: number;
}) {
  return (
    <>
      <StatusMessage>
        {confirmed
          ? `Added ${report.added}; skipped ${report.skipped}; failed ${report.failed}; uncertain ${report.uncertain}; excluded ${report.excluded}.`
          : `Selected ${selectedCount}; excluded ${report.rows.length - selectedCount}; duplicates ${report.rows.filter((row) => row.code === "duplicate").length}.`}
      </StatusMessage>
      <p>
        {confirmed
          ? "Retry this same CSV and selection if any batch was uncertain. Rows already committed will be skipped."
          : "Ambiguous matches stay excluded until you select “Import as a separate edition”. No records are merged."}
      </p>
    </>
  );
}
export function ImportWarnings({ warnings }: { warnings: string[] }) {
  return warnings.length ? (
    <ul aria-label="Row warnings">
      {warnings.map((warning) => (
        <li key={warning}>{warning}</li>
      ))}
    </ul>
  ) : null;
}
export function ImportDuplicateCandidates({
  candidates,
}: {
  candidates: ImportRow["candidates"];
}) {
  return candidates.length ? (
    <div>
      <p>Existing title/author candidates:</p>
      <ul>
        {candidates.map((candidate) => (
          <li key={candidate.id}>
            <TextLink href={`/library/${candidate.id}`}>
              {candidate.title} — {candidate.authors.join(", ")}
            </TextLink>{" "}
            · ISBN {candidate.isbn13 ?? candidate.isbn10 ?? "Unknown"}
          </li>
        ))}
      </ul>
    </div>
  ) : null;
}
export function ImportPreviewRow({
  row,
  confirmed,
  selected,
  onSelect,
}: {
  row: ImportRow;
  confirmed: boolean;
  selected: boolean;
  onSelect: (row: ImportRow, checked: boolean) => void;
}) {
  return (
    <CardListItem className="p-4 space-y-2 bg-transparent">
      <h3 className="font-semibold">
        Row {row.row}: {row.title} — {row.authors.join(", ")}
      </h3>
      <p>
        {row.status ? statusLabels[row.status] : "Unmapped shelf"} · Rating{" "}
        {row.rating ?? "Unrated"} · {row.code}
      </p>
      {row.error ? <p>{row.error}</p> : null}
      <ImportWarnings warnings={row.warnings} />
      <ImportDuplicateCandidates candidates={row.candidates} />
      {!confirmed && (row.code === "ready" || row.code === "ambiguous") ? (
        <CheckboxField
          checked={selected}
          onChange={(event) => onSelect(row, event.target.checked)}
          label={
            row.code === "ambiguous"
              ? "Import as a separate edition"
              : "Import this row"
          }
        />
      ) : null}
    </CardListItem>
  );
}
export function ImportPreview({
  rows,
  confirmed,
  selected,
  onSelect,
}: {
  rows: ImportRow[];
  confirmed: boolean;
  selected: number[];
  onSelect: (row: ImportRow, checked: boolean) => void;
}) {
  return (
    <ul className="space-y-4" aria-label="Import preview">
      {rows.map((row) => (
        <ImportPreviewRow
          key={row.row}
          row={row}
          confirmed={confirmed}
          selected={selected.includes(row.row)}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
export function ImportConfirmation({
  needsPreview,
  selectedCount,
  confirmed,
  onConfirm,
}: {
  needsPreview: boolean;
  selectedCount: number;
  confirmed: boolean;
  onConfirm: () => void;
}) {
  return (
    <>
      <Button
        type="button"
        disabled={needsPreview || selectedCount === 0}
        onClick={onConfirm}
      >
        {confirmed
          ? "Retry selected import"
          : `Confirm import of ${selectedCount} selected books`}
      </Button>
      {needsPreview ? (
        <p>Preview again to apply the changed mappings.</p>
      ) : null}
    </>
  );
}
