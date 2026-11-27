"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { authErrorKey, type AuthErrorKey } from "@/lib/auth/errors";
import { createClient } from "@tantiya/supabase/client";
import { FormError, FormNotice } from "./form-controls";

export function ResendVerification({ email }: { email: string }) {
  const t = useTranslations("Auth");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [errorKey, setErrorKey] = useState<AuthErrorKey>();

  async function resend() {
    setStatus("sending");
    setErrorKey(undefined);
    const { error } = await createClient().auth.resend({
      type: "signup",
      email,
    });
    setErrorKey(error ? authErrorKey(error) : undefined);
    setStatus(error ? "idle" : "sent");
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={resend}
        disabled={status === "sending"}
        className="min-h-11 self-start font-semibold text-accent-text disabled:opacity-60"
      >
        {t("resendVerification")}
      </button>
      {status === "sent" && <FormNotice>{t("verificationSent")}</FormNotice>}
      <FormError errorKey={errorKey} />
    </div>
  );
}
