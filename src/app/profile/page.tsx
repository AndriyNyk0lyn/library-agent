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
        <p role="alert">
          {result.error.message}{" "}
          <a href="/profile" className="text-link">
            Try again
          </a>
        </p>
      )}
    </>
  );
}
