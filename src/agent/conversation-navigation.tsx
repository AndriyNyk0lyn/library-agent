import type { Conversation } from "./schema";
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";
import { ErrorMessage } from "@/components/ui/feedback";

export function ConversationItem({
  conversation,
  selected,
  className = "break-words",
}: {
  conversation: Conversation;
  selected: boolean;
  className?: string;
}) {
  return (
    <li>
      <TextLink
        className={className}
        href={`/chat/${conversation.id}`}
        aria-current={selected ? "page" : undefined}
      >
        {conversation.title}
      </TextLink>
    </li>
  );
}
export function ConversationNavigation({
  conversations,
  selected,
  hasMore,
  loading,
  creating,
  error,
  onCreate,
  onLoadMore,
}: {
  conversations: Conversation[];
  selected?: Conversation;
  hasMore: boolean;
  loading: boolean;
  creating: boolean;
  error: string | null;
  onCreate: () => void;
  onLoadMore: () => void;
}) {
  return (
    <nav
      aria-label="Saved conversations"
      aria-busy={loading || creating}
      className="space-y-3"
    >
      <Button disabled={creating} onClick={onCreate}>
        {creating ? "Creating chat…" : "New chat"}
      </Button>
      <p className="text-sm text-muted">
        Drafts stay in this tab when switching chats. Switching stops receiving
        an active run; reopen it to check saved status.
      </p>
      {conversations.length === 0 && <p>No saved conversations yet.</p>}
      <ul className="space-y-2">
        {selected && !conversations.some((item) => item.id === selected.id) && (
          <ConversationItem conversation={selected} selected className="" />
        )}
        {conversations.map((item) => (
          <ConversationItem
            key={item.id}
            conversation={item}
            selected={selected?.id === item.id}
          />
        ))}
      </ul>
      {hasMore ? (
        <Button variant="outline" disabled={loading} onClick={onLoadMore}>
          {loading ? "Loading conversations…" : "Load older conversations"}
        </Button>
      ) : (
        <p className="text-sm text-muted">End of saved conversations.</p>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </nav>
  );
}
