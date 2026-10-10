import { SetupSteps } from "@/components/setup-steps";
import type { Metadata } from "next";
import { TextLink } from "@/components/ui/text-link";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = { title: "Setup" };

export default function SetupPage() {
  return (
    <>
      <PageHeading
        title="Setup"
        description="Connect your library, then continue with MCP and agent features."
      />
      <SetupSteps />
      <p className="mt-8">
        <TextLink href="/auth/sign-in">Sign in</TextLink>
      </p>
    </>
  );
}
