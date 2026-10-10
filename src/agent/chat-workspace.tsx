"use client";
import { ConversationNavigation } from "./conversation-navigation";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SelectedChat } from "./selected-chat";
import {
  conversationListSchema,
  conversationSchema,
  type ConversationList,
  type ChatSnapshot,
} from "./schema";

export function ChatWorkspace({
  initialList,
  snapshot,
}: {
  initialList: ConversationList;
  snapshot: ChatSnapshot | null;
}) {
  const [list, setList] = useState(initialList);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  async function loadMore() {
    if (!list.next_cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/chat/conversations?cursor=${encodeURIComponent(JSON.stringify(list.next_cursor))}`,
        { cache: "no-store", signal: AbortSignal.timeout(15000) },
      );
      if (!response.ok) throw new Error("LIST_UNAVAILABLE");
      const page = conversationListSchema.parse(await response.json());
      setList((previous) => ({
        conversations: [
          ...previous.conversations,
          ...page.conversations.filter(
            (item) =>
              !previous.conversations.some((known) => known.id === item.id),
          ),
        ],
        next_cursor: page.next_cursor,
      }));
    } catch {
      setError("Could not load older conversations. Try again.");
    } finally {
      setLoading(false);
    }
  }
  async function newChat() {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      // Store before sending: refresh after an uncertain POST must reuse this identity.
      const key = "reading-companion:pending-conversation";
      let id: string;
      try {
        id = sessionStorage.getItem(key) ?? crypto.randomUUID();
        sessionStorage.setItem(key, id);
      } catch {
        setError(
          "Tab storage is unavailable. Enable it before creating a chat so uncertain creation can be retried safely.",
        );
        return;
      }
      const response = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: id }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("CREATION_UNCONFIRMED");
      const conversation = conversationSchema.parse(await response.json());
      if (conversation.id !== id) throw new Error("IDENTITY_MISMATCH");
      sessionStorage.removeItem(key);
      router.push(`/chat/${conversation.id}`);
    } catch {
      setError(
        "Could not confirm the new chat. Select New chat to retry the same creation, including after refresh.",
      );
    } finally {
      setCreating(false);
    }
  }
  const conversationMap = new Map(
    list.conversations.map((item) => [item.id, item]),
  );
  for (const item of initialList.conversations)
    conversationMap.set(item.id, item);
  const conversations = [...conversationMap.values()].sort(
    (a, b) =>
      b.last_activity_at.localeCompare(a.last_activity_at) ||
      b.id.localeCompare(a.id),
  );
  return (
    <div className="grid gap-6 md:grid-cols-[16rem_minmax(0,1fr)]">
      <ConversationNavigation
        conversations={conversations}
        selected={snapshot?.conversation}
        hasMore={Boolean(list.next_cursor)}
        loading={loading}
        creating={creating}
        error={error}
        onCreate={() => void newChat()}
        onLoadMore={() => void loadMore()}
      />

      <SelectedChat snapshot={snapshot} />
    </div>
  );
}
