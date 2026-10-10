import { TextLink } from "@/components/ui/text-link";
import { PageHeading } from "@/components/page-heading";

export default function NotFound() {
  return (
    <>
      <PageHeading
        title="Page not found"
        description="This address does not match a page in Reading Companion."
      />
      <TextLink href="/library">Return to library</TextLink>
    </>
  );
}
