import "server-only";
import { createClient } from "@supabase/supabase-js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createLibraryMcpServer } from "@/mcp/server";
import { getMcpEndpoint, getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

function httpError(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        ...(status === 401
          ? { "WWW-Authenticate": 'Bearer realm="reading-companion"' }
          : {}),
      },
    },
  );
}

export async function handleMcp(request: Request) {
  let origin: string;
  let connection: ReturnType<typeof getSupabaseConfig>;
  try {
    origin = getMcpEndpoint().origin;
    connection = getSupabaseConfig();
  } catch {
    return httpError(
      503,
      "CONFIGURATION_ERROR",
      "MCP configuration is not ready. Check the application setup.",
    );
  }
  if (
    request.headers.get("host") !== new URL(origin).host ||
    (request.headers.has("origin") && request.headers.get("origin") !== origin)
  )
    return httpError(403, "FORBIDDEN", "This request origin is not allowed.");

  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!token)
    return httpError(
      401,
      "UNAUTHORIZED",
      "A valid reader access token is required.",
    );

  // Never use cookies, a global authenticated client, or a service-role credential here.
  const supabase = createClient<Database>(connection.url, connection.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: init?.signal
            ? AbortSignal.any([
                request.signal,
                init.signal,
                AbortSignal.timeout(15000),
              ])
            : AbortSignal.any([request.signal, AbortSignal.timeout(15000)]),
        }),
    },
  });
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error && (!error.status || error.status >= 500 || error.status === 429))
      return httpError(
        503,
        "UPSTREAM_UNAVAILABLE",
        "Sign-in validation is temporarily unavailable. Try again.",
      );
    if (error || !data.user)
      return httpError(
        401,
        "UNAUTHORIZED",
        "A valid reader access token is required.",
      );

    if (request.method !== "POST") {
      const response = httpError(
        405,
        "METHOD_NOT_ALLOWED",
        "Use POST. This stateless endpoint has no event stream or sessions to delete.",
      );
      response.headers.set("Allow", "POST");
      return response;
    }
    const server = createLibraryMcpServer({ supabase, user: data.user });
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      maxRequestBodySize: 65536,
    });
    try {
      await server.connect(transport);
      const response = await transport.handleRequest(request);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } finally {
      // JSON mode resolves only once a request response is ready; no SSE body remains open.
      await server.close();
    }
  } catch {
    return httpError(
      503,
      "UPSTREAM_UNAVAILABLE",
      "MCP is temporarily unavailable. Try again.",
    );
  }
}
