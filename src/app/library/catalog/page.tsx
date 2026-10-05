import Link from "next/link";
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
        <Link href="/library/new" className="text-link">
          Add a book manually
        </Link>
        {" · "}
        <Link href="/library" className="text-link">
          Back to library
        </Link>
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
            <p role="alert" className="mt-5">
              {result.error.message}
            </p>
          ) : null}
          {result?.ok && !result.candidates.length ? (
            <p role="status" className="mt-5">
              No Open Library matches. Try a different title, author or ISBN.
            </p>
          ) : null}
          {result?.ok ? (
            <ul className="mt-6 space-y-5">
              {result.candidates.map((candidate) => (
                <li key={candidate.provider_id} className="rounded border p-4">
                  <p className="text-sm">Open Library · External work</p>
                  <h2 className="font-semibold">{candidate.title}</h2>
                  <p>{candidate.authors.join(", ") || "Author unknown"}</p>
                  <a href={candidate.source_url} className="text-link">
                    View catalog source
                  </a>
                  <p className="mt-2">
                    {candidate.edition_id ? (
                      <Link
                        className="text-link"
                        prefetch={false}
                        href={`/library/catalog/${candidate.edition_id}`}
                      >
                        Review suggested edition {candidate.edition_id}
                      </Link>
                    ) : (
                      "No edition available. Add manually."
                    )}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </>
  );
}
