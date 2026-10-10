import { CatalogCandidateCard } from "@/books/catalog/candidate-card";
import { StatusMessage } from "@/components/ui/feedback";
import { ErrorMessage } from "@/components/ui/feedback";
import { TextLink } from "@/components/ui/text-link";
import { requireReader } from "@/auth/reader";
import { PageHeading } from "@/components/page-heading";
import { catalogEnabled } from "@/books/catalog/config";
import { searchBooks } from "@/books/catalog/provider";
import { CatalogSearchForm } from "@/books/catalog/search-form";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string | string[];
    author?: string | string[];
    isbn?: string | string[];
  }>;
}) {
  await requireReader();
  const params = await searchParams;
  const enabled = catalogEnabled();
  const result =
    enabled && (params.query || params.isbn)
      ? await searchBooks({
          query: params.query || params.isbn,
          author: params.author || undefined,
          isbn: params.isbn || undefined,
          limit: 5,
        })
      : null;
  return (
    <>
      <PageHeading
        title="Discover with Open Library"
        description="Optional external catalog search. Results are not saved library books. Choose an edition before adding one."
      />
      <p className="mb-5">
        <TextLink href="/library/new">Add a book manually</TextLink>
        {" · "}
        <TextLink href="/library">Back to library</TextLink>
      </p>
      {!enabled ? (
        <p>
          Catalog discovery is disabled. Your library and manual entry remain
          available.
        </p>
      ) : (
        <>
          <CatalogSearchForm
            query={typeof params.query === "string" ? params.query : ""}
            author={typeof params.author === "string" ? params.author : ""}
            isbn={typeof params.isbn === "string" ? params.isbn : ""}
          />
          {result && !result.ok ? (
            <ErrorMessage className="mt-5">{result.error.message}</ErrorMessage>
          ) : null}
          {result?.ok && !result.candidates.length ? (
            <StatusMessage className="mt-5">
              No Open Library matches. Try a different title, author or ISBN.
            </StatusMessage>
          ) : null}
          {result?.ok ? (
            <ul className="mt-6 space-y-5">
              {result.candidates.map((candidate) => (
                <CatalogCandidateCard
                  key={candidate.provider_id}
                  candidate={candidate}
                />
              ))}
            </ul>
          ) : null}
        </>
      )}
    </>
  );
}
