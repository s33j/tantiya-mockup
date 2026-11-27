import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { DiditWebhookPayload } from "@/lib/kyc/didit-types";
import { verifyDiditSignature } from "@/lib/kyc/signature";
import { eventTime, summarizeDecision } from "@/lib/kyc/summary";
import { webhookSkipReason } from "@/lib/kyc/webhook-filter";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/webhooks/didit: Didit's webhooks, and identical ones from the mock.
// Register this URL in the Didit console for status.updated and data.updated.
export async function POST(request: Request) {
  // The signature covers the exact bytes, so read the raw body before parsing.
  const raw = await request.text();
  const secret = process.env.DIDIT_WEBHOOK_SECRET ?? "";
  if (!verifyDiditSignature(raw, request.headers.get("x-signature"), secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: DiditWebhookPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const skip = webhookSkipReason(
    payload,
    request.headers.get("x-didit-test-webhook"),
    process.env.DIDIT_ENVIRONMENT || undefined,
  );
  if (skip) {
    if (skip === "wrong_environment") {
      console.warn("KYC webhook from another Didit environment ignored", {
        environment: payload.environment,
        session: payload.session_id,
      });
    }
    return NextResponse.json({ result: skip });
  }

  if (
    payload.webhook_type !== "status.updated" &&
    payload.webhook_type !== "data.updated"
  ) {
    return NextResponse.json({ result: "ignored" });
  }
  if (!payload.session_id || !payload.status) {
    return NextResponse.json(
      { error: "missing session_id or status" },
      { status: 400 },
    );
  }

  // Retries resend the same body, so its hash is a safe fallback id.
  const eventId =
    payload.event_id ?? createHash("sha256").update(raw).digest("hex");

  const { data, error } = await createAdminClient().rpc(
    "kyc_record_provider_event",
    {
      p_event_id: eventId,
      p_session_id: payload.session_id,
      p_provider_status: payload.status,
      p_event_at: eventTime(payload, request.headers.get("x-timestamp")),
      p_summary: summarizeDecision(payload.decision),
    },
  );

  if (error) {
    // Any non-2xx makes Didit retry later.
    console.error("kyc_record_provider_event failed", error);
    return NextResponse.json({ error: "store failed" }, { status: 500 });
  }
  if (data === "unknown_session" || data === "unknown_status") {
    console.warn("KYC webhook not applied", {
      result: data,
      session: payload.session_id,
      status: payload.status,
    });
  }
  return NextResponse.json({ result: data });
}
