"use client";
import { ComposerPrimitive } from "@assistant-ui/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TextLink } from "@/components/ui/text-link";

export function ChatComposer({
  blocked,
  sending,
  onStop,
}: {
  blocked: boolean;
  sending: boolean;
  onStop: () => void;
}) {
  return (
    <ComposerPrimitive.Root className="space-y-2">
      <Label htmlFor="chat-input">Message your reading companion</Label>
      <ComposerPrimitive.Input
        id="chat-input"
        maxLength={4000}
        rows={3}
        className="form-field"
        placeholder="What should I read next from my owned books?"
      />
      <ComposerPrimitive.Send asChild>
        <Button disabled={blocked}>Send message</Button>
      </ComposerPrimitive.Send>
      {sending && (
        <Button type="button" variant="outline" onClick={onStop}>
          Stop run
        </Button>
      )}
    </ComposerPrimitive.Root>
  );
}
export function ChatContextNotice() {
  return (
    <p className="text-sm text-muted">
      Only the latest five exchanges in this chat provide model context; loading
      older messages does not expand it. Explicitly saved preferences are shared
      across chats. Saved library updates and plans remain available
      independently. <TextLink href="/profile">Edit preferences</TextLink>.
    </p>
  );
}
