import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { requireReader } from "@/auth/reader";
import { SignOutForm } from "@/auth/sign-out-form";
import { listBooks } from "@/books/service";
import { statusLabels } from "@/books/schemas";
import { z } from "zod";

export const metadata: Metadata = { title: "Library" };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const reader = await requireReader();
  const { page: requestedPage } = await searchParams;
  const parsedPage = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .safeParse(requestedPage ?? 1);
  const page = parsedPage.success ? parsedPage.data : 1;
  const result = await listBooks(reader, page);
  return (
    <>
      <PageHeading
        title="Library"
        description="Keep your books, reading status, ratings, and notes in one place."
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/library/new" className="text-link">
          Add a book
        </Link>
        <SignOutForm />
      </div>
      {result.error ? (
        <section className="rounded border border-line bg-surface p-5">
          <p role="alert">{result.error}</p>
          <div className="mt-3 flex gap-5">
            <Link href={`/library?page=${page}`} className="text-link">
              Try again
            </Link>
            <Link href="/setup" className="text-link">
              View setup
            </Link>
          </div>
        </section>
      ) : result.books.length === 0 ? (
        <section className="rounded border border-line bg-surface p-6">
          <h2 className="text-lg font-semibold">
            {page === 1 ? "Your library is empty" : "No books on this page"}
          </h2>
          <p className="mt-2 text-muted">
            {page === 1
              ? "Add your first book to start tracking your reading."
              : "Return to the previous page to see your books."}
          </p>
        </section>
      ) : (
        <ul className="space-y-4" aria-label="Your books">
          {result.books.map((book) => (
            <li
              key={book.id}
              className="rounded border border-line bg-surface p-5"
            >
              <h2 className="text-lg font-semibold break-words">
                {book.title}
              </h2>
              <p className="mt-1 break-words text-muted">
                {book.authors.join(", ")}
              </p>
              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div>
                  <dt className="text-muted">Status</dt>
                  <dd>{statusLabels[book.status]}</dd>
                </div>
                <div>
                  <dt className="text-muted">Rating</dt>
                  <dd>
                    {book.rating === null ? "Unrated" : `${book.rating} / 5`}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Ownership</dt>
                  <dd>
                    {book.owned === null
                      ? "Unknown"
                      : book.owned
                        ? "Owned"
                        : "Not owned"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Pages</dt>
                  <dd>{book.page_count ?? "Unknown"}</dd>
                </div>
              </dl>
              {book.notes ? (
                <details className="mt-4">
                  <summary className="cursor-pointer font-medium">
                    Notes
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap break-words">
                    {book.notes}
                  </p>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {!result.error && (page > 1 || result.hasMore) ? (
        <nav aria-label="Library pages" className="mt-6 flex gap-6">
          {page > 1 ? (
            <Link href={`/library?page=${page - 1}`} className="text-link">
              Previous page
            </Link>
          ) : null}
          {result.hasMore ? (
            <Link href={`/library?page=${page + 1}`} className="text-link">
              Next page
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
