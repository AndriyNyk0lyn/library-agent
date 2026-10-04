import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";

vi.mock("@/lib/supabase/config", () => ({
  getSupabaseConfig: () => ({
    url: "https://test.supabase.co",
    key: "test-key",
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: {
      cookies: {
        setAll: (
          cookies: { name: string; value: string; options: { path: string } }[],
          headers: Record<string, string>,
        ) => void;
      };
    },
  ) => ({
    auth: {
      getClaims: async () => {
        options.cookies.setAll(
          [
            {
              name: "session-token",
              value: "refreshed",
              options: { path: "/" },
            },
          ],
          {
            "Cache-Control": "private, no-store",
            Expires: "0",
            Pragma: "no-cache",
          },
        );
        options.cookies.setAll(
          [{ name: "second-cookie", value: "current", options: { path: "/" } }],
          {},
        );
        return { data: null, error: null };
      },
    },
  }),
}));

describe("session refresh propagation", () => {
  it("preserves cookies and non-cacheable headers across successive cookie writes", async () => {
    const request = new NextRequest("http://localhost:3000/library", {
      headers: { cookie: "session-token=expired" },
    });
    const response = await proxy(request);
    expect(request.cookies.get("session-token")?.value).toBe("refreshed");
    expect(response.cookies.get("session-token")?.value).toBe("refreshed");
    expect(response.cookies.get("second-cookie")?.value).toBe("current");
    expect(response.headers.get("x-middleware-request-cookie")).toContain(
      "session-token=refreshed",
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Expires")).toBe("0");
    expect(response.headers.get("Pragma")).toBe("no-cache");
  });
});
