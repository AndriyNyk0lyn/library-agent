"use server";
import { revalidatePath } from "next/cache";
import { requireReader } from "@/auth/reader";
import { updateBook } from "./service";

export async function saveBookEdit(input: unknown) {
  const reader = await requireReader({ writable: true });
  const result = await updateBook(reader, input);
  if (result.ok) {
    revalidatePath("/library");
    revalidatePath(`/library/${result.book.id}`);
  }
  return result;
}
