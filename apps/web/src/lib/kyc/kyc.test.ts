// Run with: pnpm --filter @tantiya/web test
// The database side is covered by supabase/tests/kyc.test.sql.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildScenarioEvents,
  MOCK_SCENARIOS,
  type MockScenario,
} from "./mock-scenarios.ts";
import { signDiditBody, verifyDiditSignature } from "./signature.ts";
import { eventTime, summarizeDecision } from "./summary.ts";

test("signature: valid, tampered, wrong secret, missing, garbage", () => {
  const body = JSON.stringify({
    session_id: "s",
    status: "Approved",
    webhook_type: "status.updated",
  });
  const sig = signDiditBody(body, "secret");
  assert.match(sig, /^[0-9a-f]{64}$/);
  assert.equal(verifyDiditSignature(body, sig, "secret"), true);
  assert.equal(verifyDiditSignature(body + " ", sig, "secret"), false);
  assert.equal(verifyDiditSignature(body, sig, "other"), false);
  assert.equal(verifyDiditSignature(body, null, "secret"), false);
  assert.equal(verifyDiditSignature(body, "zz-not-hex", "secret"), false);
  assert.equal(verifyDiditSignature(body, sig, ""), false);
});

test("summary: duplicate flags and scores, no personal data", () => {
  const s = summarizeDecision({
    id_verifications: [{ document_type: "PhilID", warnings: [] }],
    liveness_checks: [
      { score: 97, warnings: [{ risk: "POSSIBLE_DUPLICATED_FACE" }] },
    ],
    face_matches: [{ score: 88 }],
  });
  assert.deepEqual(s, {
    document_type: "PhilID",
    face_match_score: 88,
    liveness_score: 97,
    duplicate_face: "possible",
    warning_codes: ["POSSIBLE_DUPLICATED_FACE"],
  });
  assert.equal(
    summarizeDecision({
      liveness_checks: [{ warnings: [{ risk: "DUPLICATED_FACE" }] }],
    }).duplicate_face,
    "strong",
  );
  assert.deepEqual(summarizeDecision(undefined), {});
  assert.deepEqual(summarizeDecision({}), {});
});

test("summary: Didit test-event sample shape (Nov 19), scores as 0-100", () => {
  // Field names and values from the console's signed test event; personal data
  // (names, birth date, document number, image URLs) must not come through.
  const s = summarizeDecision({
    id_verifications: [
      {
        status: "Approved",
        warnings: [],
        document_type: "Driver's License",
        full_name: "John Michael Smith",
        document_number: "D1234567890",
        front_image: "https://cdn.didit.me/test/front.jpg",
      } as never,
    ],
    liveness_checks: [
      { status: "Approved", warnings: [], liveness_score: 0.98 },
    ],
    face_matches: [
      {
        status: "Approved",
        warnings: [],
        face_match_score: 0.94,
        similarity_percentage: 94,
      },
    ],
  });
  assert.deepEqual(s, {
    document_type: "Driver's License",
    face_match_score: 94,
    liveness_score: 98,
    duplicate_face: "none",
  });
  // 0-1 only, no percentage field.
  assert.equal(
    summarizeDecision({ face_matches: [{ face_match_score: 0.875 }] })
      .face_match_score,
    87.5,
  );
});

test("eventTime: body unix seconds, ISO, header fallback, none", () => {
  const base = { session_id: "s", status: "x", webhook_type: "y" };
  assert.equal(
    eventTime({ ...base, timestamp: 1700000000 }, null),
    "2023-11-14T22:13:20.000Z",
  );
  assert.equal(
    eventTime({ ...base, created_at: "2026-11-09T01:00:00Z" }, null),
    "2026-11-09T01:00:00.000Z",
  );
  assert.equal(eventTime(base, "1700000000"), "2023-11-14T22:13:20.000Z");
  assert.equal(eventTime(base, null), null);
  // A retry refreshes timestamp but keeps created_at: created_at wins.
  assert.equal(
    eventTime({ ...base, created_at: 1700000000, timestamp: 1700000300 }, null),
    "2023-11-14T22:13:20.000Z",
  );
});

// What each mock scenario's last-arriving decision tells the reviewer.
const expected: Record<
  MockScenario,
  { finalStatus: string; duplicate?: string }
> = {
  approved: { finalStatus: "Approved", duplicate: "none" },
  in_review_possible_duplicate: {
    finalStatus: "In Review",
    duplicate: "possible",
  },
  declined_duplicate: { finalStatus: "Declined", duplicate: "strong" },
  declined_face_mismatch: { finalStatus: "Declined", duplicate: "none" },
  declined_document: { finalStatus: "Declined", duplicate: "none" },
  abandoned: { finalStatus: "Abandoned" },
  expired: { finalStatus: "Expired" },
  // The late "In Progress" is older, so the database keeps "Approved".
  out_of_order: { finalStatus: "Approved", duplicate: "none" },
};

test("mock scenarios: Didit-format events in the expected order", () => {
  for (const scenario of Object.keys(MOCK_SCENARIOS) as MockScenario[]) {
    const events = buildScenarioEvents(scenario, {
      sessionId: "sess",
      vendorData: "user",
      documentType: "UMID",
      nowSeconds: 1_800_000_000,
    });
    const newest = events.reduce((a, b) =>
      Number(b.created_at) > Number(a.created_at) ? b : a,
    );
    assert.equal(newest.status, expected[scenario].finalStatus, scenario);
    assert.equal(
      summarizeDecision(newest.decision).duplicate_face,
      expected[scenario].duplicate,
      `${scenario}: duplicate flag`,
    );
    if (expected[scenario].duplicate) {
      assert.equal(
        summarizeDecision(newest.decision).document_type,
        "UMID",
        `${scenario}: document`,
      );
    }
    assert.equal(
      new Set(events.map((e) => e.event_id)).size,
      events.length,
      `${scenario}: unique event ids`,
    );
    for (const e of events) {
      assert.equal(e.session_id, "sess");
      assert.equal(e.webhook_type, "status.updated");
    }
  }
});
