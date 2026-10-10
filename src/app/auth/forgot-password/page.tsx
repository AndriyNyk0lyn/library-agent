import type { Metadata } from "next";
import { TextLink } from "@/components/ui/text-link";
import { PageHeading } from "@/components/page-heading";
import { RequestEmailForm } from "@/auth/recovery-forms";
import { requestPasswordReset } from "@/auth/actions";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <PageHeading
        title="Reset password"
        description="Request an email link to choose a new password."
      />
      <RequestEmailForm action={requestPasswordReset} label="Send reset link" />
      <p className="mt-6">
        <TextLink href="/auth/sign-in">Return to sign in</TextLink>
      </p>
    </>
  );
}
