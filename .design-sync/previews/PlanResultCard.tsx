import { PlanResultCard } from "reading-companion";

const calculation = { book_id: "b3", book_version: 2, title: "Middlemarch", authors: ["George Eliot"], start_date: "2026-10-12", target_date: "2026-11-30", timezone: "Europe/London", remaining_pages: 640, pages_read: 240, page_count: 880, available_days: 50, daily_pages: 13, pages_per_hour: 40, daily_reading_minutes: 30, estimated_daily_minutes: 20, time_feasibility: "feasible", assumptions: ["Reading every day including weekends", "Page count from your saved book"] } as const;

export const Saved = () => (
  <PlanResultCard result={{ kind: "saved", plan: { ...calculation, time_feasibility: "feasible", id: "p1", operation_id: "o1", status: "active", created_at: "2026-10-12T09:00:00Z" } }} />
);

export const Suggestion = () => (
  <PlanResultCard result={{ kind: "suggestion", calculation: { ...calculation, daily_reading_minutes: null, estimated_daily_minutes: null, time_feasibility: "unknown" } }} />
);

export const Rejected = () => (
  <PlanResultCard result={{ kind: "rejected", error: { code: "PLAN_INFEASIBLE", message: "640 pages in 5 days needs 128 pages a day, above your 30-minute budget." } }} />
);
