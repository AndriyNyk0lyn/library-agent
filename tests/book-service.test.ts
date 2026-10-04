import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { createBook } from "@/books/service";

vi.mock("server-only", () => ({}));

const input = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Test book",
  authors: ["Author"],
  status: "reading",
  rating: null,
  owned: null,
  notes: "Private note",
  page_count: null,
};
const user = { id: "00000000-0000-4000-8000-00000000000a" };

function clientWithFetch(fetch: typeof globalThis.fetch) {
  return createClient<Database>(
    "https://test.supabase.co",
    "test-publishable-key",
    {
      global: { fetch },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("book creation retries", () => {
  it("derives owner from verified context instead of accepting an input owner", async () => {
    let body = "";
    const fetch: typeof globalThis.fetch = async (_url, options) => {
      body = String(options?.body);
      return jsonResponse(
        {
          ...input,
          user_id: user.id,
          version: 1,
          created_at: "2026-10-03T00:00:00Z",
        },
        201,
      );
    };
    const result = await createBook(
      { supabase: clientWithFetch(fetch), user },
      { ...input, user_id: "forged-user" },
    );
    expect(JSON.parse(body).user_id).toBe(user.id);
    expect(result.error).toBeNull();
  });

  it("recovers an identical already-committed save but rejects changed content", async () => {
    const fetch: typeof globalThis.fetch = async (_url, options) =>
      options?.method === "POST"
        ? jsonResponse({ code: "23505", message: "duplicate key" }, 409)
        : jsonResponse({
            ...input,
            user_id: user.id,
            version: 1,
            created_at: "2026-10-03T00:00:00Z",
          });
    const context = { supabase: clientWithFetch(fetch), user };
    expect((await createBook(context, input)).error).toBeNull();
    const changed = await createBook(context, {
      ...input,
      notes: "Changed after uncertain save",
    });
    expect(changed.book).toBeNull();
    expect(changed.error).toContain("already used");
  });

  it("never reports success for a failed insert or an inaccessible duplicate", async () => {
    const unavailable: typeof globalThis.fetch = async () =>
      jsonResponse({ code: "42501", message: "denied" }, 403);
    expect(
      (
        await createBook(
          { supabase: clientWithFetch(unavailable), user },
          input,
        )
      ).book,
    ).toBeNull();
    const inaccessible: typeof globalThis.fetch = async (_url, options) =>
      options?.method === "POST"
        ? jsonResponse({ code: "23505", message: "duplicate key" }, 409)
        : jsonResponse(null);
    expect(
      (
        await createBook(
          { supabase: clientWithFetch(inaccessible), user },
          input,
        )
      ).book,
    ).toBeNull();
  });
});
