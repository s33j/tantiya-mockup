// American lines (decided Nov 27, 2026): each outcome of a two-outcome market
// has a line with the house margin built in, e.g. Yes −150 / No +130. Lines are
// set and moved by the database (public.place_bet, migration
// 20261127000100_american_lines.sql); this file only shows them. Keep toWin in
// step with private.to_win_minor.

// Implied chance of a line, margin included: −150 → 0.6, +130 → 0.4348.
export function impliedChance(odds: number) {
  return odds < 0 ? -odds / (-odds + 100) : 100 / (odds + 100);
}

// Decimal odds (total return per coin staked): −150 → 1.67, +130 → 2.30.
export function decimalOdds(odds: number) {
  return odds < 0 ? 1 + 100 / -odds : 1 + odds / 100;
}

// Coins won on top of the returned stake, rounded down to whole coins.
export function toWin(stake: number, odds: number) {
  return Math.floor(odds > 0 ? (stake * odds) / 100 : (stake * 100) / -odds);
}

// Llamado (favourite) is the side with the lower line; equal lines get no label.
export function sideOf(odds: number, otherOdds: number) {
  if (odds === otherOdds) return null;
  return odds < otherOdds ? "favourite" : "underdog";
}
