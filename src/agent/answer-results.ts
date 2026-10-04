import "server-only";
import type { z } from "zod";
import type { agentAnswerSchema } from "./schema";
import type { RecommendationCandidates } from "./recommendation-candidates";
import type { ObservedMcp } from "./observed-mcp";

// Resolve model references and re-read raw authorized books over HTTP before displaying cards.
export async function validateRecommendationCards(
  answer: z.output<typeof agentAnswerSchema>,
  candidates: RecommendationCandidates,
  mcp: ObservedMcp,
) {
  const cards = [];
  const seen = new Set<string>();
  for (const recommendation of answer.recommendations) {
    const id = candidates.resolve(recommendation.candidate_ref);
    if (!id || seen.has(id))
      throw new Error("INVALID_RECOMMENDATION_REFERENCE");
    seen.add(id);
    const book = await mcp.verifyBook(id);
    if (!book.ok)
      throw new Error(
        book.error.code === "NOT_FOUND"
          ? "RECOMMENDATION_NOT_FOUND"
          : "RECOMMENDATION_READ_UNAVAILABLE",
      );
    if (
      book.book.status !== "want_to_read" ||
      (answer.owned_only && book.book.owned !== true)
    )
      throw new Error("RECOMMENDATION_INELIGIBLE");
    cards.push({
      id,
      reason: recommendation.reason,
      trade_off: recommendation.trade_off,
      uncertainty: recommendation.uncertainty,
      title: book.book.title,
      authors: book.book.authors,
    });
  }
  return cards;
}
