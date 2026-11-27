// Didit V3 shapes the KYC routes rely on. The mock provider sends exactly these,
// so the webhook route cannot tell mock from real.
//
// Confirmed from Didit docs (Nov 2026):
//   - POST /v3/session/ → { session_id, session_number, session_token, url, status, workflow_id, vendor_data }
//   - the callback gets ?verificationSessionId=…&status=… appended
//   - the webhook body has event_id, session_id, status, webhook_type, vendor_data, decision
//   - X-Signature = hex HMAC-SHA256 of the exact raw body
//   - decision has plural arrays: id_verifications[], liveness_checks[], face_matches[]
//     (V3 destinations, the default; V2 destinations get singular objects)
//   - created_at = when the record last changed, stable across retries (use for
//     ordering); timestamp = dispatch time, refreshed on every retry
//   - event_id is stable across retries and destinations
//   - environment is "live" or "sandbox"; Try Webhook test deliveries carry the
//     header X-Didit-Test-Webhook: true
//   - a real sandbox session (Nov 19, PH passport, "approve" scenario):
//     liveness_checks[].score 99 and face_matches[].score 95 (0–100),
//     id_verifications[].document_type "Passport" + document_subtype
//     "PASSPORT_GENERIC" + issuing_state "PHL", warnings[].risk
//   - Didit's console "Send test event" sample differs: liveness_score and
//     face_match_score as 0–1, similarity_percentage 0–100. summarizeDecision
//     accepts both shapes.
//
// NOT confirmed yet: document_type values for PhilID, ePhilID, UMID and the
// driver's license.

export const DIDIT_STATUSES = [
  "Not Started",
  "In Progress",
  "Awaiting User",
  "Resubmitted",
  "Approved",
  "Declined",
  "In Review",
  "Abandoned",
  "Expired",
  "Kyc Expired",
] as const;

export type DiditStatus = (typeof DIDIT_STATUSES)[number];

export type DiditWebhookType = "status.updated" | "data.updated";

export interface DiditWarning {
  risk?: string;
  feature?: string;
  short_description?: string;
}

export interface DiditFeatureResult {
  status?: string;
  /** Real sessions: 0–100 on liveness_checks[] and face_matches[]. */
  score?: number;
  /** liveness_checks[]: 0–1, seen only in the console's test-event sample. */
  liveness_score?: number;
  /** face_matches[]: 0–1, seen only in the console's test-event sample. */
  face_match_score?: number;
  /** face_matches[]: 0–100 (94). */
  similarity_percentage?: number;
  document_type?: string;
  warnings?: DiditWarning[];
}

export interface DiditDecision {
  id_verifications?: DiditFeatureResult[];
  liveness_checks?: DiditFeatureResult[];
  face_matches?: DiditFeatureResult[];
}

export interface DiditWebhookPayload {
  event_id?: string;
  session_id: string;
  status: DiditStatus | string;
  webhook_type: DiditWebhookType | string;
  vendor_data?: string;
  workflow_id?: string;
  environment?: "live" | "sandbox" | string;
  timestamp?: number | string;
  created_at?: number | string;
  decision?: DiditDecision;
}

export interface DiditCreateSessionResponse {
  session_id: string;
  session_number?: number;
  session_token?: string;
  url: string;
  status?: string;
  workflow_id?: string;
  vendor_data?: string;
}
