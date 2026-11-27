import type { DiditWebhookPayload } from "./didit-types";

export type WebhookSkip = "test" | "wrong_environment";

/**
 * Signed webhooks that must not change any application:
 * - "test": Try Webhook deliveries from the Didit console (X-Didit-Test-Webhook: true).
 *   Answered 200 so the console shows the signature check passed.
 * - "wrong_environment": DIDIT_ENVIRONMENT is set ("sandbox" or "live") and the
 *   event came from the other one, so sandbox sessions never touch live data.
 */
export function webhookSkipReason(
  payload: Pick<DiditWebhookPayload, "environment">,
  testHeader: string | null,
  expectedEnvironment: string | undefined,
): WebhookSkip | null {
  if (testHeader?.trim().toLowerCase() === "true") return "test";
  if (
    expectedEnvironment &&
    payload.environment &&
    payload.environment !== expectedEnvironment
  ) {
    return "wrong_environment";
  }
  return null;
}
