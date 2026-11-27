import { createClient } from "@tantiya/supabase/server";

// Emails live in auth.users, which the API can't read; staff_user_emails
// returns them to KYC reviewers and admins (20261120000000_staff_console.sql).
export async function lookupEmails(userIds: (string | null | undefined)[]) {
  const ids = [...new Set(userIds.filter((id): id is string => !!id))];
  if (!ids.length) return new Map<string, string>();

  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_user_emails", {
    p_user_ids: ids,
  });
  return new Map(
    ((data ?? []) as { user_id: string; email: string }[]).map((e) => [
      e.user_id,
      e.email,
    ]),
  );
}
