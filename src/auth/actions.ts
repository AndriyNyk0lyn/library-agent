"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/supabase/config";
import { requireReader } from "./reader";
import {
  emailSchema,
  passwordSchema,
  signInSchema,
  signUpSchema,
} from "./schemas";
import type { FormState } from "@/components/ui/form-feedback";

export async function signIn(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const result = signInSchema.safeParse(Object.fromEntries(form));
  if (!result.success)
    return { error: "Enter a valid email address and your password." };
  const supabase = await createSupabaseServerClient({ writable: true });
  const { error } = await supabase.auth.signInWithPassword(result.data);
  if (error)
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Confirm your email before signing in."
          : "Could not sign in. Check your email and password, then try again.",
    };
  redirect("/library");
}

export async function signUp(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const result = signUpSchema.safeParse(Object.fromEntries(form));
  if (!result.success)
    return {
      error:
        "Enter a valid email address and a password of at least 8 characters.",
    };
  const supabase = await createSupabaseServerClient({ writable: true });
  const { data, error } = await supabase.auth.signUp({
    ...result.data,
    options: { emailRedirectTo: `${getAppOrigin()}/auth/confirm` },
  });
  if (error)
    return {
      error:
        error.code === "email_address_not_authorized"
          ? "Use your Supabase organization email for testing. Other addresses require custom SMTP."
          : "Could not create the account. Check the password requirements and try again. Email delivery may be rate limited.",
    };
  if (data.session) redirect("/library");
  return {
    message:
      "Check your email for a confirmation link. If you already have an account, sign in instead.",
  };
}

export async function signOut(): Promise<FormState> {
  const { supabase } = await requireReader({ writable: true });
  const { error } = await supabase.auth.signOut();
  if (error) return { error: "Could not sign out. Please try again." };
  redirect("/auth/sign-in");
}

export async function requestPasswordReset(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const result = emailSchema.safeParse(Object.fromEntries(form));
  if (!result.success) return { error: "Enter a valid email address." };
  const supabase = await createSupabaseServerClient({ writable: true });
  const { error } = await supabase.auth.resetPasswordForEmail(
    result.data.email,
    { redirectTo: `${getAppOrigin()}/auth/confirm` },
  );
  if (error)
    return {
      error:
        "Could not send a reset link. Please try again later. Default email delivery is limited to organization addresses.",
    };
  return {
    message:
      "If this email is eligible for delivery, a password reset link is on its way.",
  };
}

export async function updatePassword(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireReader({ writable: true });
  const result = passwordSchema.safeParse(Object.fromEntries(form));
  if (!result.success)
    return { error: "Use a password of at least 8 characters." };
  const { error } = await supabase.auth.updateUser(result.data);
  if (error)
    return {
      error:
        "Could not update your password. Try a different password or request a new reset link.",
    };
  redirect("/library");
}

export async function resendConfirmation(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const result = emailSchema.safeParse(Object.fromEntries(form));
  if (!result.success) return { error: "Enter a valid email address." };
  const supabase = await createSupabaseServerClient({ writable: true });
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: result.data.email,
    options: { emailRedirectTo: `${getAppOrigin()}/auth/confirm` },
  });
  if (error)
    return {
      error:
        "Could not send a confirmation link. Try again later; default email delivery is limited to organization addresses.",
    };
  return {
    message:
      "If this account needs confirmation and is eligible for delivery, check your email for a new link.",
  };
}
