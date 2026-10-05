"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  useAuiState,
  type ThreadMessageLike,
  type AppendMessage,
} from "@assistant-ui/react";
import { summarizeActivity, attemptedWrite } from "./activity";
import { readChatEvents } from "./chat-stream";
import { failureMessage } from "./failure-messages";
import { PlanResultCard } from "@/plans/plan-summary";
import { Button } from "@/components/ui/button";
import {
  activityLabels,
  snapshotSchema,
  type ChatRun,
  type ChatSnapshot,
  type ChatEvent,
} from "./schema";

function linkedText(text: string) {
  return text.split(/(https?:\/\/[^\s<>()]+)/g).map((part, index) => {
    if (!URL.canParse(part)) return part;
    const url = new URL(part);
    if (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
    )
      return (
        <a
          key={index}
          href={url.href}
          className="text-link"
          target="_blank"
          rel="noreferrer"
        >
          {part}
        </a>
      );
    return part;
  });
}

const RunsContext = createContext<ChatRun[]>([]);
const RecoveryContext = createContext(false);
function ChatMessage() {
  const id = useAuiState((state) => state.message.id);
  const role = useAuiState((state) => state.message.role);
  const runs = useContext(RunsContext);
  const needsRecovery = useContext(RecoveryContext);
  const run = runs.find((run) => `${run.id}:assistant` === id);
  const activity = run
    ? summarizeActivity(run.activity, run.status === "active" && !needsRecovery)
    : [];
  return (
    <MessagePrimitive.Root className="rounded border border-line bg-surface p-4">
      <p className="mb-2 text-sm font-semibold">
        {role === "user" ? "You" : "Reading companion"}
      </p>
      <div className="whitespace-pre-wrap">
        {run?.answer ? linkedText(run.answer) : <MessagePrimitive.Parts />}
      </div>
      {run && (
        <>
          {run.activity.length > 0 && (
            <ul
              className="mt-3 space-y-1 text-sm text-muted"
              aria-label="Tool activity"
            >
              {activity.map((summary) => (
                <li key={summary.tool}>
                  {activityLabels[summary.tool]} — {summary.status}
                </li>
              ))}
            </ul>
          )}
          {run.cards.map((card) => (
            <article
              key={"id" in card ? card.id : card.provider_id}
              className="mt-3 rounded border border-line p-3"
            >
              {"id" in card ? (
                <Link href={`/library/${card.id}`} className="text-link">
                  {card.title}
                </Link>
              ) : (
                <>
                  <p className="text-sm text-muted">
                    Open Library · external suggestion · not saved
                  </p>
                  <a
                    href={card.source_url}
                    className="text-link"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {card.title}
                  </a>
                </>
              )}
              <p className="text-sm text-muted">
                {card.authors.join(", ") || "Authors unknown"}
              </p>
              <p>{card.reason}</p>
              <p className="mt-1 text-sm">Trade-off: {card.trade_off}</p>
              <p className="text-sm">Uncertainty: {card.uncertainty}</p>
            </article>
          ))}
          {run.plans.map((plan, index) => (
            <PlanResultCard key={index} result={plan} />
          ))}
          {run.status !== "completed" && (
            <p className="mt-2 text-sm" role="status">
              {run.status === "active" && !needsRecovery
                ? "Run in progress…"
                : run.status === "active"
                  ? "Reload saved status to confirm the outcome; writes may have completed."
                  : attemptedWrite(run.activity)
                    ? "Check your book/preference updates and saved plans before asking again; writes may have completed."
                    : "This run did not attempt a book, preference or plan save."}
            </p>
          )}
        </>
      )}
    </MessagePrimitive.Root>
  );
}
function toMessages(
  runs: ChatRun[],
  needsRecovery: boolean,
): ThreadMessageLike[] {
  return runs.flatMap((run): ThreadMessageLike[] => [
    {
      id: `${run.id}:user`,
      role: "user",
      content: [{ type: "text", text: run.input }],
      createdAt: new Date(run.created_at),
    },
    {
      id: `${run.id}:assistant`,
      role: "assistant",
      content: [
        {
          type: "text",
          text:
            run.answer ??
            (run.status === "active" && !needsRecovery
              ? "Working on your request…"
              : failureMessage(run.error_code)),
        },
      ],
      createdAt: new Date(run.created_at),
    },
  ]);
}

