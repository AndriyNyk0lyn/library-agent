import Link from "next/link";
import { PageHeading } from "@/components/page-heading";

export default function NotFound() {
  return (
    <>
      <PageHeading
        title="Page not found"
        description="This address does not match a page in Reading Companion."
      />
      <Link
        href="/library"
        className="font-medium text-accent underline underline-offset-4"
      >
        Return to library
      </Link>
    </>
  );
}
