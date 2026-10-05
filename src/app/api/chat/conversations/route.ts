import { z } from "zod";
import { chatReader, chatError, readChatBody } from "@/agent/http";
import { loadConversations, createConversation } from "@/agent/storage";
import { conversationCursorSchema } from "@/agent/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const reader = await chatReader(request);
    if (reader instanceof Response) return reader;
    let cursor;
    try {
      const raw = new URL(request.url).searchParams.get("cursor");
      if (raw && raw.length > 1000) throw new Error("CURSOR_LIMIT");
      cursor = raw
        ? conversationCursorSchema.parse(JSON.parse(raw))
        : undefined;
    } catch {
      return chatError(400, "Invalid conversation cursor.");
    }
    return Response.json(await loadConversations(reader, cursor), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return chatError(503, "Could not load conversations. Try again.");
  }
}
export async function POST(request: Request) {
  try {
    const reader = await chatReader(request);
    if (reader instanceof Response) return reader;
    let input;
    try {
      input = z
        .strictObject({ conversation_id: z.uuid() })
        .parse(await readChatBody(request, AbortSignal.timeout(10000)));
    } catch {
      return chatError(400, "Provide a valid conversation ID.");
    }
    return Response.json(
      await createConversation(reader, input.conversation_id),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return chatError(
      503,
      "Creation is unconfirmed. Retry with the same conversation ID.",
    );
  }
}
