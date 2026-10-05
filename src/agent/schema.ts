import { z } from "zod";
import { planDisplaySchema } from "@/plans/schema";

export const turnSchema = z.strictObject({
  run_id: z.uuid(),
  conversation_id: z.uuid(),
  message: z.string().trim().min(1).max(4000),
});
export const recommendationSchema = z.strictObject({
  id: z.uuid(),
  reason: z.string().min(1).max(1000),
  trade_off: z.string().min(1).max(1000),
  uncertainty: z.string().min(1).max(1000),
});
export const agentRecommendationSchema = recommendationSchema
  .omit({ id: true })
  .extend({
    candidate_ref: z
      .string()
      .regex(/^[0-9a-f]{8}:[1-9][0-9]*$/)
      .max(24),
  });
export const externalRecommendationSchema = recommendationSchema
  .omit({ id: true })
  .extend({
    catalog_ref: z
      .string()
      .regex(/^[0-9a-f]{8}:catalog:[1-9][0-9]*$/)
      .max(40),
  });
export const externalBookCardSchema = recommendationSchema
  .omit({ id: true })
  .extend({
    source: z.literal("open_library"),
    provider_id: z.string().regex(/^OL[0-9]+[WM]$/),
    source_url: z
      .string()
      .regex(
        /^https:\/\/openlibrary\.org\/(?:works\/OL[0-9]+W|books\/OL[0-9]+M)$/,
      ),
    title: z.string().min(1).max(500),
    authors: z.array(z.string()).max(10),
  });
export const MAX_RECOMMENDATIONS = 4;

export const agentAnswerSchema = z.strictObject({
  message: z.string().min(1).max(12000),
  owned_only: z.boolean(),
  recommendations: z.array(agentRecommendationSchema).max(MAX_RECOMMENDATIONS),
  external_recommendations: z
    .array(externalRecommendationSchema)
    .max(MAX_RECOMMENDATIONS)
    .default([]),
});
export const bookCardSchema = recommendationSchema.extend({
  title: z.string().min(1).max(500),
  authors: z.array(z.string()).min(1).max(10),
});
export const activitySchema = z.strictObject({
  tool: z.enum([
    "search_catalog",
    "get_catalog_book",
    "add_catalog_book",
    "preview_library_update",
    "apply_library_update",
    "search_web",
    "search_my_library",
    "get_book",
    "update_book",
    "get_reader_profile",
    "update_reader_profile",
    "calculate_reading_plan",
    "save_reading_plan",
    "list_reading_plans",
  ]),
  phase: z.enum(["started", "completed"]),
  outcome: z.enum(["ok", "error", "uncertain"]).optional(),
});
export type Activity = z.output<typeof activitySchema>;
export const runSchema = z.strictObject({
  id: z.uuid(),
  conversation_id: z.uuid(),
  status: z.enum(["active", "completed", "failed", "interrupted"]),
  input: z.string().max(4000),
  answer: z.string().max(12000).nullable(),
  cards: z
    .array(z.union([bookCardSchema, externalBookCardSchema]))
    .max(MAX_RECOMMENDATIONS),
  plans: z.array(planDisplaySchema).max(5).default([]),
  activity: z.array(activitySchema).max(100),
  error_code: z.string().max(100).nullable(),
  created_at: z.iso.datetime({ offset: true }),
  expires_at: z.iso.datetime({ offset: true }),
});
export type ChatRun = z.output<typeof runSchema>;
export const historyCursorSchema = z.strictObject({
  at: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});
export const conversationCursorSchema = historyCursorSchema.extend({
  as_of: z.iso.datetime({ offset: true }),
});
export const conversationSchema = z.strictObject({
  id: z.uuid(),
  title: z.string().min(1).max(80),
  created_at: z.iso.datetime({ offset: true }),
  last_activity_at: z.iso.datetime({ offset: true }),
});
export type Conversation = z.output<typeof conversationSchema>;
export const conversationListSchema = z.strictObject({
  conversations: z.array(conversationSchema).max(20),
  next_cursor: conversationCursorSchema.nullable(),
});
export type ConversationList = z.output<typeof conversationListSchema>;
export const snapshotSchema = z
  .strictObject({
    conversation: conversationSchema,
    runs: z.array(runSchema).max(20),
    next_cursor: historyCursorSchema.nullable(),
  })
  .superRefine((snapshot, context) => {
    if (
      snapshot.runs.some(
        (run) => run.conversation_id !== snapshot.conversation.id,
      )
    )
      context.addIssue({ code: "custom", message: "Conversation mismatch" });
  });
export type ChatSnapshot = z.output<typeof snapshotSchema>;
export const chatEventSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("run_started"),
    run_id: z.uuid(),
    conversation_id: z.uuid(),
  }),
  z.strictObject({
    type: z.literal("tool_started"),
    run_id: z.uuid(),
    conversation_id: z.uuid(),
    activity: activitySchema,
  }),
  z.strictObject({
    type: z.literal("tool_completed"),
    run_id: z.uuid(),
    conversation_id: z.uuid(),
    activity: activitySchema,
  }),
  z.strictObject({
    type: z.literal("message_delta"),
    run_id: z.uuid(),
    conversation_id: z.uuid(),
    delta: z.string().max(12000),
  }),
  z.strictObject({
    type: z.literal("run_completed"),
    run_id: z.uuid(),
    conversation_id: z.uuid(),
    run: runSchema,
  }),
  z.strictObject({
    type: z.literal("run_failed"),
    run_id: z.uuid(),
    conversation_id: z.uuid(),
    run: runSchema.optional(),
    message: z.string().max(500),
  }),
]);
export type ChatEvent = z.output<typeof chatEventSchema>;
export const activityLabels: Record<Activity["tool"], string> = {
  calculate_reading_plan: "Checking an unsaved reading schedule",
  save_reading_plan: "Saving your reading plan",
  list_reading_plans: "Reading your saved plans",
  search_catalog: "Searching Open Library",
  get_catalog_book: "Reading Open Library edition details",
  add_catalog_book: "Adding an Open Library book to your library",
  preview_library_update: "Preparing your bulk book update",
  apply_library_update: "Saving your bulk book update",
  search_web: "Searching public book information on the internet",
  search_my_library: "Reading your library",
  get_book: "Reading book details",
  update_book: "Saving your book update",
  get_reader_profile: "Reading your saved preferences",
  update_reader_profile: "Saving your explicit preferences",
};
