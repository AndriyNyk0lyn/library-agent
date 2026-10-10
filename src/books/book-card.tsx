import { BookAuthors } from "@/books/book-authors";
import type { LibraryBookRow } from "@/lib/supabase/database.types";
import { CardListItem } from "@/components/ui/card";
import { MetadataItem } from "@/components/ui/metadata-item";
import { NotesDisclosure } from "@/components/ui/disclosure";
import { TextLink } from "@/components/ui/text-link";
import { statusLabels } from "./schemas";

export function OwnershipValue({ owned }: { owned: boolean | null }) {
  return owned === null ? "Unknown" : owned ? "Owned" : "Not owned";
}
export function BookCard({ book }: { book: LibraryBookRow }) {
  return (
    <CardListItem className="p-5">
      <h2 className="text-lg font-semibold break-words">
        <TextLink href={`/library/${book.id}`}>{book.title}</TextLink>
      </h2>
      <BookAuthors
        authors={book.authors}
        className="mt-1 break-words text-muted"
      />
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <MetadataItem label="Status" labelClassName="text-muted">
          {statusLabels[book.status]}
        </MetadataItem>
        <MetadataItem label="Rating" labelClassName="text-muted">
          {book.rating === null ? "Unrated" : `${book.rating} / 5`}
        </MetadataItem>
        <MetadataItem label="Ownership" labelClassName="text-muted">
          <OwnershipValue owned={book.owned} />
        </MetadataItem>
        <MetadataItem label="Pages" labelClassName="text-muted">
          {book.page_count ?? "Unknown"}
        </MetadataItem>
      </dl>
      <NotesDisclosure notes={book.notes} />
    </CardListItem>
  );
}
