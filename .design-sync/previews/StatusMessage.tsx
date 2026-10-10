import { StatusMessage } from "reading-companion";

export const Boxed = () => (
  <StatusMessage className="rounded border border-line bg-surface p-3">Saved “Piranesi” to your library.</StatusMessage>
);

export const Small = () => <StatusMessage className="text-sm text-muted">Reading your unread shelf…</StatusMessage>;
