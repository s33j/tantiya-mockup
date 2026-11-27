import "server-only";
import { coinsFromMinor } from "@tantiya/core/coins";
import { createClient } from "@tantiya/supabase/server";

// Reads open markets for the market list and market page (Gantt Task 15).
// Anyone may read markets that are past approval (RLS "Public markets or staff").
// Each outcome carries its current American line (migration
// 20261127000100_american_lines.sql); the database moves it as bets come in.

export type MarketType = "yes_no" | "over_under" | "band";

export type MarketOutcome = {
  id: number;
  position: number;
  label: string;
  odds: number;
  openingOdds: number;
};

export type Market = {
  slug: string;
  type: MarketType;
  category: string;
  question: string;
  rules: string;
  source: string;
  closesAt: string;
  outcomes: MarketOutcome[];
};

type Row = {
  slug: string;
  type: MarketType;
  question_en: string;
  question_fil: string;
  rules_en: string;
  rules_fil: string;
  resolution_source: string;
  closes_at: string;
  market_templates: { name: string } | null;
  market_outcomes: {
    id: number;
    position: number;
    label_en: string;
    label_fil: string;
    odds: number;
    opening_odds: number;
  }[];
};

const columns =
  "slug, type, question_en, question_fil, rules_en, rules_fil, resolution_source, closes_at, market_templates(name), market_outcomes(id, position, label_en, label_fil, odds, opening_odds)";

function toMarket(row: Row, locale: string): Market {
  const fil = locale === "fil";
  return {
    slug: row.slug,
    type: row.type,
    category: row.market_templates?.name ?? "",
    question: fil ? row.question_fil : row.question_en,
    rules: fil ? row.rules_fil : row.rules_en,
    source: row.resolution_source,
    closesAt: row.closes_at,
    outcomes: [...row.market_outcomes]
      .sort((a, z) => a.position - z.position)
      .map((o) => ({
        id: o.id,
        position: o.position,
        label: fil ? o.label_fil : o.label_en,
        odds: o.odds,
        openingOdds: o.opening_odds,
      })),
  };
}

export async function listOpenMarkets(locale: string): Promise<Market[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("markets")
    .select(columns)
    .eq("status", "open")
    .order("closes_at");
  if (error) throw error;

  return (data as unknown as Row[]).map((row) => toMarket(row, locale));
}

export async function getMarket(
  slug: string,
  locale: string,
): Promise<Market | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("markets")
    .select(columns)
    .eq("slug", slug)
    .eq("status", "open")
    .maybeSingle();
  if (error) throw error;

  return data ? toMarket(data as unknown as Row, locale) : null;
}

// The signed-in user, as far as betting needs: approved accounts can bet
// (proposal, Features > Sign-up and KYC: staff approve every account).
export type Bettor =
  | { kind: "guest" }
  | { kind: "notApproved"; userId: string }
  | { kind: "approved"; userId: string; available: number; inPlay: number };

export async function getBettor(): Promise<Bettor> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { kind: "guest" };

  const [{ data: profile }, { data: accounts }] = await Promise.all([
    supabase.from("profiles").select("status").eq("id", userId).maybeSingle(),
    supabase
      .from("wallet_accounts")
      .select("kind, balance_minor")
      .eq("user_id", userId),
  ]);
  if (profile?.status !== "approved") return { kind: "notApproved", userId };

  const balance = (kind: string) =>
    coinsFromMinor(accounts?.find((a) => a.kind === kind)?.balance_minor ?? 0);
  return {
    kind: "approved",
    userId,
    available: balance("available"),
    inPlay: balance("in_play"),
  };
}

// The signed-in user's bets, newest first (RLS "Own bets or staff"). Odds, stake
// and to-win are fixed at bet time.
export type PlacedBet = {
  id: number;
  status: "open" | "settled" | "voided";
  marketSlug: string;
  question: string;
  closesAt: string;
  outcomeLabel: string;
  outcomePosition: number;
  odds: number;
  stake: number;
  toWin: number;
  placedAt: string;
};

export async function listMyBets(locale: string): Promise<PlacedBet[]> {
  const fil = locale === "fil";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bets")
    .select(
      "id, status, outcome_id, odds, stake_minor, to_win_minor, placed_at, markets(slug, question_en, question_fil, closes_at)",
    )
    .order("placed_at", { ascending: false })
    .limit(100);
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: number;
    status: PlacedBet["status"];
    outcome_id: number;
    odds: number;
    stake_minor: number;
    to_win_minor: number;
    placed_at: string;
    markets: {
      slug: string;
      question_en: string;
      question_fil: string;
      closes_at: string;
    };
  }[];
  if (rows.length === 0) return [];

  const { data: outcomes, error: outcomesError } = await supabase
    .from("market_outcomes")
    .select("id, position, label_en, label_fil")
    .in("id", [...new Set(rows.map((r) => r.outcome_id))]);
  if (outcomesError) throw outcomesError;
  const byId = new Map((outcomes ?? []).map((o) => [o.id as number, o]));

  return rows.map((r) => {
    const o = byId.get(r.outcome_id);
    return {
      id: r.id,
      status: r.status,
      marketSlug: r.markets.slug,
      question: fil ? r.markets.question_fil : r.markets.question_en,
      closesAt: r.markets.closes_at,
      outcomeLabel: (fil ? o?.label_fil : o?.label_en) ?? "",
      outcomePosition: o?.position ?? 0,
      odds: r.odds,
      stake: coinsFromMinor(r.stake_minor),
      toWin: coinsFromMinor(r.to_win_minor),
      placedAt: r.placed_at,
    };
  });
}
