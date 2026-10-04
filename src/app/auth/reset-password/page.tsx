import type { Metadata } from "next";
import { requireReader } from "@/auth/reader";
import { PageHeading } from "@/components/page-heading";
import { UpdatePasswordForm } from "@/auth/recovery-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  await requireReader();
  return (
    <>
      <PageHeading
        title="Choose a new password"
        description="Save a new password for your account."
      />
      <UpdatePasswordForm />
    </>
  );
}
