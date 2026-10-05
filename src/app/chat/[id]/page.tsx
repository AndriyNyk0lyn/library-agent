import { SavedChatPage } from "@/agent/chat-page";
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SavedChatPage conversationId={id} />;
}
