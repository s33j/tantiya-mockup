import type { AuthError } from "@supabase/supabase-js";
import type messages from "../../../messages/en.json";

export type AuthErrorKey = keyof typeof messages.Auth.errors;

const keysByCode: Record<string, AuthErrorKey> = {
  invalid_credentials: "invalidCredentials",
  email_not_confirmed: "emailNotConfirmed",
  weak_password: "weakPassword",
  same_password: "samePassword",
  over_email_send_rate_limit: "rateLimited",
  over_request_rate_limit: "rateLimited",
};

export function authErrorKey(error: AuthError): AuthErrorKey {
  return (error.code && keysByCode[error.code]) || "generic";
}
