// Which application screen the Account page shows (Gantt Task 9). Pure, so it is
// unit-tested in view-state.test.ts and shared by the page and its tests.
//
// Screens are numbered as on the "Tantiya — Task 9 Application Flow" canvas.
// 06 (applications full) and 11 (couldn't start) are not here: they come only
// from the POST /api/kyc/session response, see components/kyc/kyc-start.tsx.

export type AccountStatus = "under_review" | "approved" | "rejected" | "closed";

export type ApplicationStatus =
  "started" | "abandoned" | "submitted" | "approved" | "rejected";

export type ProfileState = {
  status: AccountStatus;
  declared_21_plus_at: string | null;
  declared_in_ph_at: string | null;
};

export type ApplicationState = {
  status: ApplicationStatus;
  reason_code: string | null;
  // Null while the slot is reserved but the vendor session was never attached.
  didit_session_id: string | null;
};

// PLACEHOLDER reason codes (Task 9/10 mockups handoff): Dev 2's proposal,
// approved on Nov 19, 2026 only as a stand-in. Replace with the team's final
// list before launch, together with the database check
// kyc_applications_reason_code_placeholder (20261120000000_staff_console.sql).
// Applicants see plain-language text for each.
export const REASON_CODES = [
  "id_unreadable",
  "id_expired",
  "id_type_not_accepted",
  "face_mismatch",
  "liveness_failed",
  "under_21",
  "outside_ph",
  "duplicate_person",
  "document_suspect",
  "other",
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

// Rejections the applicant can fix by taking the ID check again. Only these
// offer "Apply again" (decided Nov 15, 2026; re-applying itself is tentative).
// The database still lets any rejected applicant start a new application.
const FIXABLE_REASONS = [
  "id_unreadable",
  "id_expired",
  "id_type_not_accepted",
  "face_mismatch",
  "liveness_failed",
  "other",
] as const satisfies readonly ReasonCode[];

export type FixableReason = (typeof FIXABLE_REASONS)[number];

export function isFixable(reason: ReasonCode): reason is FixableReason {
  return (FIXABLE_REASONS as readonly ReasonCode[]).includes(reason);
}

export type KycView =
  | { screen: "verify" } // 03
  | { screen: "underReview" } // 04
  | { screen: "notFinished" } // 05
  | { screen: "notApproved"; reason: ReasonCode } // 07
  | { screen: "approved" } // 08
  | { screen: "receiving" } // 09
  | { screen: "confirmDeclarations" } // 10
  | { screen: "accountClosed"; status: "rejected" | "closed" }; // no screen drawn

// reason_code is free text in the database; anything unknown reads as "other".
export function toReasonCode(code: string | null): ReasonCode {
  return REASON_CODES.find((c) => c === code) ?? "other";
}

// application is the user's latest kyc_applications row, or null.
export function kycView(
  profile: ProfileState,
  application: ApplicationState | null,
): KycView {
  if (profile.status === "approved") return { screen: "approved" };
  if (profile.status === "rejected" || profile.status === "closed") {
    return { screen: "accountClosed", status: profile.status };
  }

  switch (application?.status) {
    case "submitted":
      return { screen: "underReview" };
    case "approved":
      // Approval sets profiles.status in the same transaction, so this only
      // shows if the two ever disagree.
      return { screen: "approved" };
    case "rejected":
      return {
        screen: "notApproved",
        reason: toReasonCode(application.reason_code),
      };
    case "abandoned":
      return { screen: "notFinished" };
    case "started":
      // A reserved slot without a vendor session means the user never reached
      // Didit; starting again reuses the slot.
      if (application.didit_session_id) return { screen: "receiving" };
      break;
  }

  if (!profile.declared_21_plus_at || !profile.declared_in_ph_at) {
    return { screen: "confirmDeclarations" };
  }
  return { screen: "verify" };
}
