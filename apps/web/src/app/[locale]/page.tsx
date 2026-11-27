import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { MarketCard } from "@/components/markets/market-card";
import { Line } from "@/components/markets/market-ui";
import { WatchButton } from "@/components/markets/watch-button";
import { Link } from "@/i18n/navigation";
import { getBettor, listOpenMarkets, type Market } from "@/lib/markets/data";
import { formatPht } from "@/lib/markets/format";

// Market list (Gantt Task 15): phone cards as in canvas 01, a table from md up
// as in canvas 10. Columns the data can't fill yet (24 h change, pool, bettors)
// are left out until there is a source for them. Lines are American odds. Signed-in users can star
// markets for the watchlist demo.

async function MarketTable({
  markets,
  userId,
}: {
  markets: Market[];
  userId: string | null;
}) {
  const t = await getTranslations("Markets.table");
  const tw = await getTranslations("Watchlist");
  const locale = await getLocale();
  const th = "px-3 py-2.5 text-left font-normal";

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full border-collapse text-sm">
        <thead className="text-text-muted">
          <tr>
            <th className={th}>{t("market")}</th>
            <th className={th}>{t("category")}</th>
            <th className={th}>{t("lines")}</th>
            <th className={th}>{t("closes")}</th>
            {userId && <th className={th}>{tw("column")}</th>}
          </tr>
        </thead>
        <tbody>
          {markets.map((m) => {
            return (
              <tr key={m.slug} className="border-t border-border">
                <td className="px-3 py-2.5 font-semibold">
                  <Link href={`/markets/${m.slug}`} className="text-text">
                    {m.question}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-text-secondary">
                  {m.category}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {m.outcomes.map((o, i) => (
                    <span key={o.position}>
                      {i > 0 && <span className="text-text-muted"> · </span>}
                      {o.label} <Line odds={o.odds} className="font-bold" />
                    </span>
                  ))}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-text-secondary">
                  {formatPht(m.closesAt, locale)}
                </td>
                {userId && (
                  <td className="px-3 py-1.5">
                    <WatchButton
                      userId={userId}
                      slug={m.slug}
                      addLabel={tw("add")}
                      removeLabel={tw("remove")}
                      size="sm"
                    />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function MarketList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("Markets");
  const tw = await getTranslations("Watchlist");
  const { category } = await searchParams;
  const [markets, bettor] = await Promise.all([
    listOpenMarkets(await getLocale()),
    getBettor(),
  ]);
  const userId = bettor.kind === "guest" ? null : bettor.userId;
  const categories = [...new Set(markets.map((m) => m.category))];
  const active = typeof category === "string" ? category : null;
  const shown = active ? markets.filter((m) => m.category === active) : markets;

  const chip = (label: string, href: string, on: boolean) => (
    <li key={label} className="shrink-0">
      <Link
        href={href}
        aria-current={on ? "page" : undefined}
        className={`flex min-h-11 items-center rounded-full border px-4 text-sm ${on ? "border-accent bg-accent/15 font-semibold text-text" : "border-border bg-surface text-text"}`}
      >
        {label}
      </Link>
    </li>
  );

  return (
    <>
      <p className="text-sm text-text-secondary">
        {t("subtitle", { count: markets.length })}
      </p>
      <nav
        aria-label={t("categories")}
        className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
      >
        <ul className="flex gap-2">
          {chip(t("all"), "/", !active)}
          {categories.map((c) =>
            chip(c, `/?category=${encodeURIComponent(c)}`, c === active),
          )}
        </ul>
      </nav>
      {shown.length === 0 ? (
        <p className="text-text-secondary">{t("empty")}</p>
      ) : (
        <>
          <section
            aria-label={t("closingSoon")}
            className="flex flex-col gap-3 md:hidden"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">{t("closingSoon")}</h2>
              <span className="text-sm text-text-muted">
                {t("allTimesPht")}
              </span>
            </div>
            <ul className="flex flex-col gap-3">
              {shown.map((m) => (
                <li key={m.slug}>
                  <MarketCard
                    market={m}
                    action={
                      userId && (
                        <WatchButton
                          userId={userId}
                          slug={m.slug}
                          addLabel={tw("add")}
                          removeLabel={tw("remove")}
                        />
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
          <div className="hidden md:block">
            <MarketTable markets={shown} userId={userId} />
          </div>
        </>
      )}
    </>
  );
}

export default async function Home({ searchParams }: PageProps<"/[locale]">) {
  const t = await getTranslations("Markets");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <Suspense>
        <MarketList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
