import type {
  DiditDecision,
  DiditFeatureResult,
  DiditWebhookPayload,
} from "./didit-types";

/**
 * What we keep for the staff reviewer (public.kyc_check_results). Deliberately
 * no names, birth dates, ID numbers or image URLs (Data Privacy Act section 11,
 * per the proposal). Reviewers open the full record in the Didit console.
 */
export interface ReviewerSummary {
  document_type?: string;
  face_match_score?: number;
  liveness_score?: number;
  duplicate_face?: "none" | "possible" | "strong";
  warning_codes?: string[];
}

const first = (items?: DiditFeatureResult[]) =>
  Array.isArray(items) ? items[0] : undefined;
const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

/** Scores are stored as 0–100. Didit sends some as 0–1 (0.94) and some as 0–100. */
const percent = (...candidates: unknown[]) => {
  for (const c of candidates) {
    const v = num(c);
    if (v === undefined) continue;
    return Math.round((v <= 1 ? v * 100 : v) * 10) / 10;
  }
  return undefined;
};

export function summarizeDecision(
  decision?: DiditDecision | null,
): ReviewerSummary {
  if (!decision) return {};
  const idv = first(decision.id_verifications);
  const live = first(decision.liveness_checks);
  const fm = first(decision.face_matches);

  const codes = new Set<string>();
  for (const feature of [idv, live, fm]) {
    for (const w of feature?.warnings ?? []) {
      if (typeof w?.risk === "string" && w.risk) codes.add(w.risk);
    }
  }

  const summary: ReviewerSummary = {};
  if (typeof idv?.document_type === "string")
    summary.document_type = idv.document_type;
  const fmScore = percent(
    fm?.similarity_percentage,
    fm?.face_match_score,
    fm?.score,
  );
  if (fmScore !== undefined) summary.face_match_score = fmScore;
  const liveScore = percent(live?.liveness_score, live?.score);
  if (liveScore !== undefined) summary.liveness_score = liveScore;

  // Didit's Face Search runs inside liveness and raises these risk codes.
  if (live) {
    summary.duplicate_face = codes.has("DUPLICATED_FACE")
      ? "strong"
      : codes.has("POSSIBLE_DUPLICATED_FACE")
        ? "possible"
        : "none";
  }
  if (codes.size > 0) summary.warning_codes = [...codes].sort();
  return summary;
}

/**
 * Event time for ordering. Didit's `created_at` is when the session record last
 * changed and stays the same on retries; `timestamp` and the X-Timestamp header
 * are the dispatch time and change on every retry, so they are fallbacks only.
 */
export function eventTime(
  payload: DiditWebhookPayload,
  headerTimestamp: string | null,
): string | null {
  for (const v of [payload.created_at, payload.timestamp, headerTimestamp]) {
    if (v === undefined || v === null || v === "") continue;
    const n = typeof v === "number" ? v : Number(v);
    const date = Number.isFinite(n) ? new Date(n * 1000) : new Date(String(v));
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return null;
}
