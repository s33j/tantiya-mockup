import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@tantiya/supabase/server";
import { appUrl, getKycProvider } from "./provider";

// Start or resume the signed-in user's application. Used by POST /api/kyc/session
// and the "Start again" action on the return page.
export type StartKycResult =
  | { state: "redirect"; url: string }
  | { state: "cap_reached"; resetsOn: string }
  | {
      state:
        | "already_submitted"
        | "already_approved"
        | "declarations_missing"
        | "not_eligible"
        | "unauthenticated"
        | "provider_error"
        | "error";
    };

type StartRow = {
  result:
    | "reserved"
    | "existing"
    | "already_submitted"
    | "already_approved"
    | "cap_reached"
    | "declarations_missing"
    | "not_eligible";
  application_id: number | null;
  session_url: string | null;
  resets_on: string | null;
};

export async function startKycApplication(): Promise<StartKycResult> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) return { state: "unauthenticated" };

  const { data, error } = await supabase
    .rpc("kyc_start_application")
    .single<StartRow>();
  if (error || !data) {
    console.error("kyc_start_application failed", error);
    return { state: "error" };
  }

  switch (data.result) {
    case "reserved":
      break;
    case "existing":
      return { state: "redirect", url: data.session_url! };
    case "cap_reached":
      return { state: "cap_reached", resetsOn: data.resets_on! };
    default:
      return { state: data.result };
  }

  // Reserved: create the vendor session, then attach it.
  const admin = createAdminClient();
  const applicationId = data.application_id!;
  try {
    const provider = getKycProvider();
    const session = await provider.createSession({
      applicationId: String(applicationId),
      userId,
      callbackUrl: `${appUrl()}/kyc/return`,
    });
    const { error: attachError } = await admin.rpc("kyc_attach_session", {
      p_application_id: applicationId,
      p_provider: provider.name,
      p_session_id: session.sessionId,
      p_session_url: session.url,
    });
    if (attachError) throw attachError;
    return { state: "redirect", url: session.url };
  } catch (err) {
    console.error("KYC session creation failed", err);
    await admin.rpc("kyc_release_reservation", {
      p_application_id: applicationId,
    });
    return { state: "provider_error" };
  }
}
