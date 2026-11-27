import { coinsFromMinor } from "@tantiya/core/coins";
import { createClient } from "@tantiya/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CheckCircleIcon, ClockIcon, XCircleIcon } from "@/components/icons";
import { Card, Detail, Details } from "@/components/kyc-ui";
import { UserSearch } from "@/components/user-search";
import {
  actorLabel,
  changeLines,
  targetLabel,
  type AuditEntry,
} from "@/lib/audit";
import { lookupEmails } from "@/lib/emails";
import {
  formatPht,
  formatPhtSeconds,
  formatPhtShort,
  reasonLabel,
  statusLabels,
  type Application,
} from "@/lib/kyc";
import { requestTime } from "@/lib/request-time";
import { roleLabel, type StaffRole } from "@/lib/staff";

export const metadata: Metadata = { title: "User · Tantiya Staff" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AccountStatus = "under_review" | "approved" | "rejected" | "closed";

const accountLabels: Record<AccountStatus, string> = {
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  closed: "Closed",
};

const limitLabels: Record<string, string> = {
  top_up_daily: "Top-up per day",
  top_up_weekly: "Top-up per week",
  top_up_monthly: "Top-up per month",
  stake_daily: "Stakes per day",
  stake_weekly: "Stakes per week",
  stake_monthly: "Stakes per month",
};

const coins = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const formatCoins = (minor: number) => coins.format(coinsFromMinor(minor));

type Profile = {
  status: AccountStatus;
  locale: "en" | "fil";
  created_at: string;
  declared_21_plus_at: string | null;
  declared_in_ph_at: string | null;
};

type UserApplication = Pick<
  Application,
  | "id"
  | "status"
  | "submitted_at"
  | "reviewed_at"
  | "reviewed_by"
  | "reason_code"
> & { kyc_check_results: { document_type: string | null } | null };

// S7 user view: account, wallet, safer play, KYC history and the staff actions
// on this user. Read-only in the POC.
export default function UserPage({ params }: PageProps<"/users/[id]">) {
  return (
    <div className="flex max-w-290 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl leading-tight font-semibold">Users</h1>
        <p className="text-text-secondary">
          Search by email or user ID. Read-only in the POC.
        </p>
      </div>
      <UserSearch query="" />
      <Suspense
        fallback={
          <p role="status" className="text-text-secondary">
            Loading the user…
          </p>
        }
      >
        <UserDetail params={params} />
      </Suspense>
    </div>
  );
}

async function UserDetail({
  params,
}: {
  params: PageProps<"/users/[id]">["params"];
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [
    profile,
    applications,
    wallet,
    grant,
    limits,
    exclusions,
    roles,
    audit,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "status, locale, created_at, declared_21_plus_at, declared_in_ph_at",
      )
      .eq("id", id)
      .maybeSingle<Profile>(),
    supabase
      .from("kyc_applications")
      .select(
        "id, status, submitted_at, reviewed_at, reviewed_by, reason_code, kyc_check_results (document_type)",
      )
      .eq("user_id", id)
      .order("id", { ascending: false })
      .returns<UserApplication[]>(),
    supabase
      .from("wallet_accounts")
      .select("kind, balance_minor")
      .eq("user_id", id)
      .returns<{ kind: string; balance_minor: number }[]>(),
    supabase
      .from("ledger_transactions")
      .select("created_at")
      .eq("user_id", id)
      .eq("kind", "starting_grant")
      .maybeSingle<{ created_at: string }>(),
    supabase
      .from("user_limits")
      .select("kind, amount_minor, pending_amount_minor, pending_effective_at")
      .eq("user_id", id)
      .returns<
        {
          kind: string;
          amount_minor: number;
          pending_amount_minor: number | null;
          pending_effective_at: string | null;
        }[]
      >(),
    supabase
      .from("exclusions")
      .select("kind, starts_at, ends_at")
      .eq("user_id", id)
      .returns<{ kind: string; starts_at: string; ends_at: string | null }[]>(),
    supabase
      .from("staff_members")
      .select("role")
      .eq("user_id", id)
      .returns<{ role: StaffRole }[]>(),
    supabase.rpc("staff_user_audit", { p_user_id: id }),
  ]);

  if (!profile.data) notFound();

  const apps = applications.data ?? [];
  const entries = (audit.data ?? []) as AuditEntry[];
  const emails = await lookupEmails([id, ...apps.map((a) => a.reviewed_by)]);
  // staff_user_audit returns each staff member's email with the entry.
  const actorEmails = new Map<string, string>();
  for (const e of (audit.data ?? []) as (AuditEntry & {
    actor_email: string | null;
  })[]) {
    if (e.actor_id && e.actor_email) actorEmails.set(e.actor_id, e.actor_email);
  }

  const now = await requestTime();
  const active = (exclusions.data ?? []).filter(
    (x) =>
      Date.parse(x.starts_at) <= now &&
      (x.ends_at === null || Date.parse(x.ends_at) > now),
  );
  const coolingOff = active.find((x) => x.kind === "cooling_off");
  const selfExclusion = active.find((x) => x.kind === "self_exclusion");
  const approval = apps.find((a) => a.status === "approved");
  const balance = (kind: string) =>
    (wallet.data ?? []).find((w) => w.kind === kind)?.balance_minor;
  const p = profile.data;

  return (
    <>
      <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg leading-snug font-semibold break-all">
            {emails.get(id) ?? "Unknown email"}
          </h2>
          <AccountStatusLabel status={p.status} />
        </div>
        <dl className="grid grid-cols-3 gap-x-6 gap-y-4">
          <Detail term="User ID">
            <code className="text-sm break-all">{id}</code>
          </Detail>
          <Detail term="Account created">{formatPht(p.created_at)}</Detail>
          <Detail term="Approved">
            {approval?.reviewed_at
              ? `${formatPht(approval.reviewed_at)} by ${
                  (approval.reviewed_by && emails.get(approval.reviewed_by)) ??
                  "a reviewer"
                }`
              : "Not yet"}
          </Detail>
          <Detail term="Language">
            {p.locale === "fil" ? "Filipino" : "English"}
          </Detail>
          <Detail term="Declared 21 or older">
            {p.declared_21_plus_at
              ? `Yes, ${formatPhtShort(p.declared_21_plus_at)}`
              : "No"}
          </Detail>
          <Detail term="Declared in the Philippines">
            {p.declared_in_ph_at
              ? `Yes, ${formatPhtShort(p.declared_in_ph_at)}`
              : "No"}
          </Detail>
          {(roles.data ?? []).length > 0 && (
            <Detail term="Staff roles">
              {(roles.data ?? []).map((r) => roleLabel(r.role)).join(", ")}
            </Detail>
          )}
        </dl>
      </section>

      <div className="grid grid-cols-2 gap-6">
        <Card title="Coin wallet">
          {wallet.data?.length ? (
            <>
              <dl className="grid grid-cols-3 gap-x-6 gap-y-4">
                <Detail term="Available">
                  {formatCoins(balance("available") ?? 0)}
                </Detail>
                <Detail term="In play">
                  {formatCoins(balance("in_play") ?? 0)}
                </Detail>
                <Detail term="Pending withdrawal">
                  {formatCoins(balance("pending_withdrawal") ?? 0)}
                </Detail>
              </dl>
              <p className="text-sm text-text-muted">
                Play money.
                {grant.data &&
                  ` Starting grant on ${formatPht(grant.data.created_at)}.`}
              </p>
            </>
          ) : (
            <p className="text-sm text-text-secondary">
              No wallet yet. It opens when the account is approved.
            </p>
          )}
        </Card>
        <Card title="Safer play">
          <Details>
            <Detail term="Limits">
              {limits.data?.length ? (
                <ul className="text-sm">
                  {limits.data.map((l) => (
                    <li key={l.kind}>
                      {limitLabels[l.kind] ?? l.kind}:{" "}
                      {formatCoins(l.amount_minor)}
                      {l.pending_amount_minor !== null &&
                        l.pending_effective_at &&
                        ` (${formatCoins(l.pending_amount_minor)} from ${formatPhtShort(l.pending_effective_at)})`}
                    </li>
                  ))}
                </ul>
              ) : (
                "Defaults"
              )}
            </Detail>
            <Detail term="Cooling-off">
              {coolingOff?.ends_at
                ? `Until ${formatPht(coolingOff.ends_at)}`
                : "None"}
            </Detail>
            <Detail term="Self-exclusion">
              {selfExclusion
                ? selfExclusion.ends_at
                  ? `Until ${formatPht(selfExclusion.ends_at)}`
                  : "Permanent"
                : "None"}
            </Detail>
          </Details>
        </Card>
      </div>

      <Section title="KYC applications">
        {apps.length ? (
          <Table
            caption="KYC applications for this user"
            head={[
              "Application",
              "Status",
              "ID document",
              "Submitted",
              "Decided",
              "Decided by",
              "Reason",
            ]}
          >
            {apps.map((a) => (
              <tr key={a.id}>
                <Td>
                  <Link href={`/kyc/${a.id}`} className="text-accent-text">
                    #{a.id}
                  </Link>
                </Td>
                <Td>{statusLabels[a.status]}</Td>
                <Td>{a.kyc_check_results?.document_type ?? "—"}</Td>
                <Td>{a.submitted_at ? formatPhtShort(a.submitted_at) : "—"}</Td>
                <Td>{a.reviewed_at ? formatPhtShort(a.reviewed_at) : "—"}</Td>
                <Td>{(a.reviewed_by && emails.get(a.reviewed_by)) ?? "—"}</Td>
                <Td>{a.reason_code ? reasonLabel(a.reason_code) : "—"}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>No applications yet.</Empty>
        )}
      </Section>

      <Section title="Staff actions on this user">
        {entries.length ? (
          <Table
            caption="Audit entries for this user"
            head={["Time (PHT)", "Staff member", "Action", "Changed", "Change"]}
          >
            {entries.map((e) => (
              <tr key={e.id} className="align-top">
                <Td nowrap>{formatPhtSeconds(e.created_at)}</Td>
                <Td>{actorLabel(e, actorEmails)}</Td>
                <Td>
                  <code>{e.action}</code>
                </Td>
                <Td>
                  <ChangedRecord entry={e} />
                </Td>
                <Td>
                  {changeLines(e).map((line, i) => (
                    <div key={i} className="break-words">
                      {line}
                    </div>
                  ))}
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>No staff actions on this user.</Empty>
        )}
      </Section>
    </>
  );
}

// What the entry changed, in this user's terms: one approval changes both the
// application and the account, recorded as two entries.
function ChangedRecord({ entry }: { entry: AuditEntry }) {
  switch (entry.target_table) {
    case "profiles":
      return "Account";
    case "staff_members":
      return "Staff role";
    default: {
      const target = targetLabel(entry, new Map());
      return target.href ? (
        <Link href={target.href} className="text-accent-text">
          {target.text}
        </Link>
      ) : (
        target.text
      );
    }
  }
}

function AccountStatusLabel({ status }: { status: AccountStatus }) {
  const [icon, color] =
    status === "approved"
      ? [<CheckCircleIcon key="i" />, "text-open-text"]
      : status === "under_review"
        ? [<ClockIcon key="i" />, "text-closing-text"]
        : [<XCircleIcon key="i" />, "text-closed-text"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold whitespace-nowrap ${color}`}
    >
      {icon}
      {accountLabels[status]}
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg leading-snug font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Table({
  caption,
  head,
  children,
}: {
  caption: string;
  head: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                scope="col"
                className="border-b border-border p-3 text-left text-xs font-semibold whitespace-nowrap text-text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({
  nowrap = false,
  children,
}: {
  nowrap?: boolean;
  children: React.ReactNode;
}) {
  return (
    <td
      className={`border-b border-border p-3 ${nowrap ? "whitespace-nowrap" : ""}`}
    >
      {children}
    </td>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-card border border-border bg-surface p-5 text-sm text-text-secondary">
      {children}
    </p>
  );
}
