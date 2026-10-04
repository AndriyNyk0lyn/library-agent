import "server-only";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";

export async function createSupabaseServerClient({ writable = false } = {}) {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseConfig();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      // Proxy refreshes sessions before Server Components, where cookies are read-only.
      ...(writable
        ? {
            setAll: (
              cookiesToSet: Parameters<
                NonNullable<CookieMethodsServer["setAll"]>
              >[0],
            ) => {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            },
          }
        : {}),
    },
  });
}
