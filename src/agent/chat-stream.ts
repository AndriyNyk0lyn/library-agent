import { chatEventSchema, type ChatEvent } from "./schema";

// Decoding owns stream cleanup; callers own run identity and UI/composer recovery.
export async function readChatEvents(
  response: Response,
  handle: (event: ChatEvent) => void,
) {
  if (
    !response.body ||
    !response.headers.get("content-type")?.includes("text/event-stream")
  )
    throw new Error("Chat did not return a readable stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedFinal = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.length > 100000)
        throw new Error("Chat stream exceeded its limit.");
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        if (!frame.startsWith("data: "))
          throw new Error("Unexpected chat event.");
        const event = chatEventSchema.parse(JSON.parse(frame.slice(6)));
        handle(event);
        if (event.type === "run_completed") receivedFinal = true;
      }
    }
    if (!receivedFinal)
      throw new Error(
        "Connection ended before a final outcome. Reload saved status; writes may have completed.",
      );
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}
