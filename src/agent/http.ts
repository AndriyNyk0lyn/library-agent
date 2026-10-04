import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/supabase/config";

export function chatError(status: number, message: string) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function chatReader(request: Request) {
  if (
    request.method !== "GET" &&
    request.headers.get("origin") !== getAppOrigin()
  )
    return chatError(403, "This request origin is not allowed.");
  const supabase = await createSupabaseServerClient({
    writable: true,
    requestTimeoutMs: 10000,
  });
  const { data: session, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError || !session.session)
    return chatError(401, "Sign in again to continue.");
  // The cookie token is forwarded only after independent server-side verification.
  const token = session.session.access_token;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user)
    return chatError(
      error && (!error.status || error.status >= 500) ? 503 : 401,
      "Could not verify sign-in. Sign in again or try later.",
    );
  return { supabase, user: data.user, token };
}
export async function readChatBody(
  request: Request,
  signal: AbortSignal,
): Promise<unknown> {
  if (
    !request.headers.get("content-type")?.startsWith("application/json") ||
    !request.body
  )
    throw new Error("INVALID_INPUT");
  const reader = request.body.getReader();
  signal.throwIfAborted();
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(new Error("INPUT_INTERRUPTED"));
    signal.addEventListener("abort", onAbort, { once: true });
  });
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  try {
    while (true) {
      const { value, done } = await Promise.race([reader.read(), aborted]);
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 20000) {
        await reader.cancel();
        throw new Error("INPUT_LIMIT");
      }
      body += decoder.decode(value, { stream: true });
    }
    return JSON.parse(body + decoder.decode());
  } finally {
    signal.removeEventListener("abort", onAbort);
    await reader.cancel();
    reader.releaseLock();
  }
}
