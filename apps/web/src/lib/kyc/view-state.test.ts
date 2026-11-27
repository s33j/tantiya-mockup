// Run with: pnpm --filter @tantiya/web test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isFixable,
  kycView,
  REASON_CODES,
  toReasonCode,
  type ApplicationState,
  type ProfileState,
} from "./view-state.ts";

const declared: ProfileState = {
  status: "under_review",
  declared_21_plus_at: "2026-11-15T00:00:00Z",
  declared_in_ph_at: "2026-11-15T00:00:00Z",
};

function app(
  status: ApplicationState["status"],
  extra: Partial<ApplicationState> = {},
): ApplicationState {
  return { status, reason_code: null, didit_session_id: "sess", ...extra };
}

test("view: no application", () => {
  assert.deepEqual(kycView(declared, null), { screen: "verify" });
  assert.deepEqual(kycView({ ...declared, declared_in_ph_at: null }, null), {
    screen: "confirmDeclarations",
  });
  assert.deepEqual(kycView({ ...declared, declared_21_plus_at: null }, null), {
    screen: "confirmDeclarations",
  });
});

test("view: each application status", () => {
  assert.deepEqual(kycView(declared, app("started")), { screen: "receiving" });
  assert.deepEqual(kycView(declared, app("submitted")), {
    screen: "underReview",
  });
  assert.deepEqual(kycView(declared, app("abandoned")), {
    screen: "notFinished",
  });
  assert.deepEqual(
    kycView(declared, app("rejected", { reason_code: "id_unreadable" })),
    { screen: "notApproved", reason: "id_unreadable" },
  );
  assert.deepEqual(kycView(declared, app("approved")), { screen: "approved" });
});

test("view: a reserved slot that never reached Didit shows the intro", () => {
  assert.deepEqual(
    kycView(declared, app("started", { didit_session_id: null })),
    { screen: "verify" },
  );
});

test("view: the account status wins over the application", () => {
  assert.deepEqual(kycView({ ...declared, status: "approved" }, null), {
    screen: "approved",
  });
  assert.deepEqual(
    kycView({ ...declared, status: "closed" }, app("submitted")),
    { screen: "accountClosed", status: "closed" },
  );
  assert.deepEqual(kycView({ ...declared, status: "rejected" }, null), {
    screen: "accountClosed",
    status: "rejected",
  });
});

test("view: Apply again only for reasons the applicant can fix", () => {
  const canApplyAgain = Object.fromEntries(
    REASON_CODES.map((code) => {
      const view = kycView(declared, app("rejected", { reason_code: code }));
      assert.deepEqual(view, { screen: "notApproved", reason: code });
      return [code, isFixable(code)];
    }),
  );
  assert.deepEqual(canApplyAgain, {
    id_unreadable: true,
    id_expired: true,
    id_type_not_accepted: true,
    face_mismatch: true,
    liveness_failed: true,
    under_21: false,
    outside_ph: false,
    duplicate_person: false,
    document_suspect: false,
    other: true,
  });
});

test("reason codes: unknown or missing read as other", () => {
  assert.equal(toReasonCode("face_mismatch"), "face_mismatch");
  assert.equal(toReasonCode("something_new"), "other");
  assert.equal(toReasonCode(null), "other");
});
