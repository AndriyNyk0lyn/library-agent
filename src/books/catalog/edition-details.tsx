import { MetadataItem } from "@/components/ui/metadata-item";
import type { CatalogCandidate } from "./schema";
import { AnchorLink } from "@/components/ui/text-link";
import { Disclosure } from "@/components/ui/disclosure";

export function CatalogEditionDetails({
  candidate,
}: {
  candidate: CatalogCandidate;
}) {
  return (
    <>
      <dl className="mb-5 space-y-2">
        <MetadataItem label="Edition">
          <AnchorLink href={candidate.source_url}>
            {candidate.edition_id}
          </AnchorLink>
        </MetadataItem>
        <MetadataItem label="ISBN">
          {candidate.isbn13 ?? candidate.isbn10 ?? "Unknown"}
        </MetadataItem>
        <MetadataItem label="Publisher / publication date">
          {candidate.publishers.join(", ") || "Unknown"} /{" "}
          {candidate.publish_date ?? "Unknown"}
        </MetadataItem>
        <MetadataItem label="Language">
          {candidate.language.join(", ") || "Unknown"}
        </MetadataItem>
      </dl>
      {candidate.description ? (
        <Disclosure
          className="mb-5"
          summary="Show catalog description (may contain spoilers)"
        >
          <p className="whitespace-pre-wrap">{candidate.description}</p>
        </Disclosure>
      ) : null}
      <p className="mb-5">
        You can correct title, authors and pages below. Missing values stay
        unknown. Check your library first if you may already have this book.
      </p>
    </>
  );
}
