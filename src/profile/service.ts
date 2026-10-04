import "server-only";
import { z } from "zod";
import type { ReaderContext } from "@/books/service";
import {
  profileResultSchema,
  updateProfileSchema,
  type ProfileResult,
} from "./schema";

export async function getReaderProfile(
  reader: ReaderContext,
  input: unknown = {},
): Promise<ProfileResult> {
  if (!z.strictObject({}).safeParse(input).success)
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Profile reads take no arguments.",
      },
    };
  try {
    const { data, error } = await reader.supabase
      .rpc("get_reader_profile")
      .abortSignal(AbortSignal.timeout(10000));
    if (error) return unavailable(false);
    return profileResultSchema.parse(data);
  } catch {
    return unavailable(false);
  }
}
export async function updateReaderProfile(
  reader: ReaderContext,
  input: unknown,
): Promise<ProfileResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Check preferences, positive reading constraints, timezone, version, and operation ID.",
      },
    };
  try {
    const { data, error } = await reader.supabase
      .rpc("update_reader_profile", {
        p_expected_version: parsed.data.expected_version,
        p_operation_id: parsed.data.operation_id,
        p_patch: parsed.data.patch,
      })
      .abortSignal(AbortSignal.timeout(10000));
    if (error) return unavailable(true);
    return profileResultSchema.parse(data);
  } catch {
    return unavailable(true);
  }
}
function unavailable(write: boolean): ProfileResult {
  return {
    ok: false,
    error: {
      code: "UPSTREAM_UNAVAILABLE",
      message: write
        ? "Profile save is uncertain. Reload the profile or retry the same inputs and operation ID."
        : "Could not load the profile. Check the chat migration and try again.",
    },
  };
}
