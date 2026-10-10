import { ErrorMessage } from "@/components/ui/feedback";
import { TextLink } from "@/components/ui/text-link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireReader } from "@/auth/reader";
import { PageHeading } from "@/components/page-heading";
import { loadChat, loadConversations, ConversationNotFound } from "./storage";
import { ChatWorkspace } from "./chat-workspace";

export async function SavedChatPage({
  conversationId,
}: {
  conversationId?: string;
}) {
  const reader = await requireReader();
  if (conversationId && !z.uuid().safeParse(conversationId).success) notFound();
  let list, snapshot;
  try {
    list = await loadConversations(reader);
    snapshot = conversationId ? await loadChat(reader, conversationId) : null;
  } catch (error) {
    if (error instanceof ConversationNotFound) notFound();
    return (
      <>
        <PageHeading
          title="Reading companion"
          description="Browse your saved conversations."
        />
        <ErrorMessage>
          Could not load chat history. Check sign-in and apply the chat history
          migration.{" "}
          <TextLink href={conversationId ? `/chat/${conversationId}` : "/chat"}>
            Try again
          </TextLink>
          .
        </ErrorMessage>
      </>
    );
  }
  return (
    <>
      <PageHeading
        title="Reading companion"
        description="Separate conversations, shared saved reader preferences."
      />
      <ChatWorkspace
        key={conversationId ?? "chat-list"}
        initialList={list}
        snapshot={snapshot}
      />
    </>
  );
}
