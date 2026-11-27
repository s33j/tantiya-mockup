import { createClient } from "@tantiya/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DecisionPanel } from "@/components/decision-panel";
import {
  AlertIcon,
  CheckIcon,
  ChevronLeftIcon,
  ClockIcon,
  ExternalIcon,
} from "@/components/icons";
import {
  Card,
  Detail,
  Details,
  DuplicateLabel,
  VerdictLabel,
  Waiting,
} from "@/components/kyc-ui";
import {
  diditConsoleUrl,
  formatPht,
  formatPhtShort,
  formatScore,
  reasonLabel,
  statusLabels,
  type Application,
  type CheckResult,
} from "@/lib/kyc";
import { lookupEmails } from "@/lib/emails";
import { requestTime } from "@/lib/request-time";
import { getStaff } from "@/lib/staff";

export const metadata: Metadata = { title: "Application · Tantiya Staff" };

type Profile = {
  created_at: string;
  declared_21_plus_at: string | null;
  declared_in_ph_at: string | null;
};

type ProviderEvent = {
  event_id: string;
  provider_status: string;
  event_at: string | null;
  received_at: string;
  outcome: string;
};

// S5 (and S6 for the reviewer's own application): Didit's check summary, the
// applicant, the timeline and the decision.
export default function ApplicationPage({ params }: PageProps<"/kyc/[id]">) {
  return (
    <div className="flex max-w-290 flex-col gap-6">
      <Link
        href="/kyc"
        className="inline-flex min-h-10 items-center gap-1 self-start text-sm font-semibold text-accent-text"
      >
        <ChevronLeftIcon />
        KYC review
      </Link>
      <Suspense
        fallback={
          <p role="status" className="text-text-secondary">
            Loading the application…
          </p>
        }
      >
        <ApplicationDetail params={params} />
      </Suspense>
    </div>
  );
}

