import { requireReader } from "@/auth/reader";
import { PageHeading } from "@/components/page-heading";
import { loadChat } from "@/agent/storage";
import { Chat } from "@/agent/chat";
export default async function ChatPage() {
  const reader = await requireReader();
  let snapshot;
  try {
    snapshot = await loadChat(reader);
  } catch {
    return (
      <>
        <PageHeading
          title="Reading companion"
          description="Talk through your next read."
        />
        <p role="alert">
          Could not load chat. Apply the chat migration and check sign-in.{" "}
          <a href="/chat" className="text-link">
            Try again
          </a>
          .
        </p>
      </>
    );
  }
  return (
    <>
      <PageHeading
        title="Reading companion"
        description="Talk through your next read and save requested library updates."
      />
      <Chat initialRuns={snapshot.runs} />
    </>
  );
}
