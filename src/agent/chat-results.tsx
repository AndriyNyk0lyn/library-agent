import { BookAuthors } from "@/books/book-authors";
import type { Activity, ChatRun } from "./schema";
import { activityLabels } from "./schema";
import { summarizeActivity, attemptedWrite } from "./activity";
import { Card } from "@/components/ui/card";
import { TextLink, AnchorLink } from "@/components/ui/text-link";
import { StatusMessage } from "@/components/ui/feedback";

export function ToolActivity({
  activity,
  active,
}: {
  activity: Activity[];
  active: boolean;
}) {
  if (!activity.length) return null;
  return (
    <ul
      className="mt-3 space-y-1 text-sm text-muted"
      aria-label="Tool activity"
    >
      {summarizeActivity(activity, active).map((summary) => (
        <li key={summary.tool}>
          {activityLabels[summary.tool]} — {summary.status}
        </li>
      ))}
    </ul>
  );
}
export function RecommendationCard({
  card,
}: {
  card: ChatRun["cards"][number];
}) {
  return (
    <Card className="mt-3 p-3 bg-transparent">
      {"id" in card ? (
        <TextLink href={`/library/${card.id}`}>{card.title}</TextLink>
      ) : (
        <>
          <p className="text-sm text-muted">
            Open Library · external suggestion · not saved
          </p>
          <AnchorLink href={card.source_url} target="_blank" rel="noreferrer">
            {card.title}
          </AnchorLink>
        </>
      )}
      <BookAuthors
        authors={card.authors}
        className="text-sm text-muted"
        fallback="Authors unknown"
      />
      <p>{card.reason}</p>
      <p className="mt-1 text-sm">Trade-off: {card.trade_off}</p>
      <p className="text-sm">Uncertainty: {card.uncertainty}</p>
    </Card>
  );
}
export function ChatRunNotice({
  run,
  needsRecovery,
}: {
  run: ChatRun;
  needsRecovery: boolean;
}) {
  if (run.status === "completed") return null;
  return (
    <StatusMessage className="mt-2 text-sm">
      {run.status === "active" && !needsRecovery
        ? "Run in progress…"
        : run.status === "active"
          ? "Reload saved status to confirm the outcome; writes may have completed."
          : attemptedWrite(run.activity)
            ? "Check your book/preference updates and saved plans before asking again; writes may have completed."
            : "This run did not attempt a book, preference or plan save."}
    </StatusMessage>
  );
}
