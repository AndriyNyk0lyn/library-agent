import { SelectField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";
import { ErrorMessage } from "@/components/ui/feedback";
import type { ListPlansResult } from "./schema";
import { PlanResultCard } from "./plan-summary";

export function PlanSearchForm({
  bookId,
  status,
}: {
  bookId?: string;
  status?: string;
}) {
  return (
    <form className="my-4 flex flex-wrap items-end gap-3" action="/plans">
      {bookId && <input type="hidden" name="book_id" value={bookId} />}
      <SelectField
        label="Plan status"
        name="status"
        id="plan-status"
        defaultValue={status ?? ""}
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </SelectField>
      <Button type="submit" variant="outline">
        Filter plans
      </Button>
      <TextLink href="/plans">Clear filters</TextLink>
    </form>
  );
}
export function PlanResults({ result }: { result: ListPlansResult }) {
  if (!result.ok)
    return (
      <ErrorMessage>
        {result.error.message} <TextLink href="/plans">Try again</TextLink>
      </ErrorMessage>
    );
  if (!result.plans.length)
    return (
      <p>
        No saved plans match. Open a library book to check and deliberately save
        a schedule.
      </p>
    );
  return (
    <div className="space-y-3">
      {result.plans.map((plan) => (
        <PlanResultCard key={plan.id} result={{ kind: "saved", plan }} />
      ))}
    </div>
  );
}
