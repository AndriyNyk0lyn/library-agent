import type { Activity } from "./schema";

export function attemptedWrite(activity: Activity[]) {
  return activity.some(
    (event) =>
      event.phase === "started" &&
      (event.tool === "update_book" ||
        event.tool === "add_catalog_book" ||
        event.tool === "apply_library_update" ||
        event.tool === "update_reader_profile" ||
        event.tool === "save_reading_plan"),
  );
}
export function summarizeActivity(events: Activity[], running: boolean) {
  const summaries = new Map<
    Activity["tool"],
    {
      tool: Activity["tool"];
      started: number;
      completed: number;
      errors: number;
      uncertain: number;
    }
  >();
  for (const event of events) {
    const summary = summaries.get(event.tool) ?? {
      tool: event.tool,
      started: 0,
      completed: 0,
      errors: 0,
      uncertain: 0,
    };
    if (event.phase === "started") summary.started += 1;
    else if (event.outcome === "ok") summary.completed += 1;
    else if (event.outcome === "error") summary.errors += 1;
    else summary.uncertain += 1;
    summaries.set(event.tool, summary);
  }
  return [...summaries.values()].map((summary) => {
    const pending = Math.max(
      0,
      summary.started - summary.completed - summary.errors - summary.uncertain,
    );
    const parts = [
      ...(summary.completed ? [`${summary.completed} completed`] : []),
      ...(summary.errors ? [`${summary.errors} failed`] : []),
      ...(summary.uncertain + (!running ? pending : 0)
        ? [`${summary.uncertain + (!running ? pending : 0)} unconfirmed`]
        : []),
      ...(running && pending ? [`${pending} in progress`] : []),
    ];
    return { tool: summary.tool, status: parts.join(", ") };
  });
}
