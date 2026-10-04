import { z } from "zod";

export const timezoneSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Enter a supported timezone, such as Europe/Kyiv or UTC.");
export const profileFieldsSchema = z.strictObject({
  preferences: z.string().max(4000),
  pages_per_hour: z.number().positive().max(10000).nullable(),
  daily_reading_minutes: z.number().int().positive().max(1440).nullable(),
  timezone: timezoneSchema.nullable(),
});
export const readerProfileSchema = profileFieldsSchema.extend({
  version: z.number().int().nonnegative(),
});
export type ReaderProfile = z.output<typeof readerProfileSchema>;
export const updateProfileSchema = z.strictObject({
  expected_version: z.number().int().nonnegative(),
  operation_id: z.uuid(),
  patch: profileFieldsSchema
    .partial()
    .refine((patch) => Object.keys(patch).length > 0),
});
export const profileResultSchema = z.discriminatedUnion("ok", [
  z.strictObject({ ok: z.literal(true), profile: readerProfileSchema }),
  z.strictObject({
    ok: z.literal(false),
    error: z.strictObject({
      code: z.enum(["VALIDATION_ERROR", "CONFLICT", "UPSTREAM_UNAVAILABLE"]),
      message: z.string(),
    }),
    current: readerProfileSchema.optional(),
  }),
]);
export type ProfileResult = z.output<typeof profileResultSchema>;
