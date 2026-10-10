import { BookMetadata, BookPlanActions } from "@/books/book-details";
import { ErrorMessage } from "@/components/ui/feedback";
import { TextLink } from "@/components/ui/text-link";
import { requireReader } from "@/auth/reader";
import { getBook } from "@/books/service";
import { EditBookForm } from "@/books/edit-book-form";
import { PageHeading } from "@/components/page-heading";

export default async function BookDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const reader = await requireReader();
  const { id } = await params;
  const result = await getBook(reader, { id });
  if (!result.ok)
    return (
      <>
        <PageHeading
          title="Book details"
          description="Read and edit your saved book."
        />
        <ErrorMessage>{result.error.message}</ErrorMessage>
        <TextLink href="/library">Back to library</TextLink>
      </>
    );
  const book = result.book;
  return (
    <>
      <PageHeading title={book.title} description={book.authors.join(", ")} />
      <BookMetadata book={book} />
      <BookPlanActions bookId={book.id} />
      <EditBookForm book={book} key={book.id} />
    </>
  );
}
