/* Decisions board: every open question the mockup raises, with where it shows up. */
const DECISIONS = [
  { g: 'Odds and lines (from the Nov 27 brief)', items: [
    ['Margin size', 'How much house margin is built into each line.', '6.03, 6.05'],
    ['Half-point lines vs pushes', 'PSA and BSP figures are published to one or two decimals, so a line like 3.5% can be hit exactly. Either set lines between reported values (e.g. 3.45%) so there is never a push, or allow it and return stakes on a push.', '2.04, 2.09, 6.05'],
    ['Max stake per bet', 'Upper limit for a single bet. Also how it relates to the user’s own daily stake limit.', '2.05, 5.01, 6.03'],
    ['Line-move rule', 'How far and how often lines move as bets come in, and whether any move or only a threshold shows "Line moved".', '2.06, 6.03'],
    ['Opening-line data source per template', 'Which feed sets the opening line for fuel, PSA inflation, BSP rate, PHP/USD and PAGASA markets.', '6.05'],
    ['Leaderboard metric', 'The proposal ranks by Brier score, which assumes probability forecasts. Pick a metric that works with fixed odds.', '3.09, 7.01, 7.02'],
  ] },
  { g: 'Markets, side bets and settlement', items: [
    ['Close-time buffer', 'How long before an answer can become known each close time must be.', '6.05'],
    ['Who detects an early close', 'An automatic data feed, or staff, when a side bet’s answer becomes known early.', '2.03, 6.06'],
    ['Bets between the event and its early close', 'Bets placed after the answer became known but before the question closed: void them?', '2.03, 6.06'],
    ['Two-person approval for results', 'The proposal mentions a two-person check. Who is the second approver for settling and for publishing markets?', '6.05, 6.06'],
    ['Pool definition under fixed odds', 'Drawn as total coins staked on the question, both sides. Confirm.', '2.01, 2.03'],
    ['Exposure definition for staff', 'Drawn as the house result if each outcome wins. Confirm the figure staff need.', '6.03'],
    ['To win rounding', 'Drawn as rounded down to whole coins.', '2.05'],
    ['Llamado/Dehado on equal lines', 'Drawn with no label when both sides have the same odds (−110 / −110).', '2.04'],
    ['Amber "Closing" window', 'Drawn as the last 72 hours before close.', '2.01'],
  ] },
  { g: 'Community', items: [
    ['Who can comment and like', 'Posting needs approval (all users in the app are approved). Same rule for comments and likes?', '3.05'],
    ['Community guidelines', 'Text of the rules, linked from the feed, composer and moderation queue.', '3.01, 3.03, 6.07'],
    ['Report reasons', 'The six reasons in the report flow are my choice.', '3.08'],
    ['Who moderates, and how fast', 'Staffing and response time for the moderation queue.', '6.07'],
    ['Counsel review of user posts', 'User-generated content needs counsel review and a wider privacy impact assessment.', '3.01'],
    ['Share card contents', 'Drawn as market + the person’s side (no stake, odds of the bet, or winnings). Confirm, and decide whether a shared link opens a public preview.', '3.06'],
    ['Display names', 'Drawn as names users choose; KYC names are never shown.', '3.09'],
  ] },
  { g: 'Wallet and safer play', items: [
    ['What "withdraw" means for play coins', 'Coins can’t be cashed out. Keep a simulated withdrawal at all, and does it need staff approval?', '4.04, 4.05, 6.08'],
    ['Top-up presets', 'Drawn as 500 / 1,000 / 2,000 / 5,000 coins, within the 10,000 a day limit.', '4.02'],
    ['Cooling-off lengths', '24 hours / 7 days / 30 days, from the Core Mockups canvas.', '5.03'],
    ['Self-exclusion lengths', '6 months / 1 year / permanent (accepted as placeholders Nov 16).', '5.04'],
    ['Reality-check contents', 'Drawn with session time, bets, staked, returned and net.', '5.02'],
    ['Notification channel', 'Drawn in-app only. Email or push for results and withdrawals?', '2.12'],
  ] },
  { g: 'Sign-up and general', items: [
    ['One ID: selfie and liveness?', 'Drawn assuming Didit still asks for a selfie and liveness check with the one ID.', '1.03'],
    ['Review time wording', 'Shown as [REVIEW TIME] (code says "usually within 24 hours").', '1.04'],
    ['Helpline number', 'Shown as [HELPLINE NUMBER] in the 21+ banner on every screen.', 'All'],
    ['Tab bar', 'Markets · My bets · Community · Wallet · Account. Watchlist moves out for now.', 'All phone screens'],
    ['Tab bar hidden before approval', 'Drawn hidden on sign-up screens (Task 9 showed it).', '1.01–1.08'],
    ['Proposal update', 'The proposal still describes LMSR, the 10% fee and payout-first odds. It needs an update for automatic American lines, side bets and Community.', '—'],
  ] },
];
function renderDecisions() {
  const total = DECISIONS.reduce((t, g) => t + g.items.length, 0);
  return `<main class="dec"><h1>Decisions board</h1><p class="lead t2" style="margin-top:10px;max-width:75ch">${total} open questions raised by the mockup. Each one shows in the screens as a yellow [PLACEHOLDER] or as a note marked "my choice, needs confirmation". Screen numbers match the start page and the flow rail.</p>
    <div class="dgrid">${DECISIONS.map((g) => `<section class="dgroup"><h2>${esc(g.g)}</h2>${g.items.map(([q, d, where]) => `<div class="ditem"><div class="dq">${esc(q)}</div><div class="dd">${esc(d)}</div><div class="dm"><span class="chip waiting">Open</span><span>Screens: ${esc(where)}</span></div></div>`).join('')}</section>`).join('')}</div></main>`;
}
