"use client";
import { ErrorMessage } from "@/components/ui/feedback";
import { TextLink } from "@/components/ui/text-link";
import { Button } from "@/components/ui/button";

export default function PlansError({ reset }: { reset: () => void }) {
  return (
    <div className="space-y-3">
      <ErrorMessage>
        Could not confirm this operation. If you were saving, the plan may have
        been saved. Check saved plans before starting another save.
      </ErrorMessage>
      <TextLink href="/plans">Check saved plans</TextLink>
      <div>
        <Button type="button" variant="outline" onClick={reset}>
          Reload this view
        </Button>
      </div>
    </div>
  );
}
