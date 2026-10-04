"use client";

import Link from "next/link";
import { PageHeading } from "@/components/page-heading";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <>
      <PageHeading
        title="Something went wrong"
        description="We could not complete this request."
      />
      <p role="alert" className="mb-5 text-muted">
        Please try loading the page again. If the problem continues, check your
        service configuration.
      </p>
      <div className="flex flex-wrap items-center gap-5">
        <button
          onClick={reset}
          className="rounded border border-line bg-surface px-4 py-2"
        >
          Try again
        </button>
        <Link href="/setup" className="text-link">
          View setup
        </Link>
      </div>
    </>
  );
}
