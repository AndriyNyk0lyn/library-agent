import { ErrorMessage } from "@/components/ui/feedback";
import type { Metadata } from "next";
import { TextLink } from "@/components/ui/text-link";
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
        <ErrorMessage className="mb-5 text-red-800">
          The email link is invalid or expired. Try signing in if your email is
          already confirmed, or request a new confirmation or password reset
          link.
        </ErrorMessage>
      ) : null}
      <CredentialsForm
        action={signIn}
        label="Sign in"
        passwordAutocomplete="current-password"
      />
      <div className="mt-6 flex flex-wrap gap-5">
        <TextLink href="/auth/sign-up">Create an account</TextLink>
        <TextLink href="/auth/forgot-password">Forgot password?</TextLink>
        <TextLink href="/auth/resend-confirmation">
          Resend confirmation
        </TextLink>
      </div>
    </>
  );
}
