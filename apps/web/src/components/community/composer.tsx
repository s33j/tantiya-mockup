"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { buttonClass } from "@/components/kyc/kyc-ui";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@tantiya/supabase/client";

const MAX = 500; // posts.body, migration 20261127000300
const ERRORS = [
  "cannot_post",
  "needs_display_name",
  "invalid_post",
  "market_not_found",
] as const;

// New post (mockup 3.03 composer, 3.04 attach a market). If the author has an
// open bet in the attached market, its side is shown on the post.
export function Composer({
  markets,
  initialMarketId,
}: {
  markets: { id: number; question: string }[];
  initialMarketId: number | null;
}) {
  const t = useTranslations("Community");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [marketId, setMarketId] = useState<number | null>(initialMarketId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<
    (typeof ERRORS)[number] | "generic" | null
  >(null);

  async function post() {
    setPending(true);
    setError(null);
    const { data, error: e } = await createClient().rpc("create_post", {
      p_body: body,
      p_market_id: marketId,
    });
    if (e) {
      setPending(false);
      setError(
        (ERRORS as readonly string[]).includes(e.message)
          ? (e.message as (typeof ERRORS)[number])
          : "generic",
      );
      return;
    }
    router.push(`/community/${data as number}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        post();
      }}
      className="flex flex-col gap-3"
    >
      <label htmlFor="post-body" className="sr-only">
        {t("postText")}
      </label>
      <textarea
        id="post-body"
        value={body}
        maxLength={MAX}
        rows={7}
        placeholder={t("placeholder")}
        onChange={(e) => setBody(e.target.value)}
        className="rounded-input border border-border-strong bg-surface-sunken p-3 text-text"
      />
      <span className="text-xs text-text-muted tabular-nums">
        {body.length} / {MAX}
      </span>
      <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
        {t("attachMarket")}
        <select
          value={marketId ?? ""}
          onChange={(e) =>
            setMarketId(e.target.value ? Number(e.target.value) : null)
          }
          className="min-h-11 rounded-input border border-border-strong bg-surface-sunken px-3 text-text"
        >
          <option value="">{t("noMarket")}</option>
          {markets.map((m) => (
            <option key={m.id} value={m.id}>
              {m.question}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-text-muted">{t("forecastNote")}</p>
      {error && (
        <p role="alert" className="text-sm text-closing-text">
          {t(error === "generic" ? "error" : `postErrors.${error}`)}
        </p>
      )}
      <button
        type="submit"
        disabled={!body.trim() || pending}
        className={buttonClass.primary}
      >
        {pending ? t("posting") : t("post")}
      </button>
    </form>
  );
}
