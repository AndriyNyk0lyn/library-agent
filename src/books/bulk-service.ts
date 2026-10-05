import "server-only";
import type { ReaderContext } from "./service";
import {
  previewBookUpdateSchema,
  applyBookUpdateSchema,
  bulkUpdateResultSchema,
  type BulkUpdateResult,
} from "./bulk-schema";

export async function previewBookUpdate(
  reader: ReaderContext,
  input: unknown,
): Promise<BulkUpdateResult> {
  const parsed = previewBookUpdateSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Supply a preview UUID, explicit library filters and a valid book patch.",
      },
    };
  const { data, error } = await reader.supabase
    .rpc("preview_library_update", { p_input: parsed.data })
    .abortSignal(AbortSignal.timeout(10000));
  const result = bulkUpdateResultSchema.safeParse(data);
  return !error && result.success
    ? result.data
    : {
        ok: false,
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message:
            "Could not prepare the bulk update. Check the tool expansion migration and retry the same preview inputs.",
        },
      };
}

export async function applyBookUpdate(
  reader: ReaderContext,
  input: unknown,
): Promise<BulkUpdateResult> {
  const parsed = applyBookUpdateSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Supply the prepared preview UUID and a stable operation UUID.",
      },
    };
  const { data, error } = await reader.supabase
    .rpc("apply_library_update", {
      p_preview_id: parsed.data.preview_id,
      p_operation_id: parsed.data.operation_id,
    })
    .abortSignal(AbortSignal.timeout(10000));
  const result = bulkUpdateResultSchema.safeParse(data);
  return !error && result.success
    ? result.data
    : {
        ok: false,
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message:
            "Bulk save outcome is uncertain. Check your library or explicitly retry the same preview and operation IDs. Never automatically replay.",
        },
      };
}
