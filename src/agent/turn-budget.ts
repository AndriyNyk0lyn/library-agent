import type { Model, ModelRequest } from "@openai/agents";

// A tool response needs another model turn to become a user-facing answer.
// Reserve the last allowed call for that answer instead of exhausting the cap on tools.
export function reserveFinalTurn(model: Model, maxTurns: number): Model {
  let calls = 0;
  function prepare(request: ModelRequest): ModelRequest {
    calls += 1;
    if (calls < maxTurns) return request;
    return {
      ...request,
      tools: [],
      toolsExplicitlyProvided: true,
      modelSettings: { ...request.modelSettings, toolChoice: "none" },
      systemInstructions: `${request.systemInstructions ?? ""}\nThis is the final allowed model turn. Answer now using the records already retrieved. Give fewer recommendations if evidence is insufficient, explain missing information, or ask a clarification. Report only updates confirmed by successful tool results.`,
    };
  }
  return {
    supportsPromptModelSelection: model.supportsPromptModelSelection,
    getResponse: (request) => model.getResponse(prepare(request)),
    getStreamedResponse: (request) =>
      model.getStreamedResponse(prepare(request)),
  };
}
