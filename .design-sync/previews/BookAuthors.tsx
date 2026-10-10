import { BookAuthors } from "reading-companion";

export const Several = () => <BookAuthors authors={["Terry Pratchett", "Neil Gaiman"]} className="text-muted" />;

export const Unknown = () => <BookAuthors authors={[]} fallback="Author unknown" className="text-muted" />;
