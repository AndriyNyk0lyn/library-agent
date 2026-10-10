import { CatalogCandidateCard } from "reading-companion";

const base = { provider: "open_library", kind: "work", isbn10: null, isbn13: null, page_count: null, cover_url: null, description: null, language: [], publishers: [], publish_date: null } as const;

export const WithEdition = () => (
  <ul className="space-y-3">
    <CatalogCandidateCard candidate={{ ...base, provider_id: "OL59863W", source_url: "https://openlibrary.org/works/OL59863W", title: "The Dispossessed", authors: ["Ursula K. Le Guin"], edition_id: "OL7353617M" }} />
  </ul>
);

export const NoEdition = () => (
  <ul className="space-y-3">
    <CatalogCandidateCard candidate={{ ...base, provider_id: "OL20893680W", source_url: "https://openlibrary.org/works/OL20893680W", title: "Piranesi", authors: [], edition_id: null }} />
  </ul>
);