async function ApplicationDetail({
  params,
}: {
  params: PageProps<"/kyc/[id]">["params"];
}) {
  const { id: rawId } = await params;
  if (!/^\d+$/.test(rawId)) notFound();
  const id = Number(rawId);

  const supabase = await createClient();
  const [staff, { data: app }] = await Promise.all([
    getStaff(),
    supabase
      .from("kyc_applications")
      .select(
        "id, user_id, status, provider_status, didit_session_id, reason_code, reviewed_by, reviewed_at, submitted_at, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle<Application>(),
  ]);
  if (!app) notFound();

  const [check, profile, earlier, events, note, emailById] = await Promise.all([
    supabase
      .from("kyc_check_results")
      .select(
        "application_id, document_type, face_match_score, liveness_score, duplicate_face, warning_codes",
      )
      .eq("application_id", id)
      .maybeSingle<CheckResult>(),
    supabase
      .from("profiles")
      .select("created_at, declared_21_plus_at, declared_in_ph_at")
      .eq("id", app.user_id)
      .maybeSingle<Profile>(),
    supabase
      .from("kyc_applications")
      .select("id, status")
      .eq("user_id", app.user_id)
      .neq("id", id)
      .order("id")
      .returns<Pick<Application, "id" | "status">[]>(),
    app.didit_session_id
      ? supabase
          .from("kyc_provider_events")
          .select("event_id, provider_status, event_at, received_at, outcome")
          .eq("session_id", app.didit_session_id)
          .order("received_at")
          .returns<ProviderEvent[]>()
      : Promise.resolve({ data: [] as ProviderEvent[] }),
    supabase
      .from("kyc_review_notes")
      .select("note")
      .eq("application_id", id)
      .maybeSingle<{ note: string }>(),
    lookupEmails([app.user_id, app.reviewed_by]),
  ]);

  const applicantEmail = emailById.get(app.user_id) ?? "Unknown account";
  const reviewerEmail = app.reviewed_by
    ? (emailById.get(app.reviewed_by) ?? "a reviewer")
    : null;
  const own = app.user_id === staff?.id;
  const result = check.data;
  const consoleUrl = diditConsoleUrl(app.didit_session_id);

  const now = await requestTime();

  // Didit events: the vendor's time when it sent one, else when we got it.
  const timeline = [
    ...(profile.data
      ? [{ at: profile.data.created_at, text: "Account created" }]
      : []),
    { at: app.created_at, text: "ID check started on Didit" },
    ...(events.data ?? [])
      .filter((e) => e.outcome === "applied")
      .map((e) => ({
        at: e.event_at ?? e.received_at,
        text: `Didit: ${e.provider_status}`,
      })),
    ...(app.reviewed_at
      ? [
          {
            at: app.reviewed_at,
            text:
              app.status === "approved"
                ? `Approved by ${reviewerEmail}`
                : `Rejected by ${reviewerEmail}: ${reasonLabel(app.reason_code)}`,
          },
        ]
      : []),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-xl leading-tight font-semibold">
          Application #{app.id}
        </h1>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-0.5 text-sm">
          <ClockIcon />
          {statusLabels[app.status]}
        </span>
        {app.status === "submitted" && app.submitted_at && (
          <span className="text-sm">
            <Waiting ms={now - Date.parse(app.submitted_at)} />
          </span>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(300px,360px)] items-start gap-6">
        <div className="flex min-w-0 flex-col gap-6">
          <Card
            title="Check summary from Didit"
            action={
              consoleUrl && (
                <a
                  href={consoleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-accent-text"
                >
                  Open in Didit console
                  <ExternalIcon />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )
            }
          >
            <Details>
              <Detail term="ID document">{result?.document_type ?? "—"}</Detail>
              <Detail term="Didit verdict">
                <VerdictLabel status={app.provider_status} />
              </Detail>
              <Detail term="Face match (selfie vs ID)">
                {result?.face_match_score == null
                  ? "—"
                  : `${formatScore(result.face_match_score)} / 100`}
              </Detail>
              <Detail term="Liveness">
                {result?.liveness_score == null
                  ? "—"
                  : `${formatScore(result.liveness_score)} / 100`}
              </Detail>
              <Detail term="Duplicate person (Face Search)">
                <DuplicateLabel value={result?.duplicate_face ?? null} />
              </Detail>
              <Detail term="Warnings">
                {result?.warning_codes.length ? (
                  <ul>
                    {result.warning_codes.map((w) => (
                      <li key={w}>
                        <code className="text-sm">{w}</code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  "None"
                )}
              </Detail>
            </Details>
            <div className="flex items-start gap-3 rounded-input bg-surface-sunken p-3">
              <span className="flex pt-0.5 text-text-muted">
                <AlertIcon size={18} />
              </span>
              <p className="text-sm text-text-secondary">
                Didit&apos;s verdict is advice. The account stays under review
                until you decide. ID images and the selfie stay with Didit; open
                the Didit console to see them. For a doubtful PhilID, check its
                QR in PhilSys Check.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-6">
              <a
                href="https://verify.philsys.gov.ph"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-accent-text"
              >
                PhilSys Check (verify.philsys.gov.ph)
                <ExternalIcon />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              {!consoleUrl && app.didit_session_id && (
                <p className="py-2 text-sm text-text-muted">
                  Didit session: <code>{app.didit_session_id}</code>
                </p>
              )}
            </div>
          </Card>

          <Card title="Applicant">
            <Details>
              <Detail term="Email">{applicantEmail}</Detail>
              <Detail term="Account created">
                {profile.data ? formatPht(profile.data.created_at) : "—"}
              </Detail>
              <Detail term="Declared 21 or older">
                <Declared at={profile.data?.declared_21_plus_at ?? null} />
              </Detail>
              <Detail term="Declared in the Philippines">
                <Declared at={profile.data?.declared_in_ph_at ?? null} />
              </Detail>
              <Detail term="Earlier applications">
                {earlier.data?.length
                  ? earlier.data.map((e, i) => (
                      <span key={e.id}>
                        {i > 0 && ", "}
                        <Link
                          href={`/kyc/${e.id}`}
                          className="text-accent-text"
                        >
                          #{e.id}
                        </Link>{" "}
                        ({statusLabels[e.status].toLowerCase()})
                      </span>
                    ))
                  : "None"}
              </Detail>
              <Detail term="ID check submitted">
                {app.submitted_at ? formatPht(app.submitted_at) : "Not yet"}
              </Detail>
            </Details>
          </Card>

          <Card title="Timeline">
            <ol className="flex flex-col gap-2">
              {timeline.map((item, i) => (
                <li key={i} className="flex gap-4 text-sm">
                  <span className="w-28 shrink-0 text-text-muted">
                    {formatPhtShort(item.at)}
                  </span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-text-muted">Times in PHT</p>
          </Card>
        </div>

        <section className="sticky top-6 flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
          <h2 className="text-lg leading-snug font-semibold">Decision</h2>
          {app.status === "approved" || app.status === "rejected" ? (
            <div className="flex flex-col gap-2 text-sm">
              <p>
                <span className="font-semibold">
                  {app.status === "approved" ? "Approved" : "Rejected"}
                </span>{" "}
                by {reviewerEmail} on{" "}
                {app.reviewed_at && formatPht(app.reviewed_at)}.
              </p>
              {app.status === "rejected" && (
                <p>Reason: {reasonLabel(app.reason_code)}</p>
              )}
              {note.data && (
                <div className="flex flex-col gap-1">
                  <p className="font-semibold">Internal note</p>
                  <p className="whitespace-pre-wrap text-text-secondary">
                    {note.data.note}
                  </p>
                </div>
              )}
            </div>
          ) : own ? (
            <p className="text-sm text-text-secondary">
              This is your own application. Another reviewer must decide it.
            </p>
          ) : app.status === "submitted" ? (
            <DecisionPanel applicationId={app.id} />
          ) : (
            <p className="text-sm text-text-secondary">
              {app.status === "abandoned"
                ? "The applicant left the ID check or its link expired. Nothing to decide."
                : "The applicant hasn't finished the ID check yet. Nothing to decide."}
            </p>
          )}
        </section>
      </div>
    </>
  );
}

function Declared({ at }: { at: string | null }) {
  return at ? (
    <span className="inline-flex items-center gap-1.5 text-text-secondary">
      <CheckIcon />
      Yes, {formatPhtShort(at)}
    </span>
  ) : (
    <span className="text-closing-text">No</span>
  );
}
