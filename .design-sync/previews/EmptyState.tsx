import { EmptyState } from "reading-companion";

export const EmptyLibrary = () => (
  <EmptyState title="Your library is empty" className="p-6">
    <p className="mt-2 text-muted">Add your first book to start tracking your reading.</p>
  </EmptyState>
);

export const NoMatches = () => (
  <EmptyState title="No books match your search" className="p-6">
    <p className="mt-2 text-muted">Change the query or filters, or clear them to see your library.</p>
  </EmptyState>
);
