import { ErrorMessage } from "@/components/ui/feedback";
import { TextLink } from "@/components/ui/text-link";
import { requireReader } from "@/auth/reader";
import { getBook } from "@/books/service";
import { getReaderProfile } from "@/profile/service";
import { readerCalendarDate } from "@/plans/calculate";
import { PlanForm } from "@/plans/plan-form";
import { PageHeading } from "@/components/page-heading";

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ book_id?: string }>;
}) {
  const reader = await requireReader();
  const { book_id } = await searchParams;
  if (!book_id)
    return (
      <>
        <PageHeading
          title="New reading plan"
          description="Choose a saved library book to schedule."
        />
        <TextLink href="/library">Choose a book in your library</TextLink>
      </>
    );
  const [book, profile] = await Promise.all([
    getBook(reader, { id: book_id }),
    getReaderProfile(reader),
  ]);
  if (!book.ok || !profile.ok)
    return (
      <>
        <PageHeading
          title="New reading plan"
          description="Load the book and saved constraints before scheduling."
        />
        <ErrorMessage>
          {!book.ok
            ? book.error.message
            : !profile.ok
              ? profile.error.message
              : "Could not load plan inputs."}
        </ErrorMessage>
        <TextLink href={`/plans/new?book_id=${book_id}`}>Try again</TextLink>
      </>
    );
  const timezone = profile.profile.timezone ?? "";
  return (
    <>
      <PageHeading
        title={`Plan: ${book.book.title}`}
        description={`${book.book.authors.join(", ")} · Full page count: ${book.book.page_count ?? "unknown"}`}
      />
      <PlanForm
        key={`${book.book.id}:${book.book.version}`}
        initial={{
          bookId: book.book.id,
          bookVersion: book.book.version,
          operationId: crypto.randomUUID(),
          result: null,
          uncertain: false,
          values: {
            start_date: timezone ? readerCalendarDate(timezone) : "",
            target_date: "",
            timezone,
            remaining_pages: "",
            pages_read: "",
            pages_per_hour: profile.profile.pages_per_hour?.toString() ?? "",
            daily_reading_minutes:
              profile.profile.daily_reading_minutes?.toString() ?? "",
          },
        }}
      />
    </>
  );
}
