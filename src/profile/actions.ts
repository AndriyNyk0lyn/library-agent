"use server";
import { requireReader } from "@/auth/reader";
import { updateReaderProfile } from "./service";
import type { ReaderProfile } from "./schema";
export type ProfileFormState = {
  profile: ReaderProfile;
  error: string | null;
  saved: boolean;
  operationId: string;
};
export async function saveProfile(
  previous: ProfileFormState,
  form: FormData,
): Promise<ProfileFormState> {
  const reader = await requireReader({ writable: true });
  const number = (name: string) =>
    form.get(name) === "" ? null : Number(form.get(name));
  const result = await updateReaderProfile(reader, {
    expected_version: previous.profile.version,
    operation_id: previous.operationId,
    patch: {
      preferences: form.get("preferences"),
      pages_per_hour: number("pages_per_hour"),
      daily_reading_minutes: number("daily_reading_minutes"),
      timezone: form.get("timezone") || null,
    },
  });
  return result.ok
    ? {
        profile: result.profile,
        error: null,
        saved: true,
        operationId: crypto.randomUUID(),
      }
    : {
        ...previous,
        operationId:
          result.error.code === "UPSTREAM_UNAVAILABLE"
            ? previous.operationId
            : crypto.randomUUID(),
        error: result.error.message,
        saved: false,
      };
}
