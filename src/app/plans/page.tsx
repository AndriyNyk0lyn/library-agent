import { PlanSearchForm, PlanResults } from "@/plans/plans-view";
import { TextLink } from "@/components/ui/text-link";
import { requireReader } from "@/auth/reader";
import { listReadingPlans } from "@/plans/service";
import { PageHeading } from "@/components/page-heading";

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
      <TextLink href="/library">Choose a library book to make a plan</TextLink>
      <PlanSearchForm bookId={filters.book_id} status={filters.status} />
      <PlanResults result={result} />
      {result.ok && result.next_cursor && (
        <TextLink href={`/plans?${next}`} className="mt-4 inline-block">
          Older plans
        </TextLink>
      )}
    </>
  );
}
