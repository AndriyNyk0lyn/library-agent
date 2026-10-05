import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { chatError, chatReader, readChatBody } from "@/agent/http";
import { loadChat, ConversationNotFound } from "@/agent/storage";
import {
  historyCursorSchema,
  turnSchema,
  chatEventSchema,
  type ChatEvent,
} from "@/agent/schema";
import { agentConfig } from "./config";
import { executeChat } from "./runner";

export async function getChat(request: Request) {
  try {
    const reader = await chatReader(request);
    if (reader instanceof Response) return reader;
    const url = new URL(request.url);
    const conversation = z
      .uuid()
      .safeParse(url.searchParams.get("conversation_id"));
    let cursor;
    try {
      const raw = url.searchParams.get("cursor");
      if (raw && raw.length > 1000) throw new Error("CURSOR_LIMIT");
      cursor = raw ? historyCursorSchema.parse(JSON.parse(raw)) : undefined;
    } catch {
      return chatError(400, "Invalid history cursor.");
    }
    if (!conversation.success)
      return chatError(400, "Choose a valid conversation.");
    return Response.json(await loadChat(reader, conversation.data, cursor), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof ConversationNotFound)
      return chatError(404, "Conversation not found or no longer retained.");
    return chatError(
      503,
      "Could not load chat. Check the chat migration and reload.",
    );
  }
}
export async function postChat(request: Request) {
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
        "Send a message of 1–4,000 characters and valid conversation and run IDs.",
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
        p_conversation_id: input.conversation_id,
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
        started.code === "NOT_FOUND"
          ? 404
          : started.code === "QUOTA_EXCEEDED"
            ? 429
            : 409,
        {
          NOT_FOUND: "Conversation not found or no longer retained.",
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
        emit({
          type: "run_started",
          run_id: input.run_id,
          conversation_id: input.conversation_id,
        });
        void executeChat(
          reader,
          reader.token,
          input.conversation_id,
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
              conversation_id: input.conversation_id,
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
