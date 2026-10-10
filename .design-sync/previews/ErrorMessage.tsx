import { ErrorMessage } from "reading-companion";

export const Boxed = () => (
  <ErrorMessage className="rounded border border-red-300 bg-red-50 p-3 text-red-800">
    We could not save this book. Your entries were kept — try again.
  </ErrorMessage>
);

export const Inline = () => (
  <ErrorMessage className="text-red-800">Check the search query and filters. The query can contain up to 200 characters.</ErrorMessage>
);
