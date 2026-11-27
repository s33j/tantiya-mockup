import { createClient } from "@tantiya/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRightIcon } from "@/components/icons";
import { DuplicateLabel, VerdictLabel, Waiting } from "@/components/kyc-ui";
import {
  formatDuration,
  formatPhtShort,
  formatScore,
  queueTabs,
  statusLabels,
  TARGET_MS,
  type Application,
  type CheckResult,
  type DuplicateFace,
  type QueueTab,
} from "@/lib/kyc";
import { lookupEmails } from "@/lib/emails";
import { requestTime } from "@/lib/request-time";
import { getStaff } from "@/lib/staff";

export const metadata: Metadata = { title: "KYC review · Tantiya Staff" };

// My choice: the most rows one tab shows. Enough for the POC's 30 a month.
const ROW_LIMIT = 200;

const verdictOptions = ["Approved", "Declined", "In Review"];
const duplicateOptions: { value: DuplicateFace; label: string }[] = [
  { value: "none", label: "None found" },
  { value: "possible", label: "Possible match" },
  { value: "strong", label: "Strong match" },
];

type Row = Pick<
  Application,
  | "id"
  | "user_id"
  | "status"
  | "provider_status"
  | "submitted_at"
  | "reviewed_at"
  | "updated_at"
> & {
  kyc_check_results: Pick<
    CheckResult,
    "document_type" | "face_match_score" | "liveness_score" | "duplicate_face"
  > | null;
};

type Filters = { tab: QueueTab; verdict: string; duplicate: string };

function readFilters(params: Record<string, string | string[] | undefined>) {
  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : "";
  };
  const tab = queueTabs.find((t) => t.value === one("status"))?.value;
  return {
    tab: tab ?? "submitted",
    verdict: verdictOptions.includes(one("verdict")) ? one("verdict") : "",
    duplicate: duplicateOptions.some((d) => d.value === one("duplicate"))
      ? one("duplicate")
      : "",
  } satisfies Filters;
}

function queueHref(filters: Filters) {
  const params = new URLSearchParams({ status: filters.tab });
  if (filters.verdict) params.set("verdict", filters.verdict);
  if (filters.duplicate) params.set("duplicate", filters.duplicate);
  return `/kyc?${params}`;
}

