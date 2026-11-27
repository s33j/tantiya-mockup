import { createClient } from "@tantiya/supabase/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/kyc-ui";
import { ModerationActions } from "@/components/moderation-actions";
import { formatPht } from "@/lib/kyc";
import { getStaff } from "@/lib/staff";

export const metadata: Metadata = { title: "Moderation · Tantiya Staff" };

// Community moderation queue (mockup 6.07): posts with open reports, oldest
// report first. Moderators and admins. Hiding removes the post for everyone
// but its author; keeping closes the reports. Community guidelines and who
// moderates are still open decisions.
const REASONS: Record<string, string> = {
  spam: "Spam or selling tips",
  harassment: "Harassment or hate",
  politics: "Politics or elections",
  misleading: "Misleading information",
  personal_info: "Personal information",
  other: "Something else",
};

export default function ModerationPage() {
  return (
    <div className="flex max-w-290 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl leading-tight font-semibold">Moderation</h1>
        <p className="text-text-secondary">
          Community posts that members reported. Hide a post that breaks the
          rules; keep it if it doesn&apos;t. Either way its reports close.
        </p>
      </div>
      <Suspense fallback={<p className="text-text-secondary">Loading…</p>}>
        <Queue />
      </Suspense>
    </div>
  );
}

type Report = {
  post_id: number;
  reason: string;
  note: string | null;
  created_at: string;
};

async function Queue() {
  const staff = await getStaff();
  const roles = staff?.roles ?? [];
  if (!roles.includes("moderator") && !roles.includes("admin")) {
    return (
      <p className="text-text-secondary">
        The moderation queue is for moderators and admins.
      </p>
    );
  }

  const supabase = await createClient();
  const { data: reportRows, error } = await supabase
    .from("post_reports")
    .select("post_id, reason, note, created_at")
    .is("resolution", null)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  const reports = (reportRows ?? []) as Report[];
  if (reports.length === 0) {
    return <p className="text-text-secondary">No reports waiting.</p>;
  }

  const postIds = [...new Set(reports.map((r) => r.post_id))];
  const { data: postRows, error: postError } = await supabase
    .from("posts")
    .select("id, author_id, body, created_at, hidden_at")
    .in("id", postIds);
  if (postError) throw postError;
  const posts = (postRows ?? []) as {
    id: number;
    author_id: string;
    body: string;
    created_at: string;
    hidden_at: string | null;
  }[];

  const { data: authorRows } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", [...new Set(posts.map((p) => p.author_id))]);
  const authors = new Map(
    (authorRows ?? []).map((a) => [
      a.id as string,
      a.display_name as string | null,
    ]),
  );

  return (
    <ul className="flex flex-col gap-4">
      {postIds.map((id) => {
        const post = posts.find((p) => p.id === id);
        if (!post) return null;
        const own = reports.filter((r) => r.post_id === id);
        return (
          <li key={id}>
            <Card
              title={`Post #${id} by ${authors.get(post.author_id) ?? "member without a name"}`}
              action={
                <span className="text-sm text-text-secondary">
                  {own.length} open report{own.length === 1 ? "" : "s"}
                </span>
              }
            >
              <p className="whitespace-pre-wrap rounded-input bg-surface-sunken p-3">
                {post.body}
              </p>
              <p className="text-sm text-text-muted">
                Posted {formatPht(post.created_at)}
                {post.hidden_at ? " · already hidden" : ""}
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {own.map((r, i) => (
                  <li key={i}>
                    <span className="font-semibold">
                      {REASONS[r.reason] ?? r.reason}
                    </span>
                    <span className="text-text-muted">
                      {" "}
                      · {formatPht(r.created_at)}
                    </span>
                    {r.note && (
                      <span className="block text-text-secondary">
                        “{r.note}”
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <ModerationActions postId={id} />
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
