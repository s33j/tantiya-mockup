"use client";

import { useLocale, useTranslations } from "next-intl";
import { buttonClass } from "@/components/kyc/kyc-ui";
import { formatCoins, formatPht } from "@/lib/markets/format";

// Wallet (canvas 06, page 2): balances and history from the coin ledger. A bet
// moves its stake from Available to In play (public.place_bet).

export type LedgerItem = {
  id: number;
  kind: string;
  amount: number;
  at: string;
};

const KINDS = [
  "starting_grant",
  "top_up",
  "bet",
  "settlement",
  "void_refund",
  "withdrawal_request",
  "withdrawal_paid",
  "withdrawal_rejected",
] as const;

export function WalletView({
  available,
  inPlay,
  pending,
  history,
}: {
  available: number;
  inPlay: number;
  pending: number;
  history: LedgerItem[];
}) {
  const t = useTranslations("Wallet");
  const locale = useLocale();
  const coins = (n: number) => formatCoins(n, locale);
  const items = history.map((h) => ({
    key: `l${h.id}`,
    label: (KINDS as readonly string[]).includes(h.kind)
      ? t(`kinds.${h.kind as (typeof KINDS)[number]}`)
      : h.kind,
    amount: h.amount,
    at: h.at,
  }));

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 rounded-input border border-dashed border-border-strong px-3 py-2 text-sm font-semibold text-closing-text">
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16.5v.01" />
        </svg>
        {t("simulation")}
      </p>
      <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
        <p className="text-sm text-text-secondary">{t("available")}</p>
        <p className="text-xl font-bold">
          {coins(available)}{" "}
          <span className="text-base font-normal text-text-secondary">
            {t("coins")}
          </span>
        </p>
        <dl className="grid grid-cols-2 gap-2">
          <div>
            <dt className="text-sm text-text-secondary">{t("inPlay")}</dt>
            <dd className="font-semibold">{coins(inPlay)}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">{t("pending")}</dt>
            <dd className="font-semibold">{coins(pending)}</dd>
          </div>
        </dl>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" disabled className={buttonClass.primary}>
            {t("topUp")}
          </button>
          <button
            type="button"
            disabled
            className={`${buttonClass.outline} opacity-60`}
          >
            {t("withdraw")}
          </button>
        </div>
        <p className="text-xs text-text-muted">{t("notYet")}</p>
      </section>

      <h2 className="font-semibold">{t("history")}</h2>
      {items.length === 0 ? (
        <p className="text-text-secondary">{t("empty")}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-3 border-b border-border py-2.5"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold">
                  {item.label}
                </span>
                <span className="text-xs text-text-muted">
                  {formatPht(item.at, locale)}
                </span>
              </div>
              <span
                className={`ml-auto shrink-0 font-bold ${item.amount > 0 ? "text-open-text" : "text-text"}`}
              >
                {item.amount > 0 ? "+" : "−"}
                {coins(Math.abs(item.amount))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
