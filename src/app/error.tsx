"use client";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/feedback";

import { TextLink } from "@/components/ui/text-link";
import { PageHeading } from "@/components/page-heading";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <>
      <PageHeading
        title="Something went wrong"
        description="We could not complete this request."
      />
      <ErrorMessage className="mb-5 text-muted">
        Please try loading the page again. If the problem continues, check your
        service configuration.
      </ErrorMessage>
      <div className="flex flex-wrap items-center gap-5">
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
        <TextLink href="/setup">View setup</TextLink>
      </div>
    </>
  );
}
