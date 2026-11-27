// Audit log entries (S7, S8): who acted, on what, and what changed. Entries are
// written by database triggers (Task 8) and can't be edited or deleted.

export type AuditEntry = {
  id: number;
  created_at: string;
  actor_id: string | null;
  action: string;
  target_table: string;
  target_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  db_user?: string | null;
};

type Emails = Map<string, string>;

// Ids and times are on the entry already; the change shows the rest.
function shown(key: string) {
  return !(key === "id" || /_(id|at|by)$/.test(key));
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 79)}…` : text;
}

// "status: submitted → approved"; "role: kyc_reviewer" for an insert;
// "removed: role kyc_reviewer" for a delete.
export function changeLines(entry: AuditEntry) {
  const { before, after } = entry;
  if (!before && after) {
    return Object.entries(after)
      .filter(([k]) => shown(k))
      .map(([k, v]) => `${k}: ${formatValue(v)}`);
  }
  if (before && !after) {
    const kept = Object.entries(before).filter(([k]) => shown(k));
    return [
      `removed: ${kept.map(([k, v]) => `${k} ${formatValue(v)}`).join(", ")}`,
    ];
  }
  const keys = Object.keys({ ...before, ...after }).filter(shown);
  return keys.map(
    (k) => `${k}: ${formatValue(before?.[k])} → ${formatValue(after?.[k])}`,
  );
}

export function reasonCodeOf(entry: AuditEntry) {
  const code = entry.after?.reason_code;
  return typeof code === "string" ? code : null;
}

export function actorLabel(entry: AuditEntry, emails: Emails) {
  if (!entry.actor_id) {
    return `Outside the app${entry.db_user ? ` (${entry.db_user})` : ""}`;
  }
  return emails.get(entry.actor_id) ?? "Unknown staff member";
}

// The user an entry is about, when there is one (for links and emails).
export function targetUserId(entry: AuditEntry) {
  if (entry.target_table === "profiles") return entry.target_id;
  if (entry.target_table === "staff_members")
    return entry.target_id.split("/")[0];
  return null;
}

export function targetLabel(
  entry: AuditEntry,
  emails: Emails,
): { text: string; href?: string } {
  const { target_table: table, target_id: id } = entry;
  switch (table) {
    case "kyc_applications":
      return { text: `Application #${id}`, href: `/kyc/${id}` };
    case "kyc_review_notes":
      return { text: `Note on application #${id}`, href: `/kyc/${id}` };
    case "kyc_settings":
      return { text: "KYC settings" };
    case "profiles":
      return { text: emails.get(id) ?? "Account", href: `/users/${id}` };
    case "staff_members": {
      const [userId, role] = id.split("/");
      return {
        text: `${emails.get(userId) ?? "Account"} · ${role}`,
        href: `/users/${userId}`,
      };
    }
    default:
      return { text: `${table} ${id}` };
  }
}
