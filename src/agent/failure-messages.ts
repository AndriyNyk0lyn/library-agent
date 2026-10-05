export const runFailureMessages = {
  HISTORY_UNAVAILABLE: "Conversation history could not be loaded.",
  HISTORY_LIMIT:
    "This turn exceeded the conversation history limit. Ask a smaller question.",
  PROFILE_UNAVAILABLE: "Saved preferences could not be loaded.",
  INVALID_RECOMMENDATIONS:
    "The recommendations could not be confirmed against eligible library or catalog results.",
  INVALID_RECOMMENDATION_REFERENCE:
    "The model selected a book reference that was not returned by this run's library or catalog tools.",
  RECOMMENDATION_NOT_FOUND:
    "A selected book could not be found in your library during verification.",
  RECOMMENDATION_READ_UNAVAILABLE:
    "The selected books could not be verified against your library. Storage may be unavailable or the matching search too broad. Try a narrower request.",
  RECOMMENDATION_INELIGIBLE:
    "A selected book is no longer eligible for this unread or owned-only request.",
  RECOMMENDATION_ALREADY_IN_LIBRARY:
    "An external suggestion already matches a saved book. Ask for recommendations from your library or different external suggestions.",
  ANSWER_TOO_LONG:
    "The answer and source links exceeded the display limit. Ask a smaller question.",
  PERSISTENCE_UNCERTAIN: "The final reply could not be confirmed in storage.",
  ACTIVITY_UNAVAILABLE: "Tool activity could not be confirmed in storage.",
  INTERRUPTED: "The run stopped or reached its deadline.",
  TURN_LIMIT:
    "The agent reached its eight-turn limit before answering. Try a narrower request.",
  MODEL_TIMEOUT:
    "The model request timed out. Try again later after checking saved status.",
  INVALID_MODEL_OUTPUT:
    "The model returned an invalid answer or tool request. Try a narrower request.",
  RUN_FAILED:
    "The model or a library tool could not finish this run. Check server configuration and try later.",
};
export function failureMessage(code: string | null) {
  return (
    Object.entries(runFailureMessages).find(([key]) => key === code)?.[1] ??
    "The run did not finish."
  );
}
