import { actorLabel, changeLines, reasonCodeOf } from "@/lib/audit";
import { loadAuditLog, readAuditFilters } from "@/lib/audit-log";
import { getStaff } from "@/lib/staff";

// S8 "Export CSV": the entries the page shows for the same filters.
export async function GET(request: Request) {
  const staff = await getStaff();
  if (!staff?.roles.includes("admin")) {
    return new Response("Only admins can export the audit log.", {
      status: 403,
    });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const { entries, emails, error } = await loadAuditLog(
    readAuditFilters(params),
  );
  if (error) {
    return new Response("The audit log couldn't load.", { status: 500 });
  }

  const header = [
    "time_utc",
    "staff_member",
    "action",
    "target_table",
    "target_id",
    "change",
    "reason_code",
    "before",
    "after",
  ];
  const rows = entries.map((e) => [
    e.created_at,
    actorLabel(e, emails),
    e.action,
    e.target_table,
    e.target_id,
    changeLines(e).join("; "),
    reasonCodeOf(e) ?? "",
    e.before ? JSON.stringify(e.before) : "",
    e.after ? JSON.stringify(e.after) : "",
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map(csvCell).join(","))
    .join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tantiya-audit-log-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

// Quotes every cell; a leading = + - @ is prefixed so spreadsheets don't run it.
function csvCell(value: string) {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
