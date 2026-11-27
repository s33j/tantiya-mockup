"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { buttonClass } from "@/components/kyc/kyc-ui";
import { Link } from "@/i18n/navigation";
import type { Bettor, Market } from "@/lib/markets/data";
import {
  formatAmerican,
  formatCoins,
  formatDecimal,
  formatPercent,
  formatPht,
} from "@/lib/markets/format";
import { decimalOdds, impliedChance, toWin } from "@/lib/markets/odds";
import { createClient } from "@tantiya/supabase/client";
import { outcomeTone, sideLabel } from "./market-ui";

// Outcome picker and bet slip for one market: mockup 2.03/2.04 (picking), 2.05
// (bet slip), 2.06 (line moved) and the right pane on desktop. On phones the
// slip opens as a bottom sheet; from md up it sits beside the market.
//
// Bets are real: public.place_bet checks the account, limits, close time and
// balance, moves the stake to In play through the coin ledger, then moves the
// line. If the line changed since this page loaded, nothing is placed and the
// slip shows "Line moved" with Accept and Cancel.

type Phase =
  | { kind: "edit" }
  | { kind: "moved"; from: number; to: number }
  | { kind: "placed"; stake: number; odds: number; label: string };

type PlaceResult =
  | {
      status: "placed";
      odds: number;
      stake_minor: number;
      to_win_minor: number;
    }
  | { status: "line_moved"; odds: number; other_odds: number };

// Error codes raised by public.place_bet; anything else shows "generic".
const ERRORS = [
  "not_signed_in",
  "not_approved",
  "excluded",
  "invalid_stake",
  "outcome_not_found",
  "market_closed",
  "not_two_outcomes",
  "stake_limit",
  "stake_too_small",
  "insufficient_coins",
] as const;
type ErrorKey = (typeof ERRORS)[number] | "generic";

const STAKE = /^\d{1,9}$/;

