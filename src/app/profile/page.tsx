import { ErrorMessage } from "@/components/ui/feedback";
import { AnchorLink } from "@/components/ui/text-link";
import { requireReader } from "@/auth/reader";
import { PageHeading } from "@/components/page-heading";
import { getReaderProfile } from "@/profile/service";
import { ProfileForm } from "@/profile/profile-form";
export default async function ProfilePage() {
  const reader = await requireReader();
  const result = await getReaderProfile(reader);
  return (
    <>
      <PageHeading
        title="Reading preferences"
        description="Explicit preferences and reading constraints remembered across chats."
      />
      {result.ok ? (
        <ProfileForm
          initial={{
            profile: result.profile,
            error: null,
            saved: false,
            operationId: crypto.randomUUID(),
          }}
        />
      ) : (
        <ErrorMessage>
          {result.error.message}{" "}
          <AnchorLink href="/profile">Try again</AnchorLink>
        </ErrorMessage>
      )}
    </>
  );
}
