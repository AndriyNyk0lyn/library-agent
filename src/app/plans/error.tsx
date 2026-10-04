"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PlansError({ reset }: { reset: () => void }) {
  return (
    <div className="space-y-3">
      <p role="alert">
        Could not confirm this operation. If you were saving, the plan may have
        been saved. Check saved plans before starting another save.
      </p>
      <Link href="/plans" className="text-link">
        Check saved plans
      </Link>
      <div>
        <Button type="button" variant="outline" onClick={reset}>
          Reload this view
        </Button>
      </div>
    </div>
  );
}
