"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@tantiya/supabase/client";
import { useRouter } from "next/navigation";
import { FormError } from "./forms";

// Hide or keep a reported post (public.staff_moderate_post). Either closes the
// open reports on it; both write audit entries (database side).
export function ModerationActions({ postId }: { postId: number }) {
  const router = useRouter();
  const act = useMutation({
    mutationFn: async (action: "hide" | "keep") => {
      const { error } = await createClient().rpc("staff_moderate_post", {
        p_post_id: postId,
        p_action: action,
      });
      if (error) throw error;
    },
    onSuccess: () => router.refresh(),
  });
  const error = act.error as { code?: string } | null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={act.isPending}
          onClick={() => act.mutate("hide")}
          className="inline-flex min-h-11 items-center justify-center rounded-input border border-closing px-4 font-semibold text-closing-text disabled:opacity-60"
        >
          Hide post
        </button>
        <button
          type="button"
          disabled={act.isPending}
          onClick={() => act.mutate("keep")}
          className="inline-flex min-h-11 items-center justify-center rounded-input border border-border-strong px-4 font-semibold text-text disabled:opacity-60"
        >
          Keep post
        </button>
      </div>
      <FormError
        message={
          error
            ? error.code === "42501"
              ? "Your session needs two-step sign-in again, or you aren't a moderator. Reload the page."
              : "That didn't save. Reload the page and try again."
            : undefined
        }
      />
    </div>
  );
}