// S4: applications waiting for a staff decision, oldest first; other tabs list
// the rest. Waiting time counts from when Didit finished its checks.
export default function KycQueuePage({ searchParams }: PageProps<"/kyc">) {
  return (
    <div className="flex max-w-290 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl leading-tight font-semibold">KYC review</h1>
        <p className="text-text-secondary">
          A staff reviewer approves every account. Didit&apos;s verdict is
          advice, not a decision.
        </p>
      </div>
      <Suspense
        fallback={
          <p role="status" className="text-text-secondary">
            Loading applications…
          </p>
        }
      >
        <Queue searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Queue({
  searchParams,
}: {
  searchParams: PageProps<"/kyc">["searchParams"];
}) {
  const filters = readFilters(await searchParams);
  const supabase = await createClient();

  let rowsQuery = supabase
    .from("kyc_applications")
    .select(
      "id, user_id, status, provider_status, submitted_at, reviewed_at, updated_at, kyc_check_results (document_type, face_match_score, liveness_score, duplicate_face)",
    )
    .limit(ROW_LIMIT);
  if (filters.tab !== "all") rowsQuery = rowsQuery.eq("status", filters.tab);
  if (filters.verdict)
    rowsQuery = rowsQuery.eq("provider_status", filters.verdict);
  rowsQuery =
    filters.tab === "submitted"
      ? rowsQuery.order("submitted_at", { ascending: true, nullsFirst: true })
      : rowsQuery.order("id", { ascending: false });

  const [staff, { data: statuses, error: statusError }, rowsResult] =
    await Promise.all([
      getStaff(),
      supabase
        .from("kyc_applications")
        .select("status, submitted_at, reviewed_at")
        .returns<
          Pick<Application, "status" | "submitted_at" | "reviewed_at">[]
        >(),
      rowsQuery.returns<Row[]>(),
    ]);

  if (statusError || rowsResult.error) {
    return (
      <p role="alert" className="text-closing-text">
        The applications couldn&apos;t load. Reload the page to try again.
      </p>
    );
  }

  const rows = (rowsResult.data ?? []).filter(
    (r) =>
      !filters.duplicate ||
      r.kyc_check_results?.duplicate_face === filters.duplicate,
  );

  const emailById = await lookupEmails(rows.map((r) => r.user_id));

  const now = await requestTime();
  const all = statuses ?? [];
  const waiting = all.filter((a) => a.status === "submitted");
  const oldest = Math.max(
    0,
    ...waiting.map((a) =>
      a.submitted_at ? now - Date.parse(a.submitted_at) : 0,
    ),
  );
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const decided = all.filter(
    (a) =>
      a.reviewed_at && a.submitted_at && Date.parse(a.reviewed_at) >= weekAgo,
  );
  const inTime = decided.filter(
    (a) =>
      Date.parse(a.reviewed_at!) - Date.parse(a.submitted_at!) <= TARGET_MS,
  );

  const count = (tab: QueueTab) =>
    tab === "all" ? all.length : all.filter((a) => a.status === tab).length;

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <Counter label="Waiting for a decision" note="Oldest first">
          {waiting.length}
        </Counter>
        <Counter label="Oldest waiting" note="Target: decide within 24 h">
          {waiting.length ? formatDuration(oldest) : "—"}
        </Counter>
        <Counter label="Decided within 24 h, last 7 days" note="Target: 90%">
          {decided.length
            ? `${Math.round((inTime.length / decided.length) * 100)}%`
            : "—"}
        </Counter>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border">
        <ul aria-label="Status" className="flex flex-wrap gap-6">
          {queueTabs.map((tab) => {
            const current = tab.value === filters.tab;
            return (
              <li key={tab.value}>
                <Link
                  href={queueHref({ ...filters, tab: tab.value })}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-2 border-b-2 px-1 text-sm whitespace-nowrap ${
                    current
                      ? "border-accent font-semibold text-text"
                      : "border-transparent text-text-secondary"
                  }`}
                >
                  {tab.label}
                  <span className="rounded-full bg-surface px-2 text-xs text-text-secondary">
                    {count(tab.value)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <form className="flex flex-wrap items-center gap-4 pb-2">
          <input type="hidden" name="status" value={filters.tab} />
          <FilterSelect
            id="f-verdict"
            name="verdict"
            label="Didit verdict"
            value={filters.verdict}
            options={verdictOptions.map((v) => ({ value: v, label: v }))}
          />
          <FilterSelect
            id="f-dup"
            name="duplicate"
            label="Duplicate person"
            value={filters.duplicate}
            options={duplicateOptions}
          />
          <button
            type="submit"
            className="min-h-10 rounded-input border border-border-strong px-3 text-sm font-semibold"
          >
            Apply
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-card border border-border bg-surface p-5 text-text-secondary">
          {filters.verdict || filters.duplicate
            ? "No applications match these filters."
            : filters.tab === "submitted"
              ? "No applications are waiting for a decision."
              : "No applications here yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full border-collapse">
            <caption className="sr-only">
              {queueTabs.find((t) => t.value === filters.tab)?.label}
              {filters.tab === "submitted"
                ? ", oldest first"
                : ", newest first"}
            </caption>
            <thead>
              <tr>
                <Th>Application</Th>
                <Th>Applicant</Th>
                {filters.tab === "all" && <Th>Status</Th>}
                <Th>ID document</Th>
                <Th>Didit verdict</Th>
                <Th align="right">Face / liveness</Th>
                <Th>Duplicate person</Th>
                <Th>
                  {filters.tab === "submitted" ? "Waiting" : "Last update"}
                </Th>
                <Th align="right">
                  <span className="sr-only">Action</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const own = row.user_id === staff?.id;
                const check = row.kyc_check_results;
                const lastUpdate =
                  row.reviewed_at ?? row.submitted_at ?? row.updated_at;
                return (
                  <tr key={row.id}>
                    <Td>
                      <span className="font-semibold">#{row.id}</span>
                    </Td>
                    <Td small>
                      {emailById.get(row.user_id) ?? "Unknown account"}
                      {own && (
                        <span className="ml-2 inline-block rounded-full border border-border-strong px-2 text-xs text-text-secondary">
                          Your application
                        </span>
                      )}
                    </Td>
                    {filters.tab === "all" && (
                      <Td small>{statusLabels[row.status]}</Td>
                    )}
                    <Td small>{check?.document_type ?? "—"}</Td>
                    <Td small>
                      <VerdictLabel status={row.provider_status} />
                    </Td>
                    <Td align="right">
                      <span className="whitespace-nowrap">
                        {formatScore(check?.face_match_score ?? null)} /{" "}
                        {formatScore(check?.liveness_score ?? null)}
                      </span>
                    </Td>
                    <Td small>
                      <DuplicateLabel value={check?.duplicate_face ?? null} />
                    </Td>
                    <Td small>
                      {row.status === "submitted" && row.submitted_at ? (
                        <Waiting ms={now - Date.parse(row.submitted_at)} />
                      ) : (
                        <span className="whitespace-nowrap">
                          {formatPhtShort(lastUpdate)}
                        </span>
                      )}
                    </Td>
                    <Td align="right">
                      <Link
                        href={`/kyc/${row.id}`}
                        className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-accent-text"
                      >
                        {row.status === "submitted" && !own ? "Review" : "View"}
                        <span className="sr-only"> application {row.id}</span>
                        <ChevronRightIcon />
                      </Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-text-muted">
        Waiting = time since the ID check was submitted. On track under 18 h,
        due soon 18–24 h, over target after 24 h. Times in PHT.
        {(rowsResult.data?.length ?? 0) === ROW_LIMIT &&
          ` Showing the first ${ROW_LIMIT}.`}
      </p>
    </>
  );
}

function Counter({
  label,
  note,
  children,
}: {
  label: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
      <h2 className="text-sm font-normal text-text-muted">{label}</h2>
      <p className="text-xl leading-tight font-semibold">{children}</p>
      <p className="text-xs text-text-muted">{note}</p>
    </section>
  );
}

function FilterSelect({
  id,
  name,
  label,
  value,
  options,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm whitespace-nowrap text-text-muted">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={value}
        className="min-h-10 rounded-input border border-border-strong bg-surface-sunken px-2 text-sm text-text"
      >
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Th({
  align = "left",
  children,
}: {
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <th
      scope="col"
      className={`border-b border-border p-3 text-xs font-semibold whitespace-nowrap text-text-muted ${align === "right" ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

function Td({
  align = "left",
  small = false,
  children,
}: {
  align?: "left" | "right";
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <td
      className={`border-b border-border p-3 align-middle ${align === "right" ? "text-right" : "text-left"} ${small ? "text-sm" : ""}`}
    >
      {children}
    </td>
  );
}
