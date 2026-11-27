import { createClient } from "@tantiya/supabase/server";
import { actorLabel, type AuditEntry } from "./audit";
import { lookupEmails } from "./emails";
import { requestTime } from "./request-time";

// S8 filters, from the URL. "outside" = changes made outside the app's API.
export const ranges = [
  { value: "1d", label: "Last 24 hours", days: 1 },
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "all", label: "All time", days: null },
] as const;

// My choice: the most entries one view loads. Narrow the filters for more.
export const ENTRY_LIMIT = 500;

export type AuditFilters = { action: string; staff: string; range: string };

export function readAuditFilters(
  params: Record<string, string | string[] | undefined>,
): AuditFilters {
  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : "";
  };
  return {
    action: one("action"),
    staff: one("staff"),
    range: ranges.some((r) => r.value === one("range")) ? one("range") : "7d",
  };
}

export function auditQuery(filters: AuditFilters) {
  const params = new URLSearchParams({ range: filters.range });
  if (filters.action) params.set("action", filters.action);
  if (filters.staff) params.set("staff", filters.staff);
  return params.toString();
}

// Admins only: row level security returns nothing to anyone else.
export async function loadAuditLog(filters: AuditFilters) {
  const supabase = await createClient();
  const days = ranges.find((r) => r.value === filters.range)?.days ?? null;

  let query = supabase
    .from("audit_log")
    .select(
      "id, created_at, actor_id, action, target_table, target_id, before, after, db_user",
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(ENTRY_LIMIT);
  if (days !== null) {
    const now = await requestTime();
    query = query.gte(
      "created_at",
      new Date(now - days * 24 * 60 * 60 * 1000).toISOString(),
    );
  }

  const { data, error } = await query.returns<AuditEntry[]>();
  const inRange = data ?? [];

  const userIds = inRange.flatMap((e) => [
    e.actor_id,
    e.target_table === "profiles" ? e.target_id : null,
    e.target_table === "staff_members" ? e.target_id.split("/")[0] : null,
  ]);
  const emails = await lookupEmails(userIds);

  // Filter options come from the entries in the chosen time range.
  const actions = [...new Set(inRange.map((e) => e.action))].sort();
  const actors = [
    ...new Map(
      inRange.map((e) => [e.actor_id ?? "outside", actorLabel(e, emails)]),
    ),
  ].sort((a, b) => a[1].localeCompare(b[1]));

  const entries = inRange.filter(
    (e) =>
      (!filters.action || e.action === filters.action) &&
      (!filters.staff || (e.actor_id ?? "outside") === filters.staff),
  );

  return {
    entries,
    emails,
    actions,
    actors,
    error,
    capped: inRange.length === ENTRY_LIMIT,
  };
}
