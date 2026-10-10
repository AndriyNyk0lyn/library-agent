import { CatalogEditionDetails } from "@/books/catalog/edition-details";
import { ErrorMessage } from "@/components/ui/feedback";
import { randomUUID } from "node:crypto";
import { TextLink } from "@/components/ui/text-link";
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
        <ErrorMessage>{result.error.message}</ErrorMessage>
        <TextLink href="/library/catalog">Back to catalog</TextLink>
        {" · "}
        <TextLink href="/library/new">Add manually</TextLink>
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
      <CatalogEditionDetails candidate={candidate} />
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
