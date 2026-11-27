import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MarketDiscussion } from "@/components/community/market-discussion";
import { MarketBetting } from "@/components/markets/market-betting";
import { OpenPill } from "@/components/markets/market-ui";
import { WatchButton } from "@/components/markets/watch-button";
import { Link } from "@/i18n/navigation";
import { getBettor, getMarket, type Market } from "@/lib/markets/data";
import { formatPht } from "@/lib/markets/format";

// Market page (Gantt Task 15, updated for American lines Nov 27, 2026): mockup
// 2.03 (Yes/No) and 2.04 (over/under) on phones, two panes with the bet slip on
// the right from md up. Leads with the current lines, then rules, source and
// close time (proposal, Features > Markets), and the Community discussion. Pool, bettor count, side bets and
// the line history chart are not in this slice.

async function Header({
  market,
  userId,
}: {
  market: Market;
  userId: string | null;
}) {
  const t = await getTranslations("Market");
  const tw = await getTranslations("Watchlist");
  const locale = await getLocale();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-accent-text">
          ← {t("back")}
        </Link>
        {userId && (
          <WatchButton
            userId={userId}
            slug={market.slug}
            addLabel={tw("add")}
            removeLabel={tw("remove")}
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
        <OpenPill />
        <span>
          {t("closesLine", {
            category: market.category,
            date: formatPht(market.closesAt, locale),
          })}
        </span>
      </div>
      <h1 className="text-lg leading-snug font-semibold md:text-xl">
        {market.question}
      </h1>
    </div>
  );
}

async function Rules({ market }: { market: Market }) {
  const t = await getTranslations("Market");
  return (
    <section className="flex flex-col gap-1.5 rounded-card border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold">{t("howResolves")}</h2>
      <p className="text-sm text-text-secondary">{market.rules}</p>
      <p className="text-xs text-text-muted">
        {t("source", { source: market.source })}
      </p>
    </section>
  );
}

async function MarketDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const [market, bettor, messages] = await Promise.all([
    getMarket(slug, locale),
    getBettor(),
    getMessages(),
  ]);
  if (!market) notFound();

  return (
    <NextIntlClientProvider
      messages={{
        Market: messages.Market,
        BetSlip: messages.BetSlip,
        Community: messages.Community,
      }}
    >
      <MarketBetting
        market={market}
        bettor={bettor}
        header={
          <Header
            market={market}
            userId={bettor.kind === "guest" ? null : bettor.userId}
          />
        }
        details={
          <>
            <Rules market={market} />
            <MarketDiscussion slug={market.slug} />
          </>
        }
      />
    </NextIntlClientProvider>
  );
}

export default function MarketPage({
  params,
}: PageProps<"/[locale]/markets/[slug]">) {
  return (
    <Suspense>
      <MarketDetail params={params} />
    </Suspense>
  );
}
