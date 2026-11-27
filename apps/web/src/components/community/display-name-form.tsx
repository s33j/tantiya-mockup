"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass } from "@/components/kyc/kyc-ui";
import { createClient } from "@tantiya/supabase/client";

const ERRORS = ["invalid_name", "name_taken"] as const;

// Display name for Community (public.set_display_name): 2–40 characters,
// unique. KYC names are never shown.
export function DisplayNameForm({ current }: { current: string | null }) {
  const t = useTranslations("Community");
  const router = useRouter();
  const [name, setName] = useState(current ?? "");
  const [state, setState] = useState<"edit" | "saving" | "saved">("edit");
  const [error, setError] = useState<
    (typeof ERRORS)[number] | "generic" | null
  >(null);

  async function save() {
    setState("saving");
    setError(null);
    const { error: e } = await createClient().rpc("set_display_name", {
      p_name: name,
    });
    if (e) {
      setState("edit");
      setError(
        (ERRORS as readonly string[]).includes(e.message)
          ? (e.message as (typeof ERRORS)[number])
          : "generic",
      );
      return;
    }
    setState("saved");
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor="display-name" className="text-sm text-text-secondary">
        {t("displayName")}
      </label>
      <input
        id="display-name"
        value={name}
        maxLength={40}
        autoComplete="nickname"
        onChange={(e) => {
          setName(e.target.value);
          setState("edit");
        }}
        className="min-h-11 rounded-input border border-border-strong bg-surface-sunken px-3 text-text"
      />
      <p className="text-xs text-text-muted">{t("displayNameHelp")}</p>
      {error && (
        <p role="alert" className="text-sm text-closing-text">
          {t(error === "generic" ? "error" : `nameErrors.${error}`)}
        </p>
      )}
      <button
        type="submit"
        disabled={name.trim().length < 2 || state === "saving"}
        className={`${buttonClass.outline} self-start`}
      >
        {state === "saved" ? t("saved") : t("saveName")}
      </button>
    </form>
  );
}
