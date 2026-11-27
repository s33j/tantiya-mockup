import type { AuthError } from "@supabase/supabase-js";
import { z } from "zod";

// The staff console is English only (Task 9/10 mockups handoff: my choice).

export const signInSchema = z.object({
  email: z.email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

export const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your app."),
});

const messagesByCode: Record<string, string> = {
  invalid_credentials: "Wrong email or password.",
  email_not_confirmed:
    "This email isn't confirmed yet. Open the link in the confirmation email first.",
  mfa_verification_failed:
    "That code didn't work. Check the app and try a new code.",
  mfa_challenge_expired: "That took too long. Enter a new code.",
  over_request_rate_limit: "Too many tries. Wait a minute and try again.",
  over_email_send_rate_limit: "Too many tries. Wait a minute and try again.",
};

export function authErrorMessage(error: AuthError) {
  return (
    (error.code && messagesByCode[error.code]) ||
    "Something went wrong. Try again."
  );
}
