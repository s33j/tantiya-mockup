import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { KycScreen, type StartingGrant } from "@/components/kyc/kyc-screens";
import { KycStart } from "@/components/kyc/kyc-start";
import { AccountHeading } from "@/components/kyc/kyc-ui";
import { redirect } from "@/i18n/navigation";
import { coinsFromMinor } from "@tantiya/core/coins";
import {
  kycView,
  type ApplicationState,
  type KycView,
  type ProfileState,
} from "@/lib/kyc/view-state";
import { createClient } from "@tantiya/supabase/server";

// The Account page is the home of the application flow (Gantt Task 9): it shows
// the screen for the user's account and latest application. Didit returns users
// to /kyc/return, which redirects here.

type StatusLabel =
  | { ns: "Auth"; key: "under_review" | "approved" | "rejected" | "closed" }
  | { ns: "Kyc"; key: "notSubmitted" | "inProgress" | "notApproved" };

function statusLabel(view: KycView): StatusLabel {
  switch (view.screen) {
    case "underReview":
      return { ns: "Auth", key: "under_review" };
    case "approved":
      return { ns: "Auth", key: "approved" };
    case "accountClosed":
      return { ns: "Auth", key: view.status };
    case "receiving":
      return { ns: "Kyc", key: "inProgress" };
    case "notApproved":
      return { ns: "Kyc", key: "notApproved" };
    default:
      return { ns: "Kyc", key: "notSubmitted" };
  }
}

async function AccountDetails() {
  const tAuth = await getTranslations("Auth");
  const tKyc = await getTranslations("Kyc.accountStatus");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    return redirect({ href: "/sign-in", locale: await getLocale() });
  }

  // Reviewers can read every application, so filter to the user's own.
  const [{ data: profile }, { data: application }] = await Promise.all([
    supabase
      .from("profiles")
      .select("status, declared_21_plus_at, declared_in_ph_at")
      .eq("id", claims.sub)
      .maybeSingle<ProfileState>(),
    supabase
      .from("kyc_applications")
      .select("status, reason_code, didit_session_id")
      .eq("user_id", claims.sub)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle<ApplicationState>(),
  ]);

  const view = profile ? kycView(profile, application) : null;
  const grant =
    view?.screen === "approved" ? await startingGrant(claims.sub) : undefined;
  const label = view && statusLabel(view);

  return (
    <>
      {view ? (
        <KycStart>
          <KycScreen view={view} grant={grant} />
        </KycStart>
      ) : (
        <AccountHeading />
      )}
      <dl className="flex flex-col gap-4">
        <div>
          <dt className="text-sm text-text-muted">{tAuth("email")}</dt>
          <dd>{claims.email}</dd>
        </div>
        {label && (
          <div>
            <dt className="text-sm text-text-muted">
              {tAuth("accountStatus")}
            </dt>
            <dd>
              {label.ns === "Auth"
                ? tAuth(`status.${label.key}`)
                : tKyc(label.key)}
            </dd>
          </div>
        )}
      </dl>
      <SignOutButton />
    </>
  );
}

// The 08 "Approved" screen shows the grant as the ledger recorded it: the
// credit to the user's own wallet in their starting_grant transaction.
async function startingGrant(
  userId: string,
): Promise<StartingGrant | undefined> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ledger_entries")
    .select(
      "amount_minor, created_at, ledger_transactions!inner(kind), wallet_accounts!inner(user_id)",
    )
    .eq("ledger_transactions.kind", "starting_grant")
    .eq("wallet_accounts.user_id", userId)
    .limit(1)
    .maybeSingle<{ amount_minor: number; created_at: string }>();
  if (!data) return undefined;

  return { coins: coinsFromMinor(data.amount_minor), addedAt: data.created_at };
}

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountHeading />}>
      <AccountDetails />
    </Suspense>
  );
}
