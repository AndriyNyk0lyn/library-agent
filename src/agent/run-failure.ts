import "server-only";
import {
  MaxTurnsExceededError,
  ModelBehaviorError,
  ModelTimeoutError,
} from "@openai/agents";
import { z } from "zod";

export function reportRunFailure(
  error: unknown,
  signal: AbortSignal,
  runId: string,
) {
  const knownCode = z
    .enum([
      "HISTORY_UNAVAILABLE",
      "HISTORY_LIMIT",
      "PROFILE_UNAVAILABLE",
      "INVALID_RECOMMENDATIONS",
      "INVALID_RECOMMENDATION_REFERENCE",
      "RECOMMENDATION_NOT_FOUND",
      "RECOMMENDATION_READ_UNAVAILABLE",
      "RECOMMENDATION_INELIGIBLE",
      "RECOMMENDATION_ALREADY_IN_LIBRARY",
      "ANSWER_TOO_LONG",
      "PERSISTENCE_UNCERTAIN",
      "ACTIVITY_UNAVAILABLE",
    ])
    .safeParse(error instanceof Error ? error.message : "");
  const code = signal.aborted
    ? "INTERRUPTED"
    : error instanceof MaxTurnsExceededError
      ? "TURN_LIMIT"
      : error instanceof ModelTimeoutError
        ? "MODEL_TIMEOUT"
        : error instanceof ModelBehaviorError
          ? "INVALID_MODEL_OUTPUT"
          : knownCode.success
            ? knownCode.data
            : "RUN_FAILED";
  // Fixed metadata only: never log provider error text, tokens, notes or tool payloads.
  const errorKind = z
    .enum([
      "Error",
      "APIError",
      "BadRequestError",
      "AuthenticationError",
      "PermissionDeniedError",
      "NotFoundError",
      "RateLimitError",
      "InternalServerError",
      "APIConnectionError",
      "APIConnectionTimeoutError",
      "ZodError",
      "MaxTurnsExceededError",
      "ModelBehaviorError",
      "ModelTimeoutError",
      "ToolCallError",
      "ModelRefusalError",
      "UserError",
    ])
    .safeParse(error instanceof Error ? error.name : "");
  const httpStatus = z
    .object({ status: z.number().int().min(100).max(599) })
    .safeParse(error);
  // Match fixed SDK messages, never print the error text or extract model values.
  const modelFailure =
    error instanceof ModelBehaviorError
      ? error.message ===
        "Invalid output type: final assistant output did not match the expected schema."
        ? "final_output_schema"
        : error.message ===
            "Model returned no final output for the structured output type."
          ? "missing_final_output"
          : "other_model_behavior"
      : undefined;
  console.error("[reading-agent] run failed", {
    run_id: runId,
    code,
    ...(modelFailure ? { model_failure: modelFailure } : {}),
    error_kind: errorKind.success ? errorKind.data : "UnknownError",
    ...(httpStatus.success ? { upstream_status: httpStatus.data.status } : {}),
  });
  return code;
}
