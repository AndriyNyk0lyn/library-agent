import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  let destination = "/auth/sign-in?confirmation=failed";
  if (tokenHash && (type === "email" || type === "recovery")) {
    const supabase = await createSupabaseServerClient({ writable: true });
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error)
      destination = type === "recovery" ? "/auth/reset-password" : "/library";
  }
  const response = NextResponse.redirect(new URL(destination, getAppOrigin()));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
