import { getLocale, getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/kyc/kyc-ui";
import { Link } from "@/i18n/navigation";
import type { PlacedBet } from "@/lib/markets/data";
import { formatAmerican, formatCoins, formatPht } from "@/lib/markets/format";

// My bets, Open tab (mockup 2.09). Bets come from the database; odds, stake and
// to-win were fixed when each bet was placed. Settlement isn't built yet, so
// the Settled tab stays empty.
export async function MyBets({ bets }: { bets: PlacedBet[] }) {
  const t = await getTranslations("Bets");
  const locale = await getLocale();
  const coins = (n: number) => formatCoins(n, locale);
  const open = bets.filter((b) => b.status === "open");

  return (
    <div className="flex flex-col gap-4">
      <nav
        aria-label={t("sections")}
        className="flex gap-6 border-b border-border"
      >
        <span
          aria-current="page"
          className="border-b-2 border-accent py-2 font-semibold"
        >
          {t("open", { count: open.length })}
        </span>
        <span className="py-2 text-text-muted">{t("settled")}</span>
      </nav>

      {open.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-text-secondary">{t("empty")}</p>
          <Link href="/" className={`${buttonClass.outline} self-start`}>
            {t("browse")}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {open.map((bet) => (
            <li
              key={bet.id}
              className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
            >
              <Link
                href={`/markets/${bet.marketSlug}`}
                className="font-semibold leading-snug text-text"
              >
                {bet.question}
              </Link>
              <p
                className={`text-sm font-semibold ${bet.outcomePosition === 0 ? "text-yes-text" : "text-no-text"}`}
              >
                {bet.outcomeLabel}{" "}
                <span className="tabular-nums">{formatAmerican(bet.odds)}</span>
              </p>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-text-muted">{t("stake")}</dt>
                  <dd className="font-semibold tabular-nums">
                    {coins(bet.stake)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">{t("toWin")}</dt>
                  <dd className="font-semibold tabular-nums">
                    {coins(bet.toWin)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">{t("totalReturn")}</dt>
                  <dd className="font-semibold tabular-nums">
                    {coins(bet.stake + bet.toWin)}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-text-muted">
                {t("placed", { date: formatPht(bet.placedAt, locale) })} ·{" "}
                {t("closes", { date: formatPht(bet.closesAt, locale) })}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-text-muted">{t("settledNote")}</p>
    </div>
  );
}
