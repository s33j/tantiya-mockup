import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AccountGate } from "@/components/markets/account-gate";
import { WalletView, type LedgerItem } from "@/components/markets/wallet-view";
import { coinsFromMinor } from "@tantiya/core/coins";
import { getBettor } from "@/lib/markets/data";
import { createClient } from "@tantiya/supabase/server";

// Wallet (canvas 06, page 2): balances from the coin ledger (Gantt Task 6).
// Proposal, Features > Simulated top-up: every such screen says "Simulation —
// no money is charged."

async function history(userId: string): Promise<LedgerItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ledger_entries")
    .select(
      "id, amount_minor, created_at, ledger_transactions!inner(kind), wallet_accounts!inner(user_id, kind)",
    )
    .eq("wallet_accounts.user_id", userId)
    .eq("wallet_accounts.kind", "available")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    (data as
      | {
          id: number;
          amount_minor: number;
          created_at: string;
          ledger_transactions: { kind: string };
        }[]
      | null) ?? []
  ).map((e) => ({
    id: e.id,
    kind: e.ledger_transactions.kind,
    amount: coinsFromMinor(e.amount_minor),
    at: e.created_at,
  }));
}

async function WalletContent() {
  const t = await getTranslations("Wallet");
  const tSlip = await getTranslations("BetSlip");
  const [bettor, messages] = await Promise.all([getBettor(), getMessages()]);

  if (bettor.kind === "guest") {
    return (
      <AccountGate
        message={t("signIn")}
        link={t("signInLink")}
        href="/sign-in?next=/wallet"
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

  const supabase = await createClient();
  const [items, { data: pendingRow }] = await Promise.all([
    history(bettor.userId),
    supabase
      .from("wallet_accounts")
      .select("balance_minor")
      .eq("user_id", bettor.userId)
      .eq("kind", "pending_withdrawal")
      .maybeSingle(),
  ]);

  return (
    <NextIntlClientProvider messages={{ Wallet: messages.Wallet }}>
      <WalletView
        available={bettor.available}
        inPlay={bettor.inPlay}
        pending={coinsFromMinor(pendingRow?.balance_minor ?? 0)}
        history={items}
      />
    </NextIntlClientProvider>
  );
}

export default async function WalletPage() {
  const t = await getTranslations("Wallet");
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <Suspense>
        <WalletContent />
      </Suspense>
    </div>
  );
}
