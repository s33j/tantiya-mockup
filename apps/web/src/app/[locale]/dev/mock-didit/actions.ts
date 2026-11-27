"use server";

import { notFound, redirect } from "next/navigation";
import {
  buildScenarioEvents,
  MOCK_SCENARIOS,
  type MockScenario,
} from "@/lib/kyc/mock-scenarios";
import { appUrl, mockEnabled } from "@/lib/kyc/provider";
import { signDiditBody } from "@/lib/kyc/signature";
import { createAdminClient } from "@/lib/supabase/admin";

// Plays a scenario: sends Didit-format signed webhooks to our own endpoint, then
// redirects to the callback the way Didit's hosted flow does.
export async function simulate(sessionId: string, formData: FormData) {
  if (!mockEnabled()) notFound();

  const scenario = String(formData.get("scenario")) as MockScenario;
  if (!(scenario in MOCK_SCENARIOS)) throw new Error("unknown scenario");
  const documentType = String(formData.get("documentType") ?? "PhilID");
  const sendTwice = formData.get("sendTwice") === "on";

  const { data: application } = await createAdminClient()
    .from("kyc_applications")
    .select("user_id")
    .eq("didit_session_id", sessionId)
    .maybeSingle();
  if (!application) notFound();

  const events = buildScenarioEvents(scenario, {
    sessionId,
    vendorData: application.user_id,
    documentType,
    nowSeconds: Math.floor(Date.now() / 1000),
  });

  const secret = process.env.DIDIT_WEBHOOK_SECRET ?? "";
  for (const payload of events) {
    const body = JSON.stringify(payload);
    const send = () =>
      fetch(`${appUrl()}/api/webhooks/didit`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-signature": signDiditBody(body, secret),
          "x-timestamp": String(Math.floor(Date.now() / 1000)),
        },
        body,
        cache: "no-store",
      });
    const res = await send();
    if (!res.ok) throw new Error(`mock webhook failed: HTTP ${res.status}`);
    // A retry of the same event, which must change nothing.
    if (sendTwice) await send();
  }

  // Didit appends verificationSessionId and status to the callback. The proxy
  // adds the locale, as it does for the real callback.
  const finalStatus =
    scenario === "out_of_order" ? "Approved" : events[events.length - 1].status;
  const query = new URLSearchParams({
    verificationSessionId: sessionId,
    status: finalStatus,
  });
  redirect(`/kyc/return?${query}`);
}
