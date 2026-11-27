import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AccountGate } from "@/components/markets/account-gate";
import { MyBets } from "@/components/markets/my-bets";
import { getBettor, listMyBets } from "@/lib/markets/data";

async function BetsContent() {
  const t = await getTranslations("Bets");
  const tSlip = await getTranslations("BetSlip");
  const bettor = await getBettor();

  if (bettor.kind === "guest") {
    return (
      <AccountGate
        message={t("signIn")}
        link={t("signInLink")}
        href="/sign-in?next=/bets"
      />
    );
  }
  if (bettor.kind === "notApproved") {
    return (
      <AccountGate
        message={t("notApproved")}
        link={tSlip("checkAccount")}
        href="/account"
      />
    );
  }
  return <MyBets bets={await listMyBets(await getLocale())} />;
}

export default async function BetsPage() {
  const t = await getTranslations("Bets");
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <Suspense>
        <BetsContent />
      </Suspense>
    </div>
  );
}
