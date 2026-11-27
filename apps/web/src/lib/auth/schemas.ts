import { z } from "zod";

// Error messages are keys under Auth.errors in the message files.
const email = z.email("emailInvalid");
// Keep in step with auth.minimum_password_length in supabase/config.toml.
const password = z.string().min(8, "passwordTooShort");

export const signUpSchema = z.object({
  email,
  password,
  declared21Plus: z.literal(true, "declared21PlusRequired"),
  declaredInPh: z.literal(true, "declaredInPhRequired"),
});

// Screen 10 on the Account page, for accounts missing the sign-up declarations.
export const declarationsSchema = signUpSchema.pick({
  declared21Plus: true,
  declaredInPh: true,
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "passwordRequired"),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({ password });