export function MarketBetting({
  market,
  bettor,
  header,
  details,
}: {
  market: Market;
  bettor: Bettor;
  header: ReactNode;
  details: ReactNode;
}) {
  const t = useTranslations("BetSlip");
  const tm = useTranslations("Market");
  const locale = useLocale();
  const router = useRouter();
  const coins = (n: number) => formatCoins(n, locale);

  // Lines as the bettor last saw them. Null = the lines from the server.
  const [seen, setSeen] = useState<number[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [stakeText, setStakeText] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "edit" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);

  const available = bettor.kind === "approved" ? bettor.available : 0;
  const outcomes = market.outcomes.map((o, i) => ({
    ...o,
    odds: seen ? seen[i] : o.odds,
  }));
  const pick = selected === null ? null : outcomes[selected];
  const stake = STAKE.test(stakeText) ? Number(stakeText) : null;

  function choose(index: number, openSheet: boolean) {
    setSelected(index);
    setPhase({ kind: "edit" });
    setError(null);
    if (openSheet) setSheetOpen(true);
  }

  async function submit(expectedOdds: number) {
    if (!pick || !stake || selected === null) return;
    setPending(true);
    setError(null);
    const { data, error: rpcError } = await createClient().rpc("place_bet", {
      p_outcome_id: pick.id,
      p_stake_coins: stake,
      p_expected_odds: expectedOdds,
    });
    setPending(false);

    if (rpcError) {
      const key = (ERRORS as readonly string[]).includes(rpcError.message)
        ? (rpcError.message as ErrorKey)
        : "generic";
      setError(key);
      return;
    }
    const result = data as PlaceResult;
    if (result.status === "line_moved") {
      const next = outcomes.map((o, i) =>
        i === selected ? result.odds : result.other_odds,
      );
      setSeen(next);
      setPhase({ kind: "moved", from: expectedOdds, to: result.odds });
      return;
    }
    setPhase({
      kind: "placed",
      stake,
      odds: result.odds,
      label: pick.label,
    });
    setStakeText("");
    setSeen(null);
    // New balances and the moved line come from the server.
    router.refresh();
  }

  const side = (position: number) => {
    const s = sideLabel(outcomes, position);
    return s ? tm(s) : null;
  };
  const oddsDetail = (odds: number) =>
    `${formatAmerican(odds)} · ${formatDecimal(decimalOdds(odds), locale)} · ${formatPercent(impliedChance(odds))}`;

  // --- lines and pickers -----------------------------------------------------

  const lines = (
    <div className="-mt-2 flex flex-col gap-1">
      <p className="flex items-baseline gap-4">
        {outcomes.map((o) => (
          <span
            key={o.position}
            className={`text-2xl font-bold tabular-nums ${outcomeTone(market.type, o.position).text}`}
          >
            {formatAmerican(o.odds)}
            <span className="text-sm font-normal text-text-secondary">
              {" "}
              {o.label}
            </span>
          </span>
        ))}
      </p>
      <p className="text-xs text-text-muted">
        {t("openedAt", {
          lines: market.outcomes
            .map((o) => formatAmerican(o.openingOdds))
            .join(" / "),
        })}
      </p>
    </div>
  );

  const outcomeButton = (index: number, openSheet: boolean) => {
    const o = outcomes[index];
    const tone = outcomeTone(market.type, o.position);
    const on = selected === index;
    return (
      <button
        key={o.position}
        type="button"
        aria-pressed={openSheet ? undefined : on}
        onClick={() => choose(index, openSheet)}
        className={`flex flex-1 flex-col rounded-card border-[1.5px] px-3.5 py-2.5 text-left text-text ${tone.border} ${openSheet || on ? tone.tint : ""}`}
      >
        <span className="flex w-full justify-between font-bold">
          <span>{o.label}</span>
          <span className="tabular-nums">{formatAmerican(o.odds)}</span>
        </span>
        <span className="text-xs text-text-secondary">
          {[
            side(o.position),
            t("wins100", { amount: coins(toWin(100, o.odds)) }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </button>
    );
  };

  const phoneBar = (
    <div className="sticky bottom-20 z-10 -mx-4 border-t border-border bg-surface-sunken px-4 py-3 md:hidden">
      <p className="mb-1.5 text-xs text-text-muted">
        {t("closesAt", { date: formatPht(market.closesAt, locale) })}
      </p>
      <div className="flex gap-3">
        {outcomes.map((_, i) => outcomeButton(i, true))}
      </div>
    </div>
  );

  // --- bet slip ----------------------------------------------------------------

  const row = (label: string, value: ReactNode, strong = false) => (
    <div className="flex gap-3 text-sm">
      <dt className="w-36 shrink-0 text-text-secondary">{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-bold" : ""}`}>{value}</dd>
    </div>
  );

  const errorLine = error && (
    <p role="alert" className="text-sm text-closing-text">
      {t(`errors.${error}`)}
    </p>
  );

  let action: ReactNode;
  if (bettor.kind === "guest") {
    action = (
      <Link
        href={`/sign-in?next=/markets/${market.slug}`}
        className={buttonClass.primary}
      >
        {t("signIn")}
      </Link>
    );
  } else if (bettor.kind === "notApproved") {
    action = (
      <p className="flex flex-col gap-1 text-sm text-text-secondary">
        {t("notApproved")}
        <Link href="/account" className="font-semibold text-accent-text">
          {t("checkAccount")}
        </Link>
      </p>
    );
  } else {
    const invalid = stakeText !== "" && !stake;
    const tooMuch = stake !== null && stake > available;
    action = (
      <>
        {invalid && (
          <p className="text-sm text-closing-text">{t("wholeCoins")}</p>
        )}
        <button
          type="button"
          disabled={!pick || !stake || tooMuch || pending}
          onClick={() => pick && submit(pick.odds)}
          className={`${buttonClass.primary} min-h-12 text-base`}
        >
          {pending
            ? t("placing")
            : !pick
              ? t("pick")
              : !stake
                ? t("enterStake")
                : tooMuch
                  ? t("tooMuch")
                  : t("place", { stake: coins(stake), label: pick.label })}
        </button>
      </>
    );
  }

  let slipBody: ReactNode;
  if (phase.kind === "placed") {
    const win = toWin(phase.stake, phase.odds);
    slipBody = (
      <div className="flex flex-col gap-3" role="status">
        <h3 className="font-semibold">{t("placedTitle")}</h3>
        <dl className="flex flex-col gap-1.5">
          {row(t("yourPick"), `${phase.label} ${formatAmerican(phase.odds)}`)}
          {row(t("stake"), `${coins(phase.stake)} ${t("coins")}`)}
          {row(t("toWin"), `${coins(win)} ${t("coins")}`, true)}
          {row(t("totalReturn"), `${coins(phase.stake + win)} ${t("coins")}`)}
        </dl>
        <p className="text-xs text-text-secondary">{t("placedNote")}</p>
        <Link href="/bets" className={buttonClass.outline}>
          {t("viewBets")}
        </Link>
        <button
          type="button"
          onClick={() => setPhase({ kind: "edit" })}
          className={buttonClass.text}
        >
          {t("another")}
        </button>
      </div>
    );
  } else if (phase.kind === "moved" && pick && stake) {
    const before = toWin(stake, phase.from);
    const now = toWin(stake, phase.to);
    slipBody = (
      <>
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-card border border-closing bg-closing/10 p-3 text-sm"
        >
          <strong>{t("movedTitle")}</strong>
          <span className="text-text-secondary">
            {t("movedBody", { label: pick.label })}
          </span>
          <table className="w-full text-left tabular-nums">
            <thead className="text-xs text-text-muted">
              <tr>
                <th className="font-normal" />
                <th className="font-normal">{t("before")}</th>
                <th className="font-normal">{t("now")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="py-0.5 font-normal">{t("odds")}</th>
                <td>{formatAmerican(phase.from)}</td>
                <td className="font-bold">{formatAmerican(phase.to)}</td>
              </tr>
              <tr>
                <th className="py-0.5 font-normal">{t("toWin")}</th>
                <td>{coins(before)}</td>
                <td className="font-bold">{coins(now)}</td>
              </tr>
              <tr>
                <th className="py-0.5 font-normal">{t("totalReturn")}</th>
                <td>{coins(stake + before)}</td>
                <td className="font-bold">{coins(stake + now)}</td>
              </tr>
            </tbody>
          </table>
          <span className="text-xs text-text-muted">
            {t("movedStake", { stake: coins(stake) })}
          </span>
        </div>
        {errorLine}
        <button
          type="button"
          disabled={pending}
          onClick={() => submit(phase.to)}
          className={`${buttonClass.primary} min-h-12 text-base`}
        >
          {pending ? t("placing") : t("accept")}
        </button>
        <button
          type="button"
          onClick={() => setPhase({ kind: "edit" })}
          className={buttonClass.outline}
        >
          {t("cancel")}
        </button>
      </>
    );
  } else {
    const win = pick && stake ? toWin(stake, pick.odds) : null;
    slipBody = (
      <>
        <div className="grid grid-cols-2 gap-2">
          {outcomes.map((_, i) => outcomeButton(i, false))}
        </div>
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          {t("stake")}
          <span className="flex min-h-14 items-center gap-2.5 rounded-input border-[1.5px] border-accent-text bg-surface-sunken px-4 focus-within:outline-2 focus-within:outline-accent-text">
            <input
              inputMode="numeric"
              autoComplete="off"
              placeholder={t("amount")}
              value={stakeText}
              onChange={(e) => {
                setStakeText(e.target.value.trim());
                setError(null);
              }}
              className="w-full bg-transparent text-xl font-bold text-text outline-none placeholder:font-normal placeholder:text-text-muted"
            />
            <span className="text-text-muted">{t("coins")}</span>
          </span>
        </label>
        <div className="flex gap-2">
          {[50, 100, 500].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStakeText(String((stake ?? 0) + n))}
              className="min-h-11 flex-1 rounded-input border border-border bg-surface-sunken text-sm text-text"
            >
              {t("add", { amount: n })}
            </button>
          ))}
        </div>
        <dl className="flex flex-col gap-1.5">
          {row(
            t("toWin"),
            win !== null ? `${coins(win)} ${t("coins")}` : "—",
            true,
          )}
          {row(
            t("totalReturn"),
            win !== null && stake ? `${coins(stake + win)} ${t("coins")}` : "—",
          )}
          {row(t("odds"), pick ? oddsDetail(pick.odds) : "—")}
          {row(t("closes"), formatPht(market.closesAt, locale))}
          {bettor.kind === "approved" &&
            row(
              t("balanceAfter"),
              stake ? coins(available - stake) : coins(available),
            )}
        </dl>
        <p className="rounded-input bg-surface-sunken p-3 text-xs text-text-secondary">
          {t("fixedNote")}
        </p>
        {errorLine}
        {action}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1fr)_340px] md:items-start md:gap-8">
      <div className="flex min-w-0 flex-col gap-5">
        {header}
        {lines}
        {details}
        {phoneBar}
      </div>

      <div
        className={
          sheetOpen
            ? "fixed inset-0 z-40 flex items-end bg-bg/70 md:static md:z-auto md:block md:bg-transparent"
            : "hidden md:block"
        }
        onClick={(e) => {
          if (e.target === e.currentTarget) setSheetOpen(false);
        }}
      >
        <section
          aria-labelledby="bet-slip-title"
          role={sheetOpen ? "dialog" : undefined}
          aria-modal={sheetOpen || undefined}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSheetOpen(false);
          }}
          className="flex max-h-[90dvh] w-full flex-col gap-3.5 overflow-y-auto rounded-t-[20px] border-t border-border bg-surface px-5 pt-2.5 pb-6 md:sticky md:top-6 md:max-h-none md:rounded-card md:border md:p-5"
        >
          <span
            aria-hidden="true"
            className="h-1 w-10 self-center rounded-full bg-border-strong md:hidden"
          />
          <div className="flex items-center">
            <h2 id="bet-slip-title" className="font-bold">
              {phase.kind === "moved" ? t("movedTitle") : t("title")}
            </h2>
            <button
              type="button"
              aria-label={t("close")}
              onClick={() => setSheetOpen(false)}
              className="ml-auto flex size-11 items-center justify-center text-text md:hidden"
            >
              <svg
                aria-hidden="true"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          {slipBody}
        </section>
      </div>
    </div>
  );
}
