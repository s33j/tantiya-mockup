"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { buttonClass } from "@/components/kyc/kyc-ui";
import { createClient } from "@tantiya/supabase/client";

// Report a post (mockup 3.08). Reports go to the staff moderation queue; the
// author isn't told who reported. One report per member per post.
export const REPORT_REASONS = [
  "spam",
  "harassment",
  "politics",
  "misleading",
  "personal_info",
  "other",
] as const;
type Reason = (typeof REPORT_REASONS)[number];

export function ReportButton({
  postId,
  userId,
}: {
  postId: number;
  userId: string;
}) {
  const t = useTranslations("Community");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<
    "edit" | "sending" | "done" | "error" | "already"
  >("edit");

  async function send() {
    if (!reason) return;
    setState("sending");
    const { error } = await createClient()
      .from("post_reports")
      .insert({
        post_id: postId,
        reporter_id: userId,
        reason,
        note: note.trim() || null,
      });
    setState(!error ? "done" : error.code === "23505" ? "already" : "error");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("report")}
        className="flex min-h-10 min-w-10 items-center justify-center rounded-input text-text-secondary"
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
        </svg>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-bg/70 md:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`report-${postId}`}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            className="flex w-full max-w-md flex-col gap-3 rounded-t-[20px] border border-border bg-surface p-5 text-left text-text md:rounded-card"
          >
            <h2 id={`report-${postId}`} className="font-bold">
              {t("reportTitle")}
            </h2>
            {state === "done" || state === "already" ? (
              <>
                <p className="text-sm text-text-secondary">
                  {state === "done" ? t("reportDone") : t("reportAlready")}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={buttonClass.primary}
                >
                  {t("done")}
                </button>
              </>
            ) : (
              <>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-sm text-text-secondary">
                    {t("reportWhy")}
                  </legend>
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r}
                      className="flex min-h-11 items-center gap-3 rounded-input border border-border px-3 text-sm"
                    >
                      <input
                        type="radio"
                        name={`reason-${postId}`}
                        checked={reason === r}
                        onChange={() => setReason(r)}
                        className="size-4 accent-accent"
                      />
                      {t(`reasons.${r}`)}
                    </label>
                  ))}
                </fieldset>
                <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
                  {t("reportNote")}
                  <textarea
                    value={note}
                    maxLength={300}
                    rows={2}
                    onChange={(e) => setNote(e.target.value)}
                    className="rounded-input border border-border-strong bg-surface-sunken p-2.5 text-base text-text"
                  />
                </label>
                {state === "error" && (
                  <p role="alert" className="text-sm text-closing-text">
                    {t("error")}
                  </p>
                )}
                <button
                  type="button"
                  onClick={send}
                  disabled={!reason || state === "sending"}
                  className={buttonClass.primary}
                >
                  {t("reportSend")}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={buttonClass.outline}
                >
                  {t("cancel")}
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
