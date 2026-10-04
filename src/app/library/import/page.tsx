import { requireReader } from "@/auth/reader";
import { ImportForm } from "@/books/import-form";
import { PageHeading } from "@/components/page-heading";
export default async function ImportPage() {
  await requireReader();
  return (
    <>
      <PageHeading
        title="Import Goodreads CSV"
        description="Import a snapshot. Existing Goodreads records and exact ISBN duplicates are skipped; app edits are preserved."
      />
      <ImportForm />
    </>
  );
}
