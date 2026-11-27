"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass } from "@/components/kyc/kyc-ui";
import { createClient } from "@tantiya/supabase/client";

const MAX = 300; // post_comments.body, migration 20261127000300

export function CommentForm({
  postId,
  userId,
}: {
  postId: number;
  userId: string;
}) {
  const t = useTranslations("Community");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setPending(true);
    setError(false);
    const { error: e } = await createClient()
      .from("post_comments")
      .insert({ post_id: postId, author_id: userId, body: text });
    setPending(false);
    if (e) {
      setError(true);
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="flex flex-col gap-2"
    >
      <label
        htmlFor={`comment-${postId}`}
        className="text-sm text-text-secondary"
      >
        {t("addComment")}
      </label>
      <textarea
        id={`comment-${postId}`}
        value={body}
        maxLength={MAX}
        rows={2}
        onChange={(e) => setBody(e.target.value)}
        className="rounded-input border border-border-strong bg-surface-sunken p-2.5 text-text"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-text-muted tabular-nums">
          {body.length} / {MAX}
        </span>
        <button
          type="submit"
          disabled={!body.trim() || pending}
          className={buttonClass.primary}
        >
          {t("send")}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-closing-text">
          {t("error")}
        </p>
      )}
    </form>
  );
}
