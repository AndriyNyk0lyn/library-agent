"use client";
import { useState, useTransition } from "react";
import { TextLink } from "@/components/ui/text-link";
import { ErrorMessage } from "@/components/ui/feedback";
import { processImport } from "./import-actions";
import {
  maxImportBytes,
  type ImportChoices,
  type ImportState,
} from "./import-schema";
import { readingStatuses } from "./schemas";
import {
  ImportFileSelection,
  ShelfMappings,
  ImportReportSummary,
  ImportPreview,
  ImportConfirmation,
} from "./import-preview";

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
  return (
    <div className="space-y-6">
      {state.error ? <ErrorMessage>{state.error}</ErrorMessage> : null}
      <fieldset disabled={pending} className="space-y-4">
        <legend className="sr-only">Import CSV</legend>
        <ImportFileSelection
          file={file}
          pending={pending}
          onPreview={() => run(false)}
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
        <ShelfMappings
          shelves={mappingShelves}
          mappings={mappings}
          onChange={(shelf, value) => {
            setMappings((previous) => {
              const next = { ...previous };
              const status = readingStatuses.find((status) => status === value);
              if (status) next[shelf] = status;
              else delete next[shelf];
              return next;
            });
            setNeedsPreview(true);
          }}
        />
        {report ? (
          <>
            <ImportReportSummary
              report={report}
              confirmed={Boolean(state.confirmed)}
              selectedCount={selected.length}
            />
            <ImportPreview
              rows={report.rows}
              confirmed={Boolean(state.confirmed)}
              selected={selected}
              onSelect={(row, checked) => {
                setSelected((previous) =>
                  checked
                    ? [...previous, row.row]
                    : previous.filter((number) => number !== row.row),
                );
                if (row.code === "ambiguous")
                  setAllowAmbiguous((previous) =>
                    checked
                      ? [...previous, row.row]
                      : previous.filter((number) => number !== row.row),
                  );
              }}
            />
            <ImportConfirmation
              needsPreview={needsPreview}
              selectedCount={selected.length}
              confirmed={Boolean(state.confirmed)}
              onConfirm={() => run(true)}
            />
          </>
        ) : null}
      </fieldset>
      <TextLink href="/library">Back to library</TextLink>
    </div>
  );
}
