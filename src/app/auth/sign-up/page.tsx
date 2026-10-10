import type { Metadata } from "next";
import { TextLink } from "@/components/ui/text-link";
import { PageHeading } from "@/components/page-heading";
import { CredentialsForm } from "@/auth/credentials-form";
import { signUp } from "@/auth/actions";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage() {
  return (
    <>
      <PageHeading
        title="Create an account"
        description="Save books and reading notes in your own library."
      />
      <CredentialsForm
        action={signUp}
        label="Create account"
        passwordAutocomplete="new-password"
      />
      <p className="mt-6">
        <TextLink href="/auth/sign-in">
          Already have an account? Sign in
        </TextLink>
      </p>
    </>
  );
}
