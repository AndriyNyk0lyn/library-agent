import { z } from "zod";

export function webSearchEnabled() {
  return process.env.WEB_SEARCH_ENABLED === "true";
}
export const webSearchInputSchema = z.strictObject({
  query: z.string().trim().min(1).max(300),
});
export const webSourceSchema = z.strictObject({
  title: z.string().min(1).max(500),
  url: z
    .url()
    .max(2000)
    .refine((value) => {
      const url = new URL(value);
      return (
        (url.protocol === "https:" || url.protocol === "http:") &&
        !url.username &&
        !url.password
      );
    }),
});
export const webSearchResultSchema = z.discriminatedUnion("ok", [
  z.strictObject({
    ok: z.literal(true),
    summary: z.string().min(1).max(6000),
    sources: z.array(webSourceSchema).min(1).max(10),
  }),
  z.strictObject({
    ok: z.literal(false),
    error: z.strictObject({
      code: z.enum(["VALIDATION_ERROR", "UPSTREAM_UNAVAILABLE"]),
      message: z.string(),
    }),
  }),
]);