function mergeRuns(older: ChatRun[], newer: ChatRun[]): ChatRun[] {
  const merged = new Map(older.map((run) => [run.id, run]));
  for (const run of newer) merged.set(run.id, run);
  return [...merged.values()].sort(
    (a, b) =>
      a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
}

export function Chat({ initialSnapshot }: { initialSnapshot: ChatSnapshot }) {
  const conversationId = initialSnapshot.conversation.id;
  const [runs, setRuns] = useState(initialSnapshot.runs);
  const [cursor, setCursor] = useState(initialSnapshot.next_cursor);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pendingTextRef = useRef<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [needsRecovery, setNeedsRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();
  const active = runs.some((run) => run.status === "active");
  const blocked = sending || active || needsRecovery;

  const recover = useCallback(async () => {
    setRecovering(true);
    try {
      const response = await fetch(
        `/api/chat?conversation_id=${conversationId}`,
        {
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok)
        throw new Error(
          "Could not reload saved chat. Check sign-in and the database setup, then try again.",
        );
      const snapshot = snapshotSchema.parse(await response.json());
      if (!mountedRef.current || snapshot.conversation.id !== conversationId)
        return;
      setRuns((previous) =>
        mergeRuns(
          previous.filter(
            (run) => Date.parse(run.created_at) >= Date.now() - 30 * 86400000,
          ),
          snapshot.runs,
        ),
      );
      // Restart pagination at the latest page after recovery, so gaps from other tabs remain reachable.
      setCursor(snapshot.next_cursor);
      setNeedsRecovery(false);
      setError(null);
      router.refresh();
    } catch {
      setNeedsRecovery(true);
      setError(
        "Could not reload saved status. Try again before submitting another turn.",
      );
    } finally {
      setRecovering(false);
    }
  }, [router, conversationId]);
  // GET-only recovery after refresh/disconnect. Expiry is applied by the database read.
  useEffect(() => {
    if (!active || sending || recovering || needsRecovery) return;
    const timer = setTimeout(() => {
      void recover();
    }, 3000);
    return () => clearTimeout(timer);
  }, [active, sending, recovering, needsRecovery, recover]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  async function loadOlder() {
    if (!cursor || loadingOlder) return;
    setLoadingOlder(true);
    setHistoryError(null);
    const viewport = viewportRef.current;
    const previousHeight = viewport?.scrollHeight ?? 0;
    const previousTop = viewport?.scrollTop ?? 0;
    try {
      const response = await fetch(
        `/api/chat?conversation_id=${conversationId}&cursor=${encodeURIComponent(JSON.stringify(cursor))}`,
        { cache: "no-store", signal: AbortSignal.timeout(15000) },
      );
      if (!response.ok) throw new Error("HISTORY_UNAVAILABLE");
      const page = snapshotSchema.parse(await response.json());
      if (!mountedRef.current || page.conversation.id !== conversationId)
        return;
      // Known/streamed results win over an older page fetched before their completion.
      setRuns((previous) => mergeRuns(page.runs, previous));
      setCursor(page.next_cursor);
      requestAnimationFrame(() => {
        if (viewport && mountedRef.current)
          viewport.scrollTop =
            previousTop + viewport.scrollHeight - previousHeight;
      });
    } catch {
      if (mountedRef.current)
        setHistoryError("Could not load older messages. Try again.");
    } finally {
      if (mountedRef.current) setLoadingOlder(false);
    }
  }

  async function onNew(message: AppendMessage) {
    if (blocked || abortRef.current) return;
    const text = message.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
    if (!text.trim() || text.length > 4000) {
      setError("Enter a message of 1–4,000 characters.");
      runtime.thread.composer.setText(text);
      return;
    }
    pendingTextRef.current = text;
    const id = crypto.randomUUID();
    const controller = new AbortController();
    abortRef.current = controller;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: id,
          conversation_id: conversationId,
          message: text,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const failure = await response.json();
        const parsed =
          typeof failure === "object" &&
          failure !== null &&
          "error" in failure &&
          typeof failure.error === "string"
            ? failure.error
            : "Could not submit this turn.";
        throw new Error(parsed);
      }
      const handle = (event: ChatEvent) => {
        if (!mountedRef.current) throw new Error("Chat switched.");
        if (
          event.run_id !== id ||
          event.conversation_id !== conversationId ||
          ((event.type === "run_completed" || event.type === "run_failed") &&
            event.run &&
            (event.run.conversation_id !== conversationId ||
              event.run.id !== id))
        )
          throw new Error("Unexpected run response.");
        if (event.type === "run_started")
          setRuns((previous) => [
            ...previous,
            {
              id,
              conversation_id: conversationId,
              input: text,
              status: "active" as const,
              answer: null,
              cards: [],
              plans: [],
              activity: [],
              error_code: null,
              created_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 75000).toISOString(),
            },
          ]);
        if (event.type === "tool_started" || event.type === "tool_completed")
          setRuns((previous) =>
            previous.map((run) =>
              run.id === id
                ? { ...run, activity: [...run.activity, event.activity] }
                : run,
            ),
          );
        if (event.type === "message_delta")
          setRuns((previous) =>
            previous.map((run) =>
              run.id === id
                ? { ...run, answer: (run.answer ?? "") + event.delta }
                : run,
            ),
          );
        if (event.type === "run_completed") {
          pendingTextRef.current = null;
          setRuns((previous) =>
            previous.map((run) => (run.id === id ? event.run : run)),
          );
          router.refresh();
        }
        if (event.type === "run_failed") {
          if (event.run) {
            const failedRun = event.run;
            setRuns((previous) =>
              previous.map((run) => (run.id === id ? failedRun : run)),
            );
          }
          throw new Error(
            event.run
              ? "Reload saved status before sending another request."
              : event.message,
          );
        }
      };
      await readChatEvents(response, handle);
    } catch (failure) {
      if (!mountedRef.current) return;
      setNeedsRecovery(true);
      setError(
        controller.signal.aborted
          ? "Stopped receiving this run. Reload saved status; writes may have completed."
          : failure instanceof Error
            ? failure.message
            : "Run outcome is uncertain. Reload saved status.",
      );
      // Keep the user's text available, but never submit it again automatically.
      pendingTextRef.current = null;
      runtime.thread.composer.setText(text);
    } finally {
      abortRef.current = null;
      setSending(false);
    }
  }
  const runtime = useExternalStoreRuntime({
    messages: toMessages(runs, needsRecovery),
    convertMessage: (message: ThreadMessageLike) => message,
    isRunning: sending || (active && !needsRecovery),
    isDisabled: needsRecovery || active || sending,
    onNew,
    onCancel: async () => {
      abortRef.current?.abort();
      setNeedsRecovery(true);
    },
  });
  useEffect(() => {
    const key = `reading-companion:draft:${conversationId}`;
    try {
      runtime.thread.composer.setText(sessionStorage.getItem(key) ?? "");
    } catch {
      queueMicrotask(() => {
        if (mountedRef.current)
          setDraftError(
            "Tab storage is unavailable. Copy your draft before switching chats or refreshing.",
          );
      });
    }
    const saveDraft = () => {
      try {
        sessionStorage.setItem(
          key,
          runtime.thread.composer.getState().text ||
            pendingTextRef.current ||
            "",
        );
      } catch {
        setDraftError(
          "Could not retain this draft in tab storage. Copy it before switching chats or refreshing.",
        );
      }
    };
    const unsubscribe = runtime.thread.composer.subscribe(saveDraft);
    return () => {
      saveDraft();
      unsubscribe();
    };
  }, [runtime, conversationId]);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <RunsContext.Provider value={runs}>
        <RecoveryContext.Provider value={needsRecovery}>
          <ThreadPrimitive.Root className="space-y-4">
            {cursor ? (
              <Button
                variant="outline"
                disabled={loadingOlder}
                onClick={() => void loadOlder()}
              >
                {loadingOlder ? "Loading messages…" : "Load older messages"}
              </Button>
            ) : (
              <p className="text-sm text-muted">
                Beginning of retained messages.
              </p>
            )}
            {historyError && <p role="alert">{historyError}</p>}
            <ThreadPrimitive.Viewport
              ref={viewportRef}
              className="max-h-[60vh] space-y-3 overflow-y-auto rounded"
              aria-label="Conversation"
            >
              {runs.length === 0 && (
                <p className="rounded border border-line p-4">
                  Ask what to read next, compare books, or update a reading
                  reaction. Recommendations use books saved in your library.
                </p>
              )}
              <ThreadPrimitive.Messages
                components={{
                  UserMessage: ChatMessage,
                  AssistantMessage: ChatMessage,
                }}
              />
            </ThreadPrimitive.Viewport>
            <div aria-live="polite" className="text-sm text-muted">
              {sending || (active && !needsRecovery)
                ? "A run is active. Tool activity appears with the reply."
                : "Up to 10 runs per reader per hour across all chats. History is retained for 30 days."}
            </div>
            {error && <p role="alert">{error}</p>}
            {draftError && <p role="alert">{draftError}</p>}
            {(needsRecovery || active) && (
              <Button
                variant="outline"
                disabled={recovering || sending}
                onClick={() => void recover()}
              >
                {recovering ? "Reloading…" : "Reload saved status"}
              </Button>
            )}
            <ComposerPrimitive.Root className="space-y-2">
              <label htmlFor="chat-input" className="form-label">
                Message your reading companion
              </label>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => abortRef.current?.abort()}
                >
                  Stop run
                </Button>
              )}
            </ComposerPrimitive.Root>
            <p className="text-sm text-muted">
              Only the latest five exchanges in this chat provide model context;
              loading older messages does not expand it. Explicitly saved
              preferences are shared across chats. Saved library updates and
              plans remain available independently.{" "}
              <Link href="/profile" className="text-link">
                Edit preferences
              </Link>
              .
            </p>
          </ThreadPrimitive.Root>
        </RecoveryContext.Provider>
      </RunsContext.Provider>
    </AssistantRuntimeProvider>
  );
}
