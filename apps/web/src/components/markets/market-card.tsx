import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { Market } from "@/lib/markets/data";
import { formatCoins, formatPht } from "@/lib/markets/format";
import { toWin } from "@/lib/markets/odds";
import { Line, outcomeTone, sideLabel } from "./market-ui";

// One market as a phone card (canvas 01). Used by the market list and the
// watchlist. `action` sits beside the question (the watch star). Each outcome
// shows its American line, Llamado/Dehado and what 100 coins would win.

export async function MarketCard({
  market,
  action,
}: {
  market: Market;
  action?: ReactNode;
}) {
  const t = await getTranslations("Markets");
  const tm = await getTranslations("Market");
  const locale = await getLocale();

  return (
    <article className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-4">
      <div className="flex justify-between gap-3 text-xs text-text-muted">
        <span className="font-semibold tracking-wider uppercase">
          {market.category}
        </span>
        <span>{t("closes", { date: formatPht(market.closesAt, locale) })}</span>
      </div>
      <div className="flex items-start gap-2">
        <h2 className="flex-1 font-semibold leading-snug">
          <Link href={`/markets/${market.slug}`} className="text-text">
            {market.question}
          </Link>
        </h2>
        {action && <div className="-mt-2 -mr-2">{action}</div>}
      </div>
      <ul className="grid grid-cols-2 gap-2 text-sm">
        {market.outcomes.map((o) => {
          const tone = outcomeTone(market.type, o.position);
          const side = sideLabel(market.outcomes, o.position);
          return (
            <li
              key={o.position}
              className={`flex flex-col rounded-input border-[1.5px] px-3 py-2 ${tone.border} ${tone.tint}`}
            >
              <span className="flex justify-between gap-2 font-bold">
                <span>{o.label}</span>
                <Line odds={o.odds} />
              </span>
              <span className="text-xs text-text-secondary">
                {[
                  side ? tm(side) : null,
                  t("wins100", {
                    amount: formatCoins(toWin(100, o.odds), locale),
                  }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-text-muted">
        {t("source", { source: market.source })}
      </p>
    </article>
  );
}
