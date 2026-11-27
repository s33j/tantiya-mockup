"use client";

import { createClient } from "@tantiya/supabase/client";
import { useState } from "react";
import { authErrorMessage } from "@/lib/auth";
import { paths, reloadTo } from "@/lib/paths";
import { SignOutIcon } from "./icons";

type Props = { variant: "button" | "link"; label: string };

export function SignOutButton({ variant, label }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function signOut() {
    setPending(true);
    setError(undefined);
    // Local scope: other devices stay signed in.
    const { error } = await createClient().auth.signOut({ scope: "local" });
    if (error) {
      setError(authErrorMessage(error));
      setPending(false);
      return;
    }
    reloadTo(paths.signIn);
  }

  return (
    <span className="inline-flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className={
          variant === "button"
            ? "inline-flex min-h-10 items-center gap-1.5 rounded-input border border-border-strong px-3 font-semibold disabled:opacity-60"
            : "min-h-11 text-sm font-semibold text-accent-text disabled:opacity-60"
        }
      >
        {variant === "button" && <SignOutIcon size={18} />}
        {label}
      </button>
      {error && (
        <span role="alert" className="text-xs text-closing-text">
          {error}
        </span>
      )}
    </span>
  );
}
