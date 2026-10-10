import type { BookDetails, BookResult } from "./management-schema";
import { statusLabels } from "./schemas";
import { OwnershipValue } from "./book-card";
import { StatusMessage } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { AnchorLink } from "@/components/ui/text-link";
import { CardSection } from "@/components/ui/card";

export function BookConflictDetails({ book }: { book: BookDetails }) {
  return (
    <>
      <h2 className="font-semibold">Current saved version {book.version}</h2>
      <p>
        {statusLabels[book.status]} · Rating {book.rating ?? "Unrated"} · Pages{" "}
        {book.page_count ?? "Unknown"} · Ownership{" "}
        <OwnershipValue owned={book.owned} />
      </p>
      <p>
        Started {book.started_at ?? "Unknown"}; finished{" "}
        {book.finished_at ?? "Unknown"}
      </p>
      <p className="whitespace-pre-wrap break-words">
        {book.notes || "No notes"}
      </p>
    </>
  );
}
export function EditBookFeedback({
  result,
  bookId,
  onLoadCurrent,
}: {
  result?: BookResult;
  bookId: string;
  onLoadCurrent: (book: BookDetails) => void;
}) {
  if (!result) return null;
  if (result.ok)
    return (
      <StatusMessage>Book saved. Version {result.book.version}.</StatusMessage>
    );
  const current = result.current;
  return (
    <CardSection role="alert" className="space-y-3 bg-transparent p-4">
      <p>
        {result.error.code}: {result.error.message}
      </p>
      {current ? (
        <>
          <BookConflictDetails book={current} />
          <Button
            variant="link"
            type="button"
            onClick={() => onLoadCurrent(current)}
          >
            Load this version into the form
          </Button>
          <p>Your draft stays in the form until you load this version.</p>
        </>
      ) : (
        <AnchorLink href={`/library/${bookId}`}>Reload current book</AnchorLink>
      )}
    </CardSection>
  );
}
