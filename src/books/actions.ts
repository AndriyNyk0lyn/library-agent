"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireReader } from "@/auth/reader";
import { parseBookForm } from "./schemas";
import { createBook } from "./service";
import type { FormState } from "@/components/ui/form-feedback";

export type BookFormState = FormState & {
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function addBook(
  _previous: BookFormState,
  form: FormData,
): Promise<BookFormState> {
  const reader = await requireReader({ writable: true });
  const input = parseBookForm(form);
  if (!input.success)
    return {
      error: "Check the highlighted book details.",
      fieldErrors: input.error.flatten().fieldErrors,
    };
  const result = await createBook(reader, input.data);
  if (result.error) return { error: result.error };
  revalidatePath("/library");
  redirect("/library");
}
