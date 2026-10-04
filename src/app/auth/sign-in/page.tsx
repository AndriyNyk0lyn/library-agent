import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { CredentialsForm } from "@/auth/credentials-form";
import { signIn } from "@/auth/actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmation?: string }>;
}) {
  const { confirmation } = await searchParams;
  return (
    <>
      <PageHeading
        title="Sign in"
        description="Open your private reading library."
      />
      {confirmation === "failed" ? (
        <p role="alert" className="mb-5 text-red-800">
          The email link is invalid or expired. Try signing in if your email is
          already confirmed, or request a new confirmation or password reset
          link.
        </p>
      ) : null}
      <CredentialsForm
        action={signIn}
        label="Sign in"
        passwordAutocomplete="current-password"
      />
      <div className="mt-6 flex flex-wrap gap-5">
        <Link href="/auth/sign-up" className="text-link">
          Create an account
        </Link>
        <Link href="/auth/forgot-password" className="text-link">
          Forgot password?
        </Link>
        <Link href="/auth/resend-confirmation" className="text-link">
          Resend confirmation
        </Link>
      </div>
    </>
  );
}
