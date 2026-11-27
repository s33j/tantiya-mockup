import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { buttonClass } from "@/components/kyc/kyc-ui";
import { MarketCard } from "@/components/markets/market-card";
import { WatchButton, WatchedMarkets } from "@/components/markets/watch-button";
import { Link } from "@/i18n/navigation";
import { getBettor, listOpenMarkets } from "@/lib/markets/data";

// Watchlist demo (approved 16 Nov 2026; not in the proposal's feature list).
// Starred markets are kept in this browser only. Signing in is required
// (proxy.ts protects /watchlist).

async function WatchlistContent() {
  const t = await getTranslations("Watchlist");
  const [markets, bettor] = await Promise.all([
    listOpenMarkets(await getLocale()),
    getBettor(),
  ]);
  if (bettor.kind === "guest") return null;
  const userId = bettor.userId;

  return (
    <WatchedMarkets
      userId={userId}
      cards={markets.map((m) => ({
        slug: m.slug,
        card: (
          <MarketCard
            market={m}
            action={
              <WatchButton
                userId={userId}
                slug={m.slug}
                addLabel={t("add")}
                removeLabel={t("remove")}
              />
            }
          />
        ),
      }))}
      empty={
        <div className="flex flex-col gap-3">
          <p className="text-text-secondary">{t("empty")}</p>
          <Link href="/" className={`${buttonClass.outline} self-start`}>
            {t("browse")}
          </Link>
        </div>
      }
    />
  );
}

export default async function WatchlistPage() {
  const t = await getTranslations("Watchlist");
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <p className="text-xs text-text-muted">{t("demoNote")}</p>
      <Suspense>
        <WatchlistContent />
      </Suspense>
    </div>
  );
}
