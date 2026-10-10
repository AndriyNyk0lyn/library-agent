import { BookAuthors } from "@/books/book-authors";
import { Card } from "@/components/ui/card";
import { MetadataItem } from "@/components/ui/metadata-item";
import { StatusMessage } from "@/components/ui/feedback";
import { TextLink } from "@/components/ui/text-link";
import type { PlanCalculation, PlanDisplay } from "./schema";

export function PlanSummary({ calculation }: { calculation: PlanCalculation }) {
  return (
    <>
      <TextLink href={`/library/${calculation.book_id}`}>
        {calculation.title}
      </TextLink>
      <BookAuthors
        authors={calculation.authors}
        className="text-sm text-muted"
      />
      <dl className="mt-2 space-y-1 text-sm">
        <MetadataItem
          label="Dates: "
          labelClassName="inline font-medium"
          valueClassName="inline"
        >
          {calculation.start_date} – {calculation.target_date} (
          {calculation.available_days} inclusive days, {calculation.timezone})
        </MetadataItem>
        <MetadataItem
          label="Target: "
          labelClassName="inline font-medium"
          valueClassName="inline"
        >
          {calculation.daily_pages} pages/day for {calculation.remaining_pages}{" "}
          remaining pages
        </MetadataItem>
        <MetadataItem
          label="Time: "
          labelClassName="inline font-medium"
          valueClassName="inline"
        >
          {calculation.estimated_daily_minutes === null
            ? "Estimate unknown"
            : `${calculation.estimated_daily_minutes} minutes/day at ${calculation.pages_per_hour} pages/hour`}
          ; budget{" "}
          {calculation.daily_reading_minutes === null
            ? "unknown"
            : `${calculation.daily_reading_minutes} minutes/day`}
        </MetadataItem>
        <MetadataItem
          label="Time feasibility: "
          labelClassName="inline font-medium"
          valueClassName="inline"
        >
          {calculation.time_feasibility === "unknown"
            ? "Unknown — speed and daily budget are both needed"
            : calculation.time_feasibility === "infeasible"
              ? "Infeasible for the stated budget"
              : "Fits the declared speed and budget"}
        </MetadataItem>
      </dl>
      <ul
        className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted"
        aria-label="Plan assumptions"
      >
        {calculation.assumptions.map((assumption) => (
          <li key={assumption}>{assumption}</li>
        ))}
      </ul>
    </>
  );
}
export function PlanResultCard({ result }: { result: PlanDisplay }) {
  return (
    <Card className="mt-3 p-3">
      <p className="mb-2 font-semibold">
        {result.kind === "saved"
          ? `Saved plan · ${result.plan.status}`
          : result.kind === "suggestion"
            ? "Unsaved suggestion"
            : result.error.code === "UPSTREAM_UNAVAILABLE"
              ? "Save/read outcome unconfirmed"
              : "Schedule rejected"}
      </p>
      {result.kind === "rejected" ? (
        <>
          <StatusMessage>
            {result.error.message} ({result.error.code})
          </StatusMessage>
          {result.constraints && (
            <div className="mt-2">
              <PlanSummary calculation={result.constraints} />
            </div>
          )}
        </>
      ) : (
        <PlanSummary
          calculation={
            result.kind === "saved" ? result.plan : result.calculation
          }
        />
      )}
      {result.kind === "saved" && (
        <TextLink
          href={`/plans?book_id=${result.plan.book_id}`}
          className="mt-2 inline-block"
        >
          View saved plans
        </TextLink>
      )}
    </Card>
  );
}
