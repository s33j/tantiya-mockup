# Mockup sprint plan (Nov 27–30, 2026)

Clickable mockup of the whole Tantiya app flow, presented to the startup creator on Dec 1, 2026. EN only, dark theme, mock data, no backend.

## Decided on Nov 27
- Vegas odds set automatically: American lines with the margin built in (replace LMSR and the 10% fee). Over/under lines for numeric markets. Staff see lines and exposure and can pause, but don't set odds. Llamado = favourite, Dehado = underdog. American by default, decimal and implied % as toggles.
- Bet slip: stake, To win, Total return, fixed at bet time; "Line moved" state with Accept / Cancel.
- Result breakdown when a market is finalized: per bet and per market (main + side bets); "Waiting for result" and "Not final" when a side bet is pending. Losses shown like wins.
- Side bets: own line, bet slip, pool, bettor count and close time; each settles on its own; close early when the answer is known, when paused, or when voided. No parlays.
- Community: post, like, comment, share, report, profile. Posting comes with account approval (all users in the app are verified).
- Sign-up with one ID. Phone, OTP and biometrics later.
- Pool size and bettor count kept.
- Build: static prototype in its own repo (`s33j/tantiya-mockup`, private), one self-contained `dist/index.html`, review links as a claude.ai artifact. Dev 2 builds all 7 flows.

## Screens (R = reused, C = changed, N = new)
**Flow 1 · Sign-up to approval:** 1.01 Create account (R) · 1.02 Check email (R) · 1.03 Verify identity, one ID (C) · 1.03a Didit stand-in (N) · 1.04 Under review (R) · S4 staff KYC queue (R) · 1.08 Approved, 1,000 coins (R) · other Task 9 states 1.05, 1.06, 1.07, 1.09, 1.10, 1.11 (R, static)

**Flow 2 · Markets and betting:** 2.01 Market list (C) · 2.02 Odds format (N) · 2.03 Yes/No market + side bets, incl. PHP/USD side bet closed early (C) · 2.04 Over/under market (C) · 2.05 Bet slip (C) · 2.06 Line moved (C) · 2.07 Bet placed (N) · 2.09 My bets, Open / Settled with Won · Lost · Push/Void (N) · 2.10a Breakdown, final: PSA October (N) · 2.10b Breakdown, not final: BSP October (N) · 2.12 Notifications (N)

**Flow 3 · Community (all N):** 3.01 Feed · 3.02 Market Discussion tab · 3.03 Composer · 3.04 Attach market · 3.05 Post detail and comments · 3.06 Share sheet with 3.07 share card · 3.08 Report · 3.09 Profile

**Flow 4 · Wallet:** 4.01 Wallet (C) · 4.02 Top up (N) · 4.03 Top-up done (N) · 4.04 Withdraw (N) · 4.05 Withdrawal status timeline (N)

**Flow 5 · Safer play:** 5.00 Limits and breaks (C) · 5.01 Set limits (C) · 5.02 60-minute reality check (N) · 5.03 Cooling-off (N) · 5.04 Self-exclusion (N)

**Flow 6 · Staff console:** S4/S5 KYC (R) · 6.03 Lines & exposure with pause per main market and side bet (N) · 6.05 Market builder (N) · 6.06 Resolution queue (N) · 6.07 Moderation queue (N) · 6.08 Withdrawal approvals (N) · S7 Users, S8 Audit log (R)

**Flow 7:** 7.01 Leaderboard (C, metric placeholder) · 7.02 My analytics (C) · Account hub A.01 (C)

## Cross-frame links in the demo
- Approving application #1049 in the staff KYC queue approves the applicant on the phone (flow 1).
- Pausing a main market or side bet in Lines & exposure shows it as Paused on the phone.
- Settling a question in the resolution queue updates My bets, the breakdown and sends a result notification.
- Hiding a reported post replaces it in the feed with "removed by moderators".
- Approving a simulated withdrawal moves the phone's status timeline on.

## Open questions
All on the in-app Decisions board (`src/js/decisions.js`): margin, half-point lines vs pushes, max stake, line-move rule, opening-line sources, leaderboard metric, close-time buffer, early-close detection, bets between event and early close, two-person approval, pool and exposure definitions, To win rounding, community rules and moderation, share card, display names, what "withdraw" means for play coins, top-up presets, break and exclusion lengths, reality-check contents, notification channel, one ID with selfie, review time, helpline number, tab bar, and the proposal update.
