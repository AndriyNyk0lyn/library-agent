import Link from "next/link";
import { catalogEnabled } from "@/books/catalog/config";
import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { requireReader } from "@/auth/reader";
import { PageHeading } from "@/components/page-heading";
import { BookForm } from "@/books/book-form";

export const metadata: Metadata = { title: "Add a book" };

export default async function AddBookPage() {
  await requireReader();
  return (
    <>
      <PageHeading
        title="Add a book"
        description="Enter the details you know. Missing ratings, page counts, and ownership can stay unknown."
      />
      {catalogEnabled() ? (
        <p className="mb-5">
          <Link href="/library/catalog" className="text-link">
            Find an edition with Open Library
          </Link>
        </p>
      ) : null}
      <BookForm bookId={randomUUID()} />
    </>
  );
}
