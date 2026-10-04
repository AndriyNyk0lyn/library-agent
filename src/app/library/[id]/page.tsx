import Link from "next/link";
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
        <p role="alert">{result.error.message}</p>
        <Link href="/library" className="text-link">
          Back to library
        </Link>
      </>
    );
  const book = result.book;
  return (
    <>
      <PageHeading title={book.title} description={book.authors.join(", ")} />
      <dl className="mb-6 space-y-2">
        <div>
          <dt>ISBN</dt>
          <dd>{book.isbn13 ?? book.isbn10 ?? "Unknown"}</dd>
        </div>
        {book.goodreads_book_id ? (
          <div>
            <dt>Goodreads ID</dt>
            <dd>{book.goodreads_book_id}</dd>
          </div>
        ) : null}
        {book.imported_shelves.length ? (
          <div>
            <dt>Imported shelves</dt>
            <dd>{book.imported_shelves.join(", ")}</dd>
          </div>
        ) : null}
        {book.goodreads_date_added ? (
          <div>
            <dt>Added on Goodreads</dt>
            <dd>{book.goodreads_date_added}</dd>
          </div>
        ) : null}
      </dl>
      <p className="mb-4">
        <Link href={`/plans/new?book_id=${book.id}`} className="text-link">
          Make a reading plan
        </Link>
        {" · "}
        <Link href={`/plans?book_id=${book.id}`} className="text-link">
          View this book’s saved plans
        </Link>
      </p>
      <EditBookForm book={book} key={book.id} />
    </>
  );
}
