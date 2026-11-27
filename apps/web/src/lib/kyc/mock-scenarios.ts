// Scripted outcomes for the dev-only mock Didit page. Each scenario is the list
// of webhooks Didit would send, in Didit's V3 format.
// DOCUMENT_EXPIRED and LOW_FACE_MATCH_SIMILARITY match real Didit sandbox
// webhooks (Nov 19); the duplicate-face codes are from Didit's Face Search docs.
import { randomUUID } from "node:crypto";
import type {
  DiditDecision,
  DiditStatus,
  DiditWebhookPayload,
} from "./didit-types";

export const MOCK_DOCUMENT_TYPES = [
  "PhilID",
  "ePhilID",
  "Passport",
  "Driver's License",
  "UMID",
] as const;

export const MOCK_SCENARIOS = {
  approved: "Approved by vendor (clean)",
  in_review_possible_duplicate: "In Review: possible duplicate face",
  declined_duplicate: "Declined: duplicate face (same person already verified)",
  declined_face_mismatch: "Declined: selfie does not match ID",
  declined_document: "Declined: document problem",
  abandoned: "Abandoned (user quit mid-flow)",
  expired: "Expired (link never opened)",
  out_of_order: 'Approved, then a late older "In Progress" (ordering test)',
} as const;

export type MockScenario = keyof typeof MOCK_SCENARIOS;

interface Ctx {
  sessionId: string;
  vendorData: string;
  documentType: string;
  nowSeconds: number;
}

function decision(
  ctx: Ctx,
  opts: {
    face?: number;
    live?: number;
    idWarn?: string[];
    liveWarn?: string[];
    faceWarn?: string[];
  },
): DiditDecision {
  const warn = (codes?: string[]) => (codes ?? []).map((risk) => ({ risk }));
  return {
    id_verifications: [
      {
        status: opts.idWarn?.length ? "Declined" : "Approved",
        document_type: ctx.documentType,
        warnings: warn(opts.idWarn),
      },
    ],
    liveness_checks: [
      {
        status: opts.liveWarn?.length ? "In Review" : "Approved",
        liveness_score: (opts.live ?? 97) / 100,
        warnings: warn(opts.liveWarn),
      },
    ],
    face_matches: [
      {
        status: (opts.face ?? 92) < 50 ? "Declined" : "Approved",
        face_match_score: (opts.face ?? 92) / 100,
        similarity_percentage: opts.face ?? 92,
        warnings: warn(opts.faceWarn),
      },
    ],
  };
}

function event(
  ctx: Ctx,
  status: DiditStatus,
  at: number,
  d?: DiditDecision,
): DiditWebhookPayload {
  return {
    event_id: randomUUID(),
    session_id: ctx.sessionId,
    status,
    webhook_type: "status.updated",
    vendor_data: ctx.vendorData,
    workflow_id: "mock-workflow",
    environment: "sandbox",
    created_at: at,
    timestamp: at,
    ...(d ? { decision: d } : {}),
  };
}

export function buildScenarioEvents(
  scenario: MockScenario,
  ctx: Ctx,
): DiditWebhookPayload[] {
  const t = ctx.nowSeconds;
  const started = event(ctx, "In Progress", t);
  switch (scenario) {
    case "approved":
      return [started, event(ctx, "Approved", t + 60, decision(ctx, {}))];
    case "in_review_possible_duplicate":
      return [
        started,
        event(
          ctx,
          "In Review",
          t + 60,
          decision(ctx, { liveWarn: ["POSSIBLE_DUPLICATED_FACE"] }),
        ),
      ];
    case "declined_duplicate":
      return [
        started,
        event(
          ctx,
          "Declined",
          t + 60,
          decision(ctx, { liveWarn: ["DUPLICATED_FACE"] }),
        ),
      ];
    case "declined_face_mismatch":
      return [
        started,
        event(
          ctx,
          "Declined",
          t + 60,
          decision(ctx, { face: 31, faceWarn: ["LOW_FACE_MATCH_SIMILARITY"] }),
        ),
      ];
    case "declined_document":
      return [
        started,
        event(
          ctx,
          "Declined",
          t + 60,
          decision(ctx, { idWarn: ["DOCUMENT_EXPIRED"] }),
        ),
      ];
    case "abandoned":
      return [started, event(ctx, "Abandoned", t + 600)];
    case "expired":
      return [event(ctx, "Expired", t)];
    case "out_of_order":
      // The final event arrives first; the older "In Progress" arrives late and must be ignored.
      return [event(ctx, "Approved", t + 60, decision(ctx, {})), started];
  }
}
