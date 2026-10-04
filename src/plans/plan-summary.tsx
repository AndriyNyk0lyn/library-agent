import Link from "next/link";
import type { PlanCalculation, PlanDisplay } from "./schema";

export function PlanSummary({ calculation }: { calculation: PlanCalculation }) {
  return (
    <>
      <Link href={`/library/${calculation.book_id}`} className="text-link">
        {calculation.title}
      </Link>
      <p className="text-sm text-muted">{calculation.authors.join(", ")}</p>
      <dl className="mt-2 space-y-1 text-sm">
        <div>
          <dt className="inline font-medium">Dates: </dt>
          <dd className="inline">
            {calculation.start_date} – {calculation.target_date} (
            {calculation.available_days} inclusive days, {calculation.timezone})
          </dd>
        </div>
        <div>
          <dt className="inline font-medium">Target: </dt>
          <dd className="inline">
            {calculation.daily_pages} pages/day for{" "}
            {calculation.remaining_pages} remaining pages
          </dd>
        </div>
        <div>
          <dt className="inline font-medium">Time: </dt>
          <dd className="inline">
            {calculation.estimated_daily_minutes === null
              ? "Estimate unknown"
              : `${calculation.estimated_daily_minutes} minutes/day at ${calculation.pages_per_hour} pages/hour`}
            ; budget{" "}
            {calculation.daily_reading_minutes === null
              ? "unknown"
              : `${calculation.daily_reading_minutes} minutes/day`}
          </dd>
        </div>
        <div>
          <dt className="inline font-medium">Time feasibility: </dt>
          <dd className="inline">
            {calculation.time_feasibility === "unknown"
              ? "Unknown — speed and daily budget are both needed"
              : calculation.time_feasibility === "infeasible"
                ? "Infeasible for the stated budget"
                : "Fits the declared speed and budget"}
          </dd>
        </div>
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
    <article className="mt-3 rounded border border-line bg-surface p-3">
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
          <p role="status">
            {result.error.message} ({result.error.code})
          </p>
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
        <Link
          href={`/plans?book_id=${result.plan.book_id}`}
          className="mt-2 inline-block text-link"
        >
          View saved plans
        </Link>
      )}
    </article>
  );
}
