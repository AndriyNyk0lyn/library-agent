import { randomBytes } from "node:crypto";
import { z } from "zod";
import { chatError, chatReader, readChatBody } from "@/agent/http";
import { loadChat } from "@/agent/storage";
import { turnSchema, chatEventSchema, type ChatEvent } from "@/agent/schema";
import { agentConfig, executeChat } from "@/agent/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function GET(request: Request) {
  try {
    const reader = await chatReader(request);
    if (reader instanceof Response) return reader;
    return Response.json(await loadChat(reader), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return chatError(
      503,
      "Could not load chat. Check the chat migration and reload.",
    );
  }
}
export async function POST(request: Request) {
  const controller = new AbortController();
  const signal = AbortSignal.any([
    request.signal,
    controller.signal,
    AbortSignal.timeout(60000),
  ]);
  try {
    const reader = await chatReader(request);
    if (reader instanceof Response) return reader;
    let input: z.output<typeof turnSchema>;
    try {
      input = turnSchema.parse(await readChatBody(request, signal));
    } catch {
      return chatError(
        400,
        "Send a message of 1–4,000 characters and a valid run ID.",
      );
    }
    let model: string;
    try {
      model = agentConfig().model;
    } catch {
      return chatError(
        503,
        "Configure OPENAI_API_KEY and OPENAI_MODEL on the server before using chat.",
      );
    }
    signal.throwIfAborted();
    const runKey = randomBytes(32).toString("hex");
    const { data, error } = await reader.supabase
      .rpc("start_agent_run", {
        p_id: input.run_id,
        p_input: input.message,
        p_model: model,
        p_key: runKey,
      })
      .abortSignal(signal);
    if (error)
      return chatError(
        503,
        "Could not confirm run submission. Reload saved status before sending again.",
      );
    const started = z
      .union([
        z.strictObject({ ok: z.literal(true) }),
        z.strictObject({ ok: z.literal(false), code: z.string() }),
      ])
      .parse(data);
    if (!started.ok)
      return chatError(
        started.code === "QUOTA_EXCEEDED" ? 429 : 409,
        {
          QUOTA_EXCEEDED:
            "You have reached 10 runs in the last hour. Try later.",
          RUN_ACTIVE:
            "A run is already active. Reload saved status; expired runs recover automatically.",
          ALREADY_SUBMITTED:
            "This turn was already submitted. Reload saved status; it will not be replayed.",
          CONFLICT: "This run ID has different input. Reload saved status.",
        }[started.code] ?? "Could not start this run. Reload saved status.",
      );
    const encoder = new TextEncoder();
    let connected = true;
    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        const emit = (event: ChatEvent) => {
          if (!connected) return;
          try {
            streamController.enqueue(
              encoder.encode(
                `data: ${JSON.stringify(chatEventSchema.parse(event))}\n\n`,
              ),
            );
          } catch {
            connected = false;
            controller.abort();
          }
        };
        emit({ type: "run_started", run_id: input.run_id });
        void executeChat(
          reader,
          reader.token,
          input.run_id,
          runKey,
          input.message,
          signal,
          emit,
        )
          .catch(() => {
            emit({
              type: "run_failed",
              run_id: input.run_id,
              message:
                "The run outcome is uncertain. Reload saved status and check updates before sending again.",
            });
          })
          .finally(() => {
            if (connected) {
              connected = false;
              streamController.close();
            }
          });
      },
      cancel() {
        connected = false;
        controller.abort();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "private, no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return chatError(
      503,
      "Chat is unavailable. Reload saved status before submitting another turn.",
    );
  }
}
