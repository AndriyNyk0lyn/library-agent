import type { ChatSnapshot } from "./schema";
import { Chat } from "./chat";

export function SelectedChat({ snapshot }: { snapshot: ChatSnapshot | null }) {
  return (
    <section aria-label="Selected chat" className="min-w-0">
      {snapshot ? (
        <>
          <h2 className="mb-3 text-lg font-semibold">
            {snapshot.conversation.title}
          </h2>
          <Chat key={snapshot.conversation.id} initialSnapshot={snapshot} />
        </>
      ) : (
        <p>Select a saved conversation or start a new chat.</p>
      )}
    </section>
  );
}
