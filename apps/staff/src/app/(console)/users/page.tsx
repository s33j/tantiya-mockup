import { createClient } from "@tantiya/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRightIcon } from "@/components/icons";
import { UserSearch } from "@/components/user-search";

export const metadata: Metadata = { title: "Users · Tantiya Staff" };

// S7: find a user by email or user ID. Read-only in the POC.
export default function UsersPage({ searchParams }: PageProps<"/users">) {
  return (
    <div className="flex max-w-290 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl leading-tight font-semibold">Users</h1>
        <p className="text-text-secondary">
          Search by email or user ID. Read-only in the POC.
        </p>
      </div>
      <Suspense fallback={<UserSearch query="" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({
  searchParams,
}: {
  searchParams: PageProps<"/users">["searchParams"];
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  if (!query) return <UserSearch query="" />;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_find_users", {
    p_query: query,
  });
  const users = (data ?? []) as { user_id: string; email: string }[];

  return (
    <>
      <UserSearch query={query} />
      {error ? (
        <p role="alert" className="text-closing-text">
          {error.message.includes("at least 3 characters")
            ? "Type at least 3 characters of the email, or a full user ID."
            : "The search didn't work. Try again."}
        </p>
      ) : users.length === 0 ? (
        <p className="rounded-card border border-border bg-surface p-5 text-text-secondary">
          No users match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-card border border-border bg-surface">
          {users.map((u) => (
            <li
              key={u.user_id}
              className="border-b border-border last:border-0"
            >
              <Link
                href={`/users/${u.user_id}`}
                className="flex min-h-12 items-center justify-between gap-4 px-4"
              >
                <span>{u.email}</span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-text">
                  View
                  <ChevronRightIcon />
                </span>
              </Link>
            </li>
          ))}
          {users.length === 20 && (
            <li className="px-4 py-3 text-xs text-text-muted">
              Showing the first 20. Type more of the email to narrow it down.
            </li>
          )}
        </ul>
      )}
    </>
  );
}
