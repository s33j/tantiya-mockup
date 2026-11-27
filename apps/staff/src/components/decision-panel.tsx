"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@tantiya/supabase/client";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { reasonCodes } from "@/lib/kyc";
import { FormError } from "./forms";
import { CheckIcon, ShieldCheckIcon } from "./icons";

// Same limits as the database (kyc_review_notes, kyc_staff_decide).
const NOTE_MAX = 2000;

const rejectSchema = z
  .object({
    reason: z.enum(
      reasonCodes.map((r) => r.code) as [string, ...string[]],
      "Choose a reason to reject.",
    ),
    note: z
      .string()
      .trim()
      .max(
        NOTE_MAX,
        `Keep the note under ${NOTE_MAX.toLocaleString("en-US")} characters.`,
      ),
  })
  .refine((v) => v.reason !== "other" || v.note.length > 0, {
    path: ["note"],
    message: "Add a note to explain the reason Other.",
  });

type Decision = {
  decision: "approved" | "rejected";
  reason?: string;
  note?: string;
};

function decisionError(error: { code?: string; message: string }) {
  if (error.message.includes("own application"))
    return "You can't decide your own application.";
  if (error.code === "42501")
    return "Your session needs two-step sign-in again. Reload the page.";
  if (error.message.includes("not waiting for a decision"))
    return "This application was already decided. Reload the page.";
  return "The decision wasn't saved. Try again.";
}

// S5 decision panel. Approving pays the starting grant; rejecting needs a
// reason. Both write an audit entry (database side).
export function DecisionPanel({ applicationId }: { applicationId: number }) {
  const router = useRouter();
  const decide = useMutation({
    mutationFn: async ({ decision, reason, note }: Decision) => {
      const { error } = await createClient().rpc("kyc_staff_decide", {
        p_application_id: applicationId,
        p_decision: decision,
        p_reason_code: reason ?? null,
        p_internal_note: note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => router.refresh(),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<z.input<typeof rejectSchema>>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { note: "" },
  });
  const reason = useWatch({ control, name: "reason" });

  return (
    <div className="flex flex-col gap-4">
      <span className="inline-flex items-center gap-1.5 text-sm text-open-text">
        <ShieldCheckIcon size={16} />
        Signed in with two-step sign-in
      </span>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={decide.isPending}
          onClick={() => decide.mutate({ decision: "approved" })}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-input bg-accent px-4 font-semibold text-bg disabled:opacity-60"
        >
          <CheckIcon size={18} />
          Approve account
        </button>
        <p className="text-xs text-text-muted">
          Adds the 1,000 starting coins (proposed) and writes an audit entry.
        </p>
      </div>

      <div className="border-t border-border" />

      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(({ reason, note }) =>
          decide.mutate({ decision: "rejected", reason, note }),
        )}
      >
        <fieldset
          className="flex flex-col gap-2"
          aria-describedby={errors.reason ? "reason-error" : undefined}
        >
          <legend className="mb-2 font-semibold">
            Reject: choose a reason
          </legend>
          {reasonCodes.map((r) => (
            <label
              key={r.code}
              className="flex min-h-8 items-start gap-3 text-sm"
            >
              <input
                type="radio"
                value={r.code}
                className="mt-0.5 size-4.5 shrink-0 accent-accent"
                {...register("reason")}
              />
              <span className="flex flex-col">
                <span>{r.label}</span>
                <span className="text-xs text-text-muted">
                  <code>{r.code}</code>
                  {"hint" in r && ` · ${r.hint}`}
                </span>
              </span>
            </label>
          ))}
          {errors.reason && (
            <p id="reason-error" className="text-sm text-closing-text">
              {errors.reason.message}
            </p>
          )}
        </fieldset>

        <div className="flex flex-col gap-1">
          <label htmlFor="note" className="text-sm font-semibold">
            Internal note{" "}
            <span className="font-normal text-text-muted">
              ({reason === "other" ? "required" : "optional"}, applicant never
              sees it)
            </span>
          </label>
          <textarea
            id="note"
            rows={3}
            maxLength={NOTE_MAX}
            aria-invalid={errors.note ? true : undefined}
            aria-describedby={errors.note ? "note-error" : undefined}
            className="resize-y rounded-input border border-border-strong bg-surface-sunken px-3 py-2 text-sm text-text"
            {...register("note")}
          />
          {errors.note && (
            <p id="note-error" className="text-sm text-closing-text">
              {errors.note.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={decide.isPending}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-input border border-border-strong px-4 font-semibold disabled:opacity-60"
        >
          Reject application
        </button>
      </form>

      <FormError
        message={decide.error ? decisionError(decide.error) : undefined}
      />
    </div>
  );
}
