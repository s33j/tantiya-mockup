import { NextResponse } from "next/server";
import { startKycApplication, type StartKycResult } from "@/lib/kyc/start";

// POST /api/kyc/session, no body. Called by the application flow (Task 9) after
// email verification. Returns where to send the user next; see README "KYC".
const httpStatus: Record<StartKycResult["state"], number> = {
  redirect: 200,
  already_submitted: 409,
  already_approved: 409,
  cap_reached: 409,
  declarations_missing: 409,
  not_eligible: 403,
  unauthenticated: 401,
  provider_error: 502,
  error: 500,
};

export async function POST() {
  const result = await startKycApplication();
  return NextResponse.json(result, { status: httpStatus[result.state] });
}
