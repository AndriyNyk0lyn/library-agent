import Link from "next/link";
import { requireReader } from "@/auth/reader";
import { listReadingPlans } from "@/plans/service";
import { PlanResultCard } from "@/plans/plan-summary";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ book_id?: string; status?: string; cursor?: string }>;
}) {
  const reader = await requireReader();
  const filters = await searchParams;
  const result = await listReadingPlans(reader, {
    ...filters,
    status: filters.status || undefined,
    limit: 10,
  });
  const next = new URLSearchParams();
  if (filters.book_id) next.set("book_id", filters.book_id);
  if (filters.status) next.set("status", filters.status);
  if (result.ok && result.next_cursor) next.set("cursor", result.next_cursor);
  return (
    <>
      <PageHeading
        title="Reading plans"
        description="Saved schedules with declared constraints, calculated targets and assumptions."
      />
      <Link href="/library" className="text-link">
        Choose a library book to make a plan
      </Link>
      <form className="my-4 flex flex-wrap items-end gap-3" action="/plans">
        {filters.book_id && (
          <input type="hidden" name="book_id" value={filters.book_id} />
        )}
        <div>
          <label htmlFor="plan-status" className="form-label">
            Plan status
          </label>
          <select
            name="status"
            id="plan-status"
            defaultValue={filters.status ?? ""}
            className="form-field"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filter plans
        </Button>
        <Link href="/plans" className="text-link">
          Clear filters
        </Link>
      </form>
      {!result.ok ? (
        <p role="alert">
          {result.error.message}{" "}
          <Link href="/plans" className="text-link">
            Try again
          </Link>
        </p>
      ) : result.plans.length === 0 ? (
        <p>
          No saved plans match. Open a library book to check and deliberately
          save a schedule.
        </p>
      ) : (
        <div className="space-y-3">
          {result.plans.map((plan) => (
            <PlanResultCard key={plan.id} result={{ kind: "saved", plan }} />
          ))}
        </div>
      )}
      {result.ok && result.next_cursor && (
        <Link href={`/plans?${next}`} className="mt-4 inline-block text-link">
          Older plans
        </Link>
      )}
    </>
  );
}
