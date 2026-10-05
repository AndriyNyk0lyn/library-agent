import { randomUUID } from "node:crypto";
import Link from "next/link";
import { requireReader } from "@/auth/reader";
import { PageHeading } from "@/components/page-heading";
import { BookForm } from "@/books/book-form";
import { getBookDetails } from "@/books/catalog/provider";
import { addCatalogBook } from "@/books/catalog/actions";

export default async function CatalogEditionPage({
  params,
}: {
  params: Promise<{ edition: string }>;
}) {
  await requireReader();
  const { edition } = await params;
  const result = await getBookDetails(edition);
  if (!result.ok)
    return (
      <>
        <PageHeading
          title="Open Library edition"
          description="Review an edition before saving."
        />
        <p role="alert">{result.error.message}</p>
        <Link href="/library/catalog" className="text-link">
          Back to catalog
        </Link>
        {" · "}
        <Link href="/library/new" className="text-link">
          Add manually
        </Link>
      </>
    );
  const candidate = result.candidate;
  async function saveEdition(
    previous: import("@/books/actions").BookFormState,
    form: FormData,
  ) {
    "use server";
    return addCatalogBook(candidate, previous, form);
  }
  return (
    <>
      <PageHeading
        title="Review this edition"
        description="Open Library · External edition. Confirm these details match your edition before saving. This creates a new library book and does not edit existing records."
      />
      <dl className="mb-5 space-y-2">
        <div>
          <dt>Edition</dt>
          <dd>
            <a href={candidate.source_url} className="text-link">
              {candidate.edition_id}
            </a>
          </dd>
        </div>
        <div>
          <dt>ISBN</dt>
          <dd>{candidate.isbn13 ?? candidate.isbn10 ?? "Unknown"}</dd>
        </div>
        <div>
          <dt>Publisher / publication date</dt>
          <dd>
            {candidate.publishers.join(", ") || "Unknown"} /{" "}
            {candidate.publish_date ?? "Unknown"}
          </dd>
        </div>
        <div>
          <dt>Language</dt>
          <dd>{candidate.language.join(", ") || "Unknown"}</dd>
        </div>
      </dl>
      {candidate.description ? (
        <details className="mb-5">
          <summary>Show catalog description (may contain spoilers)</summary>
          <p className="whitespace-pre-wrap">{candidate.description}</p>
        </details>
      ) : null}
      <p className="mb-5">
        You can correct title, authors and pages below. Missing values stay
        unknown. Check your library first if you may already have this book.
      </p>
      <BookForm
        key={candidate.edition_id}
        bookId={randomUUID()}
        initialDetails={{
          title: candidate.title,
          authors: candidate.authors,
          page_count: candidate.page_count,
        }}
        saveAction={saveEdition}
      />
    </>
  );
}
