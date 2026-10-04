import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { RequestEmailForm } from "@/auth/recovery-forms";
import { resendConfirmation } from "@/auth/actions";

export const metadata: Metadata = { title: "Resend confirmation" };

export default function ResendConfirmationPage() {
  return (
    <>
      <PageHeading
        title="Resend confirmation"
        description="Request a new email confirmation link for your account."
      />
      <RequestEmailForm
        action={resendConfirmation}
        label="Resend confirmation"
      />
      <p className="mt-6">
        <Link href="/auth/sign-in" className="text-link">
          Return to sign in
        </Link>
      </p>
    </>
  );
}
