// The coin ledger (Gantt Task 6) stores integer minor units: 1 coin = 100.
export const MINOR_PER_COIN = 100;

export function coinsFromMinor(minor: number) {
  return minor / MINOR_PER_COIN;
}

// The starting grant paid on approval: private.starting_grant_minor() in
// supabase/migrations/20261106000000_coin_ledger.sql (proposal, Features > Coin
// wallet: "proposed: 1,000 coins"). Clients cannot call that function, so this
// copy is only for text shown before approval. Keep the two in step.
export const STARTING_GRANT_COINS = 1000;
