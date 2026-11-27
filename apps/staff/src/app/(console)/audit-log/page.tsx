import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  actorLabel,
  changeLines,
  reasonCodeOf,
  targetLabel,
} from "@/lib/audit";
import {
  auditQuery,
  ENTRY_LIMIT,
  loadAuditLog,
  ranges,
  readAuditFilters,
} from "@/lib/audit-log";
import { formatPhtSeconds } from "@/lib/kyc";
import { getStaff } from "@/lib/staff";

export const metadata: Metadata = { title: "Audit log · Tantiya Staff" };

// S8: every staff action, newest first (proposal, Features > Staff console:
// "audit log of every staff action"). Admins only.
export default function AuditLogPage({
  searchParams,
}: PageProps<"/audit-log">) {
  return (
    <div className="flex max-w-290 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl leading-tight font-semibold">Audit log</h1>
        <p className="text-text-secondary">
          Every staff action, newest first. Entries can&apos;t be edited or
          deleted.
        </p>
      </div>
      <Suspense
        fallback={
          <p role="status" className="text-text-secondary">
            Loading the audit log…
          </p>
        }
      >
        <AuditLog searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AuditLog({
  searchParams,
}: {
  searchParams: PageProps<"/audit-log">["searchParams"];
}) {
  const staff = await getStaff();
  if (!staff?.roles.includes("admin")) {
    return (
      <p className="rounded-card border border-border bg-surface p-5 text-text-secondary">
        Only admins can see the full audit log. Staff actions on one user are on
        that user&apos;s page under Users.
      </p>
    );
  }

  const filters = readAuditFilters(await searchParams);
  const { entries, emails, actions, actors, error, capped } =
    await loadAuditLog(filters);

  if (error) {
    return (
      <p role="alert" className="text-closing-text">
        The audit log couldn&apos;t load. Reload the page to try again.
      </p>
    );
  }

  return (
    <>
      <form className="flex flex-wrap items-end gap-4">
        <Select
          id="a-action"
          name="action"
          label="Action"
          value={filters.action}
          any="All actions"
          options={actions.map((a) => ({ value: a, label: a }))}
        />
        <Select
          id="a-staff"
          name="staff"
          label="Staff member"
          value={filters.staff}
          any="Everyone"
          options={actors.map(([value, label]) => ({ value, label }))}
        />
        <Select
          id="a-range"
          name="range"
          label="When"
          value={filters.range}
          options={ranges.map((r) => ({ value: r.value, label: r.label }))}
        />
        <button
          type="submit"
          className="min-h-11 rounded-input border border-border-strong px-4 font-semibold"
        >
          Apply
        </button>
        <a
          href={`/audit-log/export?${auditQuery(filters)}`}
          className="inline-flex min-h-11 items-center rounded-input border border-border-strong px-4 font-semibold"
        >
          Export CSV
        </a>
      </form>

      {entries.length === 0 ? (
        <p className="rounded-card border border-border bg-surface p-5 text-text-secondary">
          No staff actions match these filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full border-collapse">
            <caption className="sr-only">Staff actions, newest first</caption>
            <thead>
              <tr>
                {[
                  "Time (PHT)",
                  "Staff member",
                  "Action",
                  "Target",
                  "Change",
                  "Reason code",
                ].map((h) => (
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
            <tbody className="text-sm">
              {entries.map((entry) => {
                const target = targetLabel(entry, emails);
                const reason = reasonCodeOf(entry);
                return (
                  <tr key={entry.id} className="align-top">
                    <td className="border-b border-border p-3 whitespace-nowrap">
                      {formatPhtSeconds(entry.created_at)}
                    </td>
                    <td className="border-b border-border p-3">
                      {actorLabel(entry, emails)}
                    </td>
                    <td className="border-b border-border p-3">
                      <code>{entry.action}</code>
                    </td>
                    <td className="border-b border-border p-3">
                      {target.href ? (
                        <Link href={target.href} className="text-accent-text">
                          {target.text}
                        </Link>
                      ) : (
                        target.text
                      )}
                    </td>
                    <td className="border-b border-border p-3">
                      {changeLines(entry).map((line, i) => (
                        <div key={i} className="break-words">
                          {line}
                        </div>
                      ))}
                    </td>
                    <td className="border-b border-border p-3">
                      {reason ? <code>{reason}</code> : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-text-muted">
        Times in Philippine time (PHT). Before and after values come from the
        audit log entry. &quot;Outside the app&quot; means a change made in
        Supabase Studio or by SQL.
        {capped &&
          ` Showing the newest ${ENTRY_LIMIT} entries in this time range.`}
      </p>
    </>
  );
}

function Select({
  id,
  name,
  label,
  value,
  any,
  options,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  any?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={value}
        className="min-h-11 min-w-45 rounded-input border border-border-strong bg-surface-sunken px-2 text-sm text-text"
      >
        {any && <option value="">{any}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
