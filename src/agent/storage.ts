import "server-only";
import { protocol, type AgentInputItem } from "@openai/agents";
import { z } from "zod";
import type { ReaderContext } from "@/books/service";
import type { Json } from "@/lib/supabase/database.types";
import { snapshotSchema, type Activity } from "./schema";

// JSON round-trip strips SDK objects and validates the database boundary without a cast.
const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema),
  ]),
);
export function asJson(value: unknown): Json {
  return jsonSchema.parse(JSON.parse(JSON.stringify(value)));
}
const historyBatchSchema = z.array(protocol.ModelItem).max(200);
export async function loadChat(reader: ReaderContext) {
  const { data, error } = await reader.supabase
    .rpc("chat_snapshot")
    .abortSignal(AbortSignal.timeout(10000));
  if (error)
    throw new Error(
      "Could not load chat. Apply the chat migration and try again.",
    );
  return snapshotSchema.parse(data);
}
export async function loadHistory(
  reader: ReaderContext,
): Promise<AgentInputItem[]> {
  const { data, error } = await reader.supabase
    .rpc("agent_history")
    .abortSignal(AbortSignal.timeout(10000));
  if (error) throw new Error("HISTORY_UNAVAILABLE");
  const batches = z.array(historyBatchSchema).max(5).parse(data);
  // Drop complete oldest exchanges to bound input; preserve every call/result pair.
  while (Buffer.byteLength(JSON.stringify(batches)) > 524288) batches.shift();
  return batches.flat();
}
export function continuationBatch(
  history: AgentInputItem[],
  inputLength: number,
) {
  const batch = historyBatchSchema.parse(history.slice(inputLength));
  if (Buffer.byteLength(JSON.stringify(batch)) > 524288)
    throw new Error("HISTORY_LIMIT");
  return asJson(batch);
}
export async function recordActivity(
  reader: ReaderContext,
  runId: string,
  activity: Activity,
  runKey: string,
) {
  const { data, error } = await reader.supabase
    .rpc("record_agent_activity", {
      p_id: runId,
      p_activity: asJson(activity),
      p_key: runKey,
    })
    .abortSignal(AbortSignal.timeout(5000));
  if (error || !data) throw new Error("ACTIVITY_UNAVAILABLE");
}
