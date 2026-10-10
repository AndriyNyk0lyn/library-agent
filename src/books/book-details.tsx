import { MetadataItem } from "@/components/ui/metadata-item";
import type { BookDetails } from "./management-schema";
import { AnchorLink, TextLink } from "@/components/ui/text-link";

export function BookMetadata({ book }: { book: BookDetails }) {
  return (
    <dl className="mb-6 space-y-2">
      <MetadataItem label="ISBN">
        {book.isbn13 ?? book.isbn10 ?? "Unknown"}
      </MetadataItem>
      {book.goodreads_book_id ? (
        <MetadataItem label="Goodreads ID">
          {book.goodreads_book_id}
        </MetadataItem>
      ) : null}
      {book.imported_shelves.length ? (
        <MetadataItem label="Imported shelves">
          {book.imported_shelves.join(", ")}
        </MetadataItem>
      ) : null}
      {book.goodreads_date_added ? (
        <MetadataItem label="Added on Goodreads">
          {book.goodreads_date_added}
        </MetadataItem>
      ) : null}
      {book.catalog_metadata ? (
        <MetadataItem label="Catalog provenance">
          <AnchorLink href={book.catalog_metadata.source_url}>
            Open Library edition {book.catalog_metadata.edition_id}
          </AnchorLink>
        </MetadataItem>
      ) : null}
    </dl>
  );
}
export function BookPlanActions({ bookId }: { bookId: string }) {
  return (
    <p className="mb-4">
      <TextLink href={`/plans/new?book_id=${bookId}`}>
        Make a reading plan
      </TextLink>
      {" · "}
      <TextLink href={`/plans?book_id=${bookId}`}>
        View this book’s saved plans
      </TextLink>
    </p>
  );
}
