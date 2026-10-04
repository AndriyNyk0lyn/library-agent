import { z } from "zod";

export const emailSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((email) => email.trim()),
});
export const signInSchema = emailSchema.extend({
  password: z.string().min(1).max(256),
});
export const signUpSchema = emailSchema.extend({
  password: z.string().min(8).max(256),
});
export const passwordSchema = z.object({
  password: z.string().min(8).max(256),
});
