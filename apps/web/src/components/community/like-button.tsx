"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@tantiya/supabase/client";

// Like / unlike (post_likes; RLS lets approved members like as themselves).
export function LikeButton({
  postId,
  userId,
  liked,
  count,
  enabled,
}: {
  postId: number;
  userId: string;
  liked: boolean;
  count: number;
  enabled: boolean;
}) {
  const t = useTranslations("Community");
  const router = useRouter();
  const [state, setState] = useState({ liked, count });
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next = !state.liked;
    setPending(true);
    setState({ liked: next, count: state.count + (next ? 1 : -1) });
    const table = createClient().from("post_likes");
    const { error } = next
      ? await table.insert({ post_id: postId, user_id: userId })
      : await table.delete().eq("post_id", postId).eq("user_id", userId);
    setPending(false);
    if (error) setState(state);
    else router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!enabled || pending}
      aria-pressed={state.liked}
      aria-label={t("likesLabel", { count: state.count })}
      className="flex min-h-10 items-center gap-1.5 rounded-input px-2 text-text-secondary aria-pressed:text-accent-text disabled:cursor-default"
    >
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={state.liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
      </svg>
      <span className="tabular-nums">{state.count}</span>
    </button>
  );
}
