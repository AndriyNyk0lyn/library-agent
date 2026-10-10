import { BookCard } from "reading-companion";

export const Finished = () => (
  <ul className="space-y-4">
    <BookCard book={{ id: "b1", title: "The Left Hand of Darkness", authors: ["Ursula K. Le Guin"], status: "finished", rating: 4.5, owned: true, page_count: 304, notes: "Reread the ice crossing chapters. Estraven’s journal entries are the heart of it.", isbn10: null, isbn13: "9780441478125" }} />
  </ul>
);

export const MostlyUnknown = () => (
  <ul className="space-y-4">
    <BookCard book={{ id: "b2", title: "Piranesi", authors: ["Susanna Clarke"], status: "want_to_read", rating: null, owned: null, page_count: null, notes: "", isbn10: null, isbn13: null }} />
  </ul>
);

export const LibraryList = () => (
  <ul className="space-y-4" aria-label="Your books">
    <BookCard book={{ id: "b3", title: "Middlemarch: A Study of Provincial Life", authors: ["George Eliot"], status: "reading", rating: null, owned: false, page_count: 880, notes: "", isbn10: null, isbn13: null }} />
    <BookCard book={{ id: "b1", title: "The Left Hand of Darkness", authors: ["Ursula K. Le Guin"], status: "finished", rating: 4.5, owned: true, page_count: 304, notes: "Reread the ice crossing chapters. Estraven’s journal entries are the heart of it.", isbn10: null, isbn13: "9780441478125" }} />
  </ul>
);
