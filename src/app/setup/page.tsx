import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = { title: "Setup" };

export default function SetupPage() {
  return (
    <>
      <PageHeading
        title="Setup"
        description="Finish the service setup, then sign in and save your first book."
      />
      <ol className="list-decimal space-y-6 pl-6 marker:font-semibold">
        <li className="pl-2">
          <h2 className="font-semibold">Finish email confirmation setup</h2>
          <p className="mt-1 max-w-2xl leading-relaxed text-muted">
            Create a Supabase project using the database and authentication
            guide in the project docs. Keep credentials in your local
            environment file.
          </p>
        </li>
        <li className="pl-2">
          <h2 className="font-semibold">Apply the library migration</h2>
          <p className="mt-1 max-w-2xl leading-relaxed text-muted">
            The next implementation step will let you sign in, save a book, and
            read it back from your private library.
          </p>
        </li>
        <li className="pl-2">
          <h2 className="font-semibold">Prepare OpenAI when chat is added</h2>
          <p className="mt-1 max-w-2xl leading-relaxed text-muted">
            OpenAI powers recommendations and planning through chat. You can set
            it up after the library works.
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
