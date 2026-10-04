import "server-only";
import { z } from "zod";

const connectionSchema = z.object({
  url: z.url(),
  key: z.string().startsWith("sb_publishable_"),
});

export function getSupabaseConfig() {
  const result = connectionSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!result.success) {
    throw new Error(
      "Configure the Supabase URL and publishable key in .env.local.",
    );
  }
  return result.data;
}

export function getAppOrigin() {
  const result = z.url().safeParse(process.env.APP_BASE_URL);
  if (!result.success) throw new Error("Set APP_BASE_URL to the app origin.");
  const url = new URL(result.data);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  ) {
    throw new Error("APP_BASE_URL must use HTTPS outside local development.");
  }
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("APP_BASE_URL must contain only the app origin.");
  }
  return url.origin;
}

export function getMcpEndpoint() {
  return new URL("/api/mcp", getAppOrigin());
}
