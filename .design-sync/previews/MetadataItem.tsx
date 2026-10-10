import { MetadataItem } from "reading-companion";

export const Row = () => (
  <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
    <MetadataItem label="Status" labelClassName="text-muted">Reading</MetadataItem>
    <MetadataItem label="Rating" labelClassName="text-muted">Unrated</MetadataItem>
    <MetadataItem label="Pages" labelClassName="text-muted">880</MetadataItem>
  </dl>
);

export const Stacked = () => (
  <dl className="space-y-2">
    <MetadataItem label="ISBN">9780441478125</MetadataItem>
    <MetadataItem label="Imported shelves">read, favourites</MetadataItem>
  </dl>
);
