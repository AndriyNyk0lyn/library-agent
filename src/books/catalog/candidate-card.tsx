import { BookAuthors } from "@/books/book-authors";
import { CardListItem } from "@/components/ui/card";
import type { CatalogCandidate } from "./schema";
import { AnchorLink, TextLink } from "@/components/ui/text-link";

export function CatalogCandidateCard({
  candidate,
}: {
  candidate: CatalogCandidate;
}) {
  return (
    <CardListItem className="border-current bg-transparent p-4">
      <p className="text-sm">Open Library · External work</p>
      <h2 className="font-semibold">{candidate.title}</h2>
      <BookAuthors authors={candidate.authors} fallback="Author unknown" />
      <AnchorLink href={candidate.source_url}>View catalog source</AnchorLink>
      <p className="mt-2">
        {candidate.edition_id ? (
          <TextLink
            prefetch={false}
            href={`/library/catalog/${candidate.edition_id}`}
          >
            Review suggested edition {candidate.edition_id}
          </TextLink>
        ) : (
          "No edition available. Add manually."
        )}
      </p>
    </CardListItem>
  );
}
