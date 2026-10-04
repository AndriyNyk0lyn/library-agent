import type { Metadata } from "next";
import Link from "next/link";
import Form from "next/form";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  librarySearchSchema,
  type LibrarySearchInput,
} from "@/books/search-schema";
import { PageHeading } from "@/components/page-heading";
import { requireReader } from "@/auth/reader";
import { SignOutForm } from "@/auth/sign-out-form";
import { listBooks } from "@/books/service";
import { readingStatuses, statusLabels } from "@/books/schemas";
import { z } from "zod";

export const metadata: Metadata = { title: "Library" };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const reader = await requireReader();
  const params = await searchParams;
  const requestedPage = params.page;
  const parsedFilters = librarySearchSchema.safeParse({
    query: params.query,
    status: params.status || undefined,
    owned:
      params.owned === "true"
        ? true
        : params.owned === "false"
          ? false
          : params.owned
            ? params.owned
            : undefined,
  });
  const filters: Pick<LibrarySearchInput, "query" | "status" | "owned"> =
    parsedFilters.success ? parsedFilters.data : {};
  const hasFilters = Boolean(
    filters.query || filters.status || filters.owned !== undefined,
  );
  function pageUrl(targetPage: number) {
    const query = new URLSearchParams({ page: String(targetPage) });
    if (filters.query) query.set("query", filters.query);
    if (filters.status) query.set("status", filters.status);
    if (filters.owned !== undefined) query.set("owned", String(filters.owned));
    return `/library?${query}`;
  }
  const parsedPage = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .safeParse(requestedPage ?? 1);
  const page = parsedPage.success ? parsedPage.data : 1;
  const result = parsedFilters.success
    ? await listBooks(reader, page, filters)
    : {
        books: [],
        hasMore: false,
        error:
          "Check the search query and filters. The query can contain up to 200 characters.",
      };
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
        <Link href="/library/import" className="text-link">
          Import Goodreads CSV
        </Link>
        <SignOutForm />
      </div>
      <Form
        action="/library"
        className="mb-6 space-y-4"
        key={JSON.stringify(params)}
      >
        <div>
          <label htmlFor="library-query" className="form-label">
            Search title or author
          </label>
          <input
            id="library-query"
            name="query"
            type="search"
            maxLength={200}
            defaultValue={typeof params.query === "string" ? params.query : ""}
            className="form-field"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="library-status" className="form-label">
              Reading status
            </label>
            <select
              id="library-status"
              name="status"
              defaultValue={filters.status ?? ""}
              className="form-field"
            >
              <option value="">All statuses</option>
              {readingStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="library-owned" className="form-label">
              Ownership
            </label>
            <select
              id="library-owned"
              name="owned"
              defaultValue={
                filters.owned === undefined ? "" : String(filters.owned)
              }
              className="form-field"
            >
              <option value="">Any ownership</option>
              <option value="true">Owned</option>
              <option value="false">Not owned</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <SubmitButton pendingLabel="Searching…">Search library</SubmitButton>
          <Link href="/library" className="text-link">
            Clear filters
          </Link>
        </div>
      </Form>
      {result.error ? (
        <section className="rounded border border-line bg-surface p-5">
          <p role="alert">{result.error}</p>
          <div className="mt-3 flex gap-5">
            <Link href={pageUrl(page)} className="text-link">
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
            {hasFilters
              ? "No books match your search"
              : page === 1
                ? "Your library is empty"
                : "No books on this page"}
          </h2>
          <p className="mt-2 text-muted">
            {hasFilters
              ? "Change the query or filters, or clear them to see your library."
              : page === 1
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
                <Link href={`/library/${book.id}`} className="text-link">
                  {book.title}
                </Link>
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
            <Link href={pageUrl(page - 1)} className="text-link">
              Previous page
            </Link>
          ) : null}
          {result.hasMore && page < 10000 ? (
            <Link href={pageUrl(page + 1)} className="text-link">
              Next page
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
