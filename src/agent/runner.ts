import "server-only";
import { Runner, OpenAIProvider } from "@openai/agents";
import type { ReaderContext } from "@/books/service";
import { profileResultSchema } from "@/profile/schema";
import { agentAnswerSchema, type ChatEvent } from "./schema";
import {
  continuationBatch,
  loadHistory,
  recordActivity,
  loadChat,
  finishRun,
  persistFailedRun,
} from "./storage";
import { agentConfig, createLibrarian } from "./config";
import { ObservedMcp } from "./observed-mcp";
import { validateRecommendationCards } from "./answer-results";
import { reportRunFailure } from "./run-failure";
import { RecommendationCandidates } from "./recommendation-candidates";
import { runFailureMessages } from "./failure-messages";

export async function executeChat(
  reader: ReaderContext,
  token: string,
  conversationId: string,
  runId: string,
  runKey: string,
  message: string,
  signal: AbortSignal,
  emit: (event: ChatEvent) => void,
) {
  const config = agentConfig();
  const candidates = new RecommendationCandidates(runId.slice(0, 8));
  const mcp = new ObservedMcp(
    token,
    signal,
    candidates,
    async (activity) => {
      await recordActivity(reader, runId, activity, runKey);
      emit({
        type: activity.phase === "started" ? "tool_started" : "tool_completed",
        run_id: runId,
        conversation_id: conversationId,
        activity,
      });
    },
    runId.slice(0, 8),
  );
  const provider = new OpenAIProvider({
    apiKey: config.key,
    useResponses: true,
  });
  let completed = false;
  try {
    await mcp.connect();
    const profileResponse = await mcp.callToolResult(
      "get_reader_profile",
      {},
      null,
      { signal },
    );
    const profile = profileResultSchema.parse(
      profileResponse.structuredContent,
    );
    if (!profile.ok) throw new Error("PROFILE_UNAVAILABLE");
    const agent = createLibrarian(
      await provider.getModel(config.model),
      mcp,
      profile.profile,
      runId,
    );
    const history = await loadHistory(reader, conversationId);
    const input = [...history, { role: "user" as const, content: message }];
    const runner = new Runner({
      modelProvider: provider,
      tracingDisabled: false,
      traceIncludeSensitiveData: false,
    });
    const result = await runner.run(agent, input, {
      maxTurns: 8,
      signal,
      stream: true,
    });
    // Provider events contain private payloads/JSON/reasoning. Only durable activity and validated final prose reach the browser.
    for await (const event of result) {
      void event;
      signal.throwIfAborted();
    }
    await result.completed;
    const answer = agentAnswerSchema.parse(result.finalOutput);
    const cards = await validateRecommendationCards(answer, candidates, mcp);
    const sources = [...mcp.webSources.values()];
    const finalMessage = sources.length
      ? `${answer.message}\n\nWeb sources:\n${sources.map((source) => `${source.title} — ${source.url}`).join("\n")}`
      : answer.message;
    if (finalMessage.length > 12000) throw new Error("ANSWER_TOO_LONG");
    signal.throwIfAborted();
    // Remove no tool history: manual continuation includes SDK calls, results and assistant items.
    const batch = continuationBatch(result.history, history.length);
    const saved = await finishRun(reader, runId, runKey, {
      status: "completed",
      answer: finalMessage,
      cards,
      plans: mcp.plans.displays,
      history: batch,
      error: null,
      usage: result.state.usage,
    });
    if (!saved) throw new Error("PERSISTENCE_UNCERTAIN");
    completed = true;
    emit({
      type: "message_delta",
      run_id: runId,
      conversation_id: conversationId,
      delta: finalMessage,
    });
    const snapshot = await loadChat(reader, conversationId);
    const run = snapshot.runs.find((run) => run.id === runId);
    if (!run) throw new Error("PERSISTENCE_UNCERTAIN");
    emit({
      type: "run_completed",
      run_id: runId,
      conversation_id: conversationId,
      run,
    });
  } catch (error) {
    const code = reportRunFailure(error, signal, runId);
    const detail = runFailureMessages[code];
    const failedRun = completed
      ? undefined
      : await persistFailedRun(
          reader,
          conversationId,
          runId,
          runKey,
          signal.aborted,
          code,
          mcp.plans.displays,
        );
    emit({
      type: "run_failed",
      ...(failedRun ? { run: failedRun } : {}),
      run_id: runId,
      conversation_id: conversationId,
      message: `${detail} Reload saved status before sending another request. ${mcp.attemptedWrite ? "Check book/profile updates and saved plans; writes may have completed." : "This run did not attempt a book, preference or plan save."}`,
    });
  } finally {
    // Closing both resources is attempted even when one cleanup fails; never log bearer-bearing errors.
    await Promise.allSettled([mcp.close(), provider.close()]);
  }
}
