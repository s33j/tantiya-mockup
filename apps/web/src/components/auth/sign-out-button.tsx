"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { authErrorKey, type AuthErrorKey } from "@/lib/auth/errors";
import { useAuthRedirect } from "@/lib/auth/use-auth-redirect";
import { createClient } from "@tantiya/supabase/client";
import { FormError } from "./form-controls";

export function SignOutButton() {
  const t = useTranslations("Auth");
  const authRedirect = useAuthRedirect();
  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey>();

  async function signOut() {
    setPending(true);
    setErrorKey(undefined);
    // Local scope: signing out on a phone leaves other devices signed in.
    const { error } = await createClient().auth.signOut({ scope: "local" });

    if (error) {
      setErrorKey(authErrorKey(error));
      setPending(false);
      return;
    }

    authRedirect("/");
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className="min-h-11 self-start rounded-input border border-border-strong px-4 font-semibold disabled:opacity-60"
      >
        {t("signOut")}
      </button>
      <FormError errorKey={errorKey} />
    </div>
  );
}
