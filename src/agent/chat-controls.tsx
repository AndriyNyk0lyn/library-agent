import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/feedback";

export function ChatHistoryControls({
  hasOlder,
  loading,
  error,
  onLoadOlder,
}: {
  hasOlder: boolean;
  loading: boolean;
  error: string | null;
  onLoadOlder: () => void;
}) {
  return (
    <>
      {hasOlder ? (
        <Button variant="outline" disabled={loading} onClick={onLoadOlder}>
          {loading ? "Loading messages…" : "Load older messages"}
        </Button>
      ) : (
        <p className="text-sm text-muted">Beginning of retained messages.</p>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </>
  );
}
export function ChatRecoveryControls({
  error,
  draftError,
  visible,
  recovering,
  sending,
  onRecover,
}: {
  error: string | null;
  draftError: string | null;
  visible: boolean;
  recovering: boolean;
  sending: boolean;
  onRecover: () => void;
}) {
  return (
    <>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {draftError && <ErrorMessage>{draftError}</ErrorMessage>}
      {visible && (
        <Button
          variant="outline"
          disabled={recovering || sending}
          onClick={onRecover}
        >
          {recovering ? "Reloading…" : "Reload saved status"}
        </Button>
      )}
    </>
  );
}
export function ChatRunLimits({ running }: { running: boolean }) {
  return (
    <div aria-live="polite" className="text-sm text-muted">
      {running
        ? "A run is active. Tool activity appears with the reply."
        : "Up to 10 runs per reader per hour across all chats. History is retained for 30 days."}
    </div>
  );
}
