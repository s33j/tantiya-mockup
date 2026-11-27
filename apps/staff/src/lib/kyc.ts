// KYC review (S4, S5): labels, the 24-hour target and time formatting.

export type KycStatus =
  "started" | "abandoned" | "submitted" | "approved" | "rejected";

export type DuplicateFace = "none" | "possible" | "strong";

export type Application = {
  id: number;
  user_id: string;
  status: KycStatus;
  provider_status: string | null;
  didit_session_id: string | null;
  reason_code: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CheckResult = {
  application_id: number;
  document_type: string | null;
  face_match_score: number | null;
  liveness_score: number | null;
  duplicate_face: DuplicateFace | null;
  warning_codes: string[];
};

export const statusLabels: Record<KycStatus, string> = {
  submitted: "Waiting for decision",
  started: "In ID check",
  approved: "Approved",
  rejected: "Rejected",
  abandoned: "Abandoned",
};

// Queue tabs (S4), in the mockup's order. "all" lists every status.
export const queueTabs = [
  { value: "submitted", label: "Waiting for decision" },
  { value: "started", label: "In ID check" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "abandoned", label: "Abandoned" },
  { value: "all", label: "All" },
] as const;

export type QueueTab = (typeof queueTabs)[number]["value"];

// PLACEHOLDER reason codes (Nov 19, 2026): replace with the team's final list
// before launch, together with REASON_CODES in apps/web/src/lib/kyc/view-state.ts
// and the database check kyc_applications_reason_code_placeholder.
export const reasonCodes = [
  {
    code: "id_unreadable",
    label: "ID unreadable",
    hint: "Blurred, cut off or glare",
  },
  { code: "id_expired", label: "ID expired" },
  {
    code: "id_type_not_accepted",
    label: "ID type not accepted",
    hint: "Not PhilID/ePhilID, passport, driver's license or UMID",
  },
  { code: "face_mismatch", label: "Selfie doesn't match the ID" },
  { code: "liveness_failed", label: "Liveness check failed" },
  { code: "under_21", label: "Under 21 according to the ID" },
  { code: "outside_ph", label: "Not in the Philippines" },
  { code: "duplicate_person", label: "Same person already has an account" },
  { code: "document_suspect", label: "Document looks altered or fake" },
  { code: "other", label: "Other", hint: "Internal note required" },
] as const;

export type ReasonCode = (typeof reasonCodes)[number]["code"];

export function reasonLabel(code: string | null) {
  return reasonCodes.find((r) => r.code === code)?.label ?? code ?? "—";
}

// The proposal's service target: 90% of KYC decisions within 24 hours
// (Success criteria). The 18-hour "due soon" warning is my choice.
const HOUR = 60 * 60 * 1000;
export const TARGET_MS = 24 * HOUR;
export const DUE_SOON_MS = 18 * HOUR;

export type Urgency = "onTrack" | "dueSoon" | "over";

export function urgency(waitedMs: number): Urgency {
  if (waitedMs > TARGET_MS) return "over";
  if (waitedMs >= DUE_SOON_MS) return "dueSoon";
  return "onTrack";
}

export function formatDuration(ms: number) {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(minutes / 60)} h ${minutes % 60} m`;
}

const phtDateTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const phtTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const phtSeconds = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

// "Nov 15, 2026, 10:02:14" (audit log; times in PHT, said once nearby)
export function formatPhtSeconds(iso: string) {
  return phtSeconds.format(new Date(iso));
}

// "Nov 14, 2026, 20:05 PHT"
export function formatPht(iso: string) {
  return `${phtDateTime.format(new Date(iso))} PHT`;
}

// "Nov 14, 20:05" (times in PHT, said once nearby)
export function formatPhtShort(iso: string) {
  return phtTime.format(new Date(iso));
}

export function formatScore(score: number | null) {
  return score === null ? "—" : String(Math.round(score));
}

// Reviewers open the ID images and selfie in Didit's console; we keep none.
// DIDIT_CONSOLE_SESSION_URL is the console address up to and including
// "/kyc/verifications/", different for Didit's Sandbox and Live applications.
export function diditConsoleUrl(sessionId: string | null) {
  const base = process.env.DIDIT_CONSOLE_SESSION_URL;
  if (!base || !sessionId) return null;
  return `${base.replace(/\/?$/, "/")}${encodeURIComponent(sessionId)}`;
}
