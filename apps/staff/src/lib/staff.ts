import { createClient } from "@tantiya/supabase/server";
import { cache } from "react";

export type StaffRole =
  | "kyc_reviewer"
  | "market_builder"
  | "resolver"
  | "withdrawal_approver"
  | "moderator"
  | "admin";

const roleLabels: Record<StaffRole, string> = {
  admin: "Admin",
  kyc_reviewer: "KYC reviewer",
  market_builder: "Market builder",
  resolver: "Resolver",
  withdrawal_approver: "Withdrawal approver",
  moderator: "Moderator",
};

export function roleLabel(role: StaffRole) {
  return roleLabels[role];
}

// The signed-in staff member, once per request. The proxy has already checked
// the session, the staff role and two-step sign-in; this reads who it is.
export const getStaff = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const { data: rows } = await supabase
    .from("staff_members")
    .select("role")
    .eq("user_id", claims.sub)
    .returns<{ role: StaffRole }[]>();

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    roles: (rows ?? []).map((r) => r.role),
  };
});
