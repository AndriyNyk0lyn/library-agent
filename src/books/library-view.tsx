import Form from "next/form";
import { SignOutForm } from "@/auth/sign-out-form";
import { InputField } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextLink } from "@/components/ui/text-link";
import { CardSection } from "@/components/ui/card";
import { EmptyState, ErrorMessage } from "@/components/ui/feedback";
import type { LibraryBookRow } from "@/lib/supabase/database.types";
import type { LibrarySearchInput } from "./search-schema";
import { ReadingStatusField, OwnershipField } from "./book-fields";
import { BookCard } from "./book-card";

type LibraryFilters = Pick<LibrarySearchInput, "query" | "status" | "owned">;

export function LibraryActions() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <TextLink href="/library/new">Add a book</TextLink>
      <TextLink href="/library/import">Import Goodreads CSV</TextLink>
      <SignOutForm />
    </div>
  );
}
export function LibrarySearchForm({
  query,
  filters,
}: {
  query: string;
  filters: LibraryFilters;
}) {
  return (
    <Form action="/library" className="mb-6 space-y-4">
      <InputField
        id="library-query"
        label="Search title or author"
        name="query"
        type="search"
        maxLength={200}
        defaultValue={query}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <ReadingStatusField
          id="library-status"
          label="Reading status"
          name="status"
          defaultValue={filters.status ?? ""}
          emptyLabel="All statuses"
        />
        <OwnershipField
          id="library-owned"
          label="Ownership"
          name="owned"
          defaultValue={
            filters.owned === undefined ? "" : String(filters.owned)
          }
          unknownValue=""
          unknownLabel="Any ownership"
        />
      </div>
      <div className="flex items-center gap-5">
        <SubmitButton pendingLabel="Searching…">Search library</SubmitButton>
        <TextLink href="/library">Clear filters</TextLink>
      </div>
    </Form>
  );
}
export function LibraryResults({
  books,
  error,
  hasFilters,
  page,
  retryHref,
}: {
  books: LibraryBookRow[];
  error: string | null;
  hasFilters: boolean;
  page: number;
  retryHref: string;
}) {
  if (error)
    return (
      <CardSection className="p-5">
        <ErrorMessage>{error}</ErrorMessage>
        <div className="mt-3 flex gap-5">
          <TextLink href={retryHref}>Try again</TextLink>
          <TextLink href="/setup">View setup</TextLink>
        </div>
      </CardSection>
    );
  if (!books.length)
    return (
      <EmptyState
        className="p-6"
        title={
          hasFilters
            ? "No books match your search"
            : page === 1
              ? "Your library is empty"
              : "No books on this page"
        }
      >
        <p className="mt-2 text-muted">
          {hasFilters
            ? "Change the query or filters, or clear them to see your library."
            : page === 1
              ? "Add your first book to start tracking your reading."
              : "Return to the previous page to see your books."}
        </p>
      </EmptyState>
    );
  return (
    <ul className="space-y-4" aria-label="Your books">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </ul>
  );
}
