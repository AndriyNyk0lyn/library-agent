import type { Metadata } from "next";
import { z } from "zod";
import {
  librarySearchSchema,
  type LibrarySearchInput,
} from "@/books/search-schema";
import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/ui/pagination";
import { requireReader } from "@/auth/reader";
import { listBooks } from "@/books/service";
import {
  LibraryActions,
  LibrarySearchForm,
  LibraryResults,
} from "@/books/library-view";

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
      <LibraryActions />
      <LibrarySearchForm
        key={JSON.stringify(params)}
        query={typeof params.query === "string" ? params.query : ""}
        filters={filters}
      />
      <LibraryResults
        books={result.books}
        error={result.error}
        hasFilters={hasFilters}
        page={page}
        retryHref={pageUrl(page)}
      />
      {!result.error && (
        <Pagination
          label="Library pages"
          previousHref={page > 1 ? pageUrl(page - 1) : undefined}
          nextHref={
            result.hasMore && page < 10000 ? pageUrl(page + 1) : undefined
          }
        />
      )}
    </>
  );
}
