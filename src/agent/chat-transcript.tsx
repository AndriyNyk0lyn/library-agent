"use client";
import type { Ref } from "react";
import { ThreadPrimitive } from "@assistant-ui/react";
import { ChatMessage } from "./chat-message";

export function ChatTranscript({
  viewportRef,
  empty,
}: {
  viewportRef: Ref<HTMLDivElement>;
  empty: boolean;
}) {
  return (
    <ThreadPrimitive.Viewport
      ref={viewportRef}
      className="max-h-[60vh] space-y-3 overflow-y-auto rounded"
      aria-label="Conversation"
    >
      {empty && (
        <p className="rounded border border-line p-4">
          Ask what to read next, compare books, or update a reading reaction.
          Recommendations use books saved in your library.
        </p>
      )}
      <ThreadPrimitive.Messages
        components={{
          UserMessage: ChatMessage,
          AssistantMessage: ChatMessage,
        }}
      />
    </ThreadPrimitive.Viewport>
  );
}
