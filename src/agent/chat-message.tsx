"use client";
import { useContext } from "react";
import { MessagePrimitive, useAuiState } from "@assistant-ui/react";
import { PlanResultCard } from "@/plans/plan-summary";
import { LinkedText } from "@/components/ui/linked-text";
import { RunsContext, RecoveryContext } from "./chat-context";
import {
  ToolActivity,
  RecommendationCard,
  ChatRunNotice,
} from "./chat-results";

export function ChatMessage() {
  const id = useAuiState((state) => state.message.id);
  const role = useAuiState((state) => state.message.role);
  const runs = useContext(RunsContext);
  const needsRecovery = useContext(RecoveryContext);
  const run = runs.find((run) => `${run.id}:assistant` === id);
  return (
    <MessagePrimitive.Root className="rounded border border-line bg-surface p-4">
      <p className="mb-2 text-sm font-semibold">
        {role === "user" ? "You" : "Reading companion"}
      </p>
      <div className="whitespace-pre-wrap">
        {run?.answer ? (
          <LinkedText text={run.answer} />
        ) : (
          <MessagePrimitive.Parts />
        )}
      </div>
      {run && (
        <>
          <ToolActivity
            activity={run.activity}
            active={run.status === "active" && !needsRecovery}
          />
          {run.cards.map((card) => (
            <RecommendationCard
              key={"id" in card ? card.id : card.provider_id}
              card={card}
            />
          ))}
          {run.plans.map((plan, index) => (
            <PlanResultCard key={index} result={plan} />
          ))}
          <ChatRunNotice run={run} needsRecovery={needsRecovery} />
        </>
      )}
    </MessagePrimitive.Root>
  );
}
