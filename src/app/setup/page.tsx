import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = { title: "Setup" };

export default function SetupPage() {
  return (
    <>
      <PageHeading
        title="Setup"
        description="Connect your library, then continue with MCP and agent features."
      />
      <ol className="list-decimal space-y-6 pl-6 marker:font-semibold">
        <li className="pl-2">
          <h2 className="font-semibold">Finish email confirmation setup</h2>
          <p className="mt-1 max-w-2xl leading-relaxed text-muted">
            Use your existing Supabase project and its default email sender. Set
            the confirmation URL and email templates using the first-library
            guide in the project docs.
          </p>
        </li>
        <li className="pl-2">
          <h2 className="font-semibold">Apply the library migration</h2>
          <p className="mt-1 max-w-2xl leading-relaxed text-muted">
            Follow the migration steps in the first-library guide, then sign in,
            save a book, and refresh to confirm it persists.
          </p>
        </li>
        <li className="pl-2">
          <h2 className="font-semibold">Configure agent chat</h2>
          <p className="mt-1 max-w-2xl leading-relaxed text-muted">
            Apply the chat/profile migration and configure the OpenAI key and
            model using the chat setup guide. Recommendations use your saved
            library. Apply the reading-plans migration using the plans setup
            guide, then check and deliberately save schedules from a library
            book.
          </p>
        </li>
      </ol>
      <p className="mt-8">
        <Link href="/auth/sign-in" className="text-link">
          Sign in
        </Link>
      </p>
    </>
  );
}
