import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireReader({ writable = false } = {}) {
  const supabase = await createSupabaseServerClient({ writable });
  const { data, error } = await supabase.auth.getUser();
  if (error && (!error.status || error.status >= 500))
    throw new Error("Sign-in is temporarily unavailable. Please try again.");
  if (error || !data.user) redirect("/auth/sign-in");
  return { supabase, user: data.user };
}
