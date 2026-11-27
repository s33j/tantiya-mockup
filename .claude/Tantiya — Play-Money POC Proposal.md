# Tantiya — Play-Money POC Proposal

Oct 19, 2026 · @Japh

## Summary

We propose building Tantiya first as a free, play-money forecasting web app for KYC-verified adults in the Philippines: 2–4 developers, about 12 weeks to build and 12 to run, on free service tiers only ($0 a month in services). Paid plans wait until after the POC; see Post-POC: paid integrations. Real-money betting stays out because it is illegal today; the POC tests whether people sign up, verify and come back before we pursue a license.

**Decisions requested from the team**

| # | Decision | Recommendation |
| --- | --- | --- |
| 1 | Approve the play-money POC scope | Approve as set out in Scope and Features |
| 2 | Pricing model | Locked odds (LMSR), 10% fee on each stake, opening odds from data |
| 3 | Tech stack | Next.js PWA on Vercel Hobby + Supabase Free in Singapore; free tiers only |
| 4 | Success targets for moving to real money | Approve or adjust the proposed targets |
| 5 | Counsel review before launch | Engage counsel on simulated top-ups and KYC for a free app |

## Scope

Tantiya's first release is a free, play-money forecasting web app for verified adults in the Philippines; it proves demand before any real-money wallet is built.

| Area | In the POC | Not in the POC |
| --- | --- | --- |
| Money | Free virtual coins with no cash value; simulated top-up (adds coins, capped) and simulated withdraw (removes coins) as in-app mocks | Real-money wallet, payment providers, real cash-in or withdrawal, buying coins, prizes |
| Rewards | Leaderboard and accuracy badges (bragging rights only) | Anything redeemable |
| Users | Adults 21+ in the Philippines, full KYC (ID, selfie, liveness) at sign-up | Users outside the Philippines |
| Platform | Web app installable as a PWA | Native Android and iOS apps |
| Languages | English and Filipino | Cebuano and other languages |
| Markets | Weekly fuel price band, PSA inflation, BSP policy rate, PHP/USD reference rate, PAGASA storm signal | Politics, PH election results (banned by law), user-created markets |
| Revenue | None; funded as a proof of concept | Sponsored markets, subscriptions, ads |
| Team | 2–4 developers | — |
| Services | Free tiers only | Any paid plan or per-use fee (listed under Post-POC: paid integrations) |

The POC keeps the real-money spec's core rules so the move to real money is an extension, not a rebuild: server-side ledger in integer units, two-person market approval and resolution, and the same KYC data model.

## Pricing: the choice the team needs to make

Two separate questions decide how Tantiya prices a forecast: how the payout is set, and how the house takes its fee. Coins have no value in the POC, so house risk is zero either way; the choice matters because the POC should test the model real money will use.

**Question 1 — how is the payout set?**

- **Pool (parimutuel).** Every stake goes into one pot. When the market resolves, winners split the losers' coins in proportion to their stakes. Your payout is an estimate until betting closes, because later bets change it. A *seeded* pool means the house puts in starting coins so odds show from the first minute.
- **Locked odds (LMSR market maker).** A pricing formula always quotes a price. You buy at that price, and your payout is fixed the moment you bet. The house funds the formula and can lose up to a set cap per market.

**Question 2 — how does the house earn?**

- **A share of the whole pool** (the current spec: 10%).
- **A share of each winner's profit** (for example 10%). Losers pay nothing extra.

**One example, three models.** "Will diesel go up next week?" The pool holds 10,000 coins: 6,000 on Yes, 4,000 on No. You put 100 on Yes, and Yes wins.

| Model | Your 100 coins return | When you know the payout | Worst case for the house |
| --- | --- | --- | --- |
| Pool, fee = 10% of the pool | 150 | When betting closes | The seed |
| Pool, fee = 10% of winners' profit | 160 | When betting closes | The seed |
| Locked odds at a 60% price, 10% fee | 149.78 (your own bet moves the price slightly) | When you bet | A capped subsidy per market |

### Math breakdown

Symbols used below: pool T = 10,000 coins, coins on Yes W = 6,000 (your 100 included), coins on No L = T − W = 4,000, your stake s = 100, fee rate f = 10%.

**Model 1 — pool, fee = 10% of the pool**

```latex
\text{fee} = \min(f \times T,\; L) \qquad \text{payout} = s \times \frac{T - \text{fee}}{W}
```

| Step | Calculation | Result |
| --- | --- | --- |
| 1. Fee | min(10% × 10,000, 4,000) | 1,000 |
| 2. Coins left for Yes bettors | 10,000 − 1,000 | 9,000 |
| 3. Return per coin on Yes | 9,000 ÷ 6,000 | 1.50 |
| 4. Your payout | 100 × 1.50 | 150 |
| 5. Your profit | 150 − 100 | 50 |

Check: all Yes bettors receive 6,000 × 1.50 = 9,000, and 9,000 + 1,000 fee = 10,000, the whole pool. The fee is capped at the losers' coins so a winner never gets back less than their stake. Shown odds: decimal 1.50, American −200, implied 66.7%. The house takes 1,000 of the winners' 4,000 gross profit, so 25% of their profit.

**Model 2 — pool, fee = 10% of winners' profit**

```latex
\text{payout} = s + (1 - f) \times s \times \frac{L}{W}
```

| Step | Calculation | Result |
| --- | --- | --- |
| 1. Your share of the losers' coins | 100 ÷ 6,000 × 4,000 | 66.67 |
| 2. Fee on that profit | 10% × 66.67 | 6.67 |
| 3. Your payout | 100 + 66.67 − 6.67 | 160 |
| 4. Your profit | 160 − 100 | 60 |

Check: the total fee is 10% × 4,000 = 400; winners receive 6,000 + 3,600 = 9,600, and 9,600 + 400 = 10,000. Shown odds: decimal 1.60, American −167, implied 62.5%. The house takes 400, or 4% of the pool, against 1,000 in Model 1.

**Model 3 — locked odds (LMSR)**

LMSR needs a liquidity setting b; this example uses b = 20,000 coins, the value in the full spec's worked example. The Yes price starts at p₀ = 0.60.

```latex
p_{yes} = \frac{e^{q_{yes}/b}}{e^{q_{yes}/b} + e^{q_{no}/b}} \qquad C(q) = b \ln\left(e^{q_{yes}/b} + e^{q_{no}/b}\right)
```

Buying x Yes shares costs C(after) − C(before) = b × ln(1 − p₀ + p₀ × e^(x/b)). Setting that equal to your stake after the fee and solving for x:

```latex
x = b \ln\left(\frac{e^{s(1-f)/b} - (1 - p_0)}{p_0}\right)
```

| Step | Calculation | Result |
| --- | --- | --- |
| 1. Fee on stake | 10% × 100 | 10 |
| 2. Coins that buy shares | 100 − 10 | 90 |
| 3. Exponential term | e^(90 ÷ 20,000) | 1.004510 |
| 4. Inside the logarithm | (1.004510 − 0.40) ÷ 0.60 | 1.007517 |
| 5. Shares bought | 20,000 × ln(1.007517) | 149.78 |
| 6. Payout if Yes wins (1 coin per share) | 149.78 × 1 | 149.78 |
| 7. Average price paid per share | 90 ÷ 149.78 | 0.6009 |
| 8. Yes price after your bet | 0.60 × 1.007517 ÷ (0.40 + 0.60 × 1.007517) | 0.6018 |

The average price (0.6009) is just above 0.60 because your own purchase raises the price as you buy; without the fee, 100 coins would buy 166.39 shares. Unlike Models 1 and 2, the 149.78 is fixed at step 6 when you bet.

House worst case per market, before fees earned:

```latex
\text{max loss} = b \ln\left(\frac{1}{p_{\min}}\right)
```

Opened at 60/40: 20,000 × ln(1 ÷ 0.40) = 18,326 coins. Opened at 50/50: 20,000 × ln 2 = 13,863 coins.

**Why a pool fee hits analytical users hard.** In a 50/50 pool of 10,000 (5,000 each side), Model 1 takes 1,000 of the winners' 5,000 profit, which is 20%, and pays 180 for each 100 staked. Model 2 takes 500 and pays 190.

|  | Seeded pool, % of pool | Seeded pool, % of profit | Locked odds (LMSR) |
| --- | --- | --- | --- |
| What the user sees | An estimate that moves | An estimate that moves | A fixed price |
| Build effort | Low | Low | Medium |
| Fit for analytical users | Poor: in a 50/50 market, 10% of the pool is 20% of a winner's profit | Good: winners keep more of their edge | Mixed: skilled users can extract the house subsidy |

**Recommendation for the team to approve:** run the POC on locked odds (LMSR) with a 10% fee on each stake, set up with the opening-odds and margin rules below. The team has picked locked odds as the starting point; the POC measures the realized margin per market. The math, ledger postings and worked checks for all three models are in the [full technical spec](https://claude.ai/code/artifact/c270058a-9bab-46e4-a109-35be595edf95).

### Locked odds: opening odds and the 10% margin

With locked odds the house takes the other side of every bet, so a 10% fee alone cannot guarantee a 10% profit. Three things protect it: opening odds close to where the market will end, a liquidity setting b sized to expected volume, and a live loss limit per outcome.

**Where the house's result comes from.** LMSR is a market scoring rule: each trader pays off the previous one, so the house's total cost depends only on the first and last prices, and its expected loss "depends only on how informative that last report is" ([Hanson, 2003](https://healy.econ.ohio-state.edu/pubfiles/infomkts/litreview/Hanson%20-%20Combinatorial%20Information%20Market%20Design%2003.pdf)). For one market, with H = coins staked, f = 10%, and p\_open and p\_close = the winning outcome's price at open and at close:

```latex
\text{house result} = f \times H \; - \; b \ln\left(\frac{p_{close}}{p_{open}}\right)
```

Why: with C(q) = b × ln(Σ e^(q/b)) and p\_w = e^(q\_w/b) ÷ Σ e^(q/b), the shares paid on the winner minus the coins the formula collected work out to exactly b × ln(p\_close ÷ p\_open).

Example with b = 20,000 and Yes opening at 60%:

| Yes price at close | Winner | Market-maker result (coins) | Stakes the 10% fee needs to cover it |
| --- | --- | --- | --- |
| 60% | Yes | 0 | None |
| 80% | Yes | −5,754 | 57,536 |
| 95% | Yes | −9,191 | 91,906 |
| 80% | No | +13,863 (house gains) | None |
| Near 0% (worst case) | No | −18,326 | 183,258 |

If the opening price matches where the market closes, the market maker breaks even and the house keeps the full 10%. The house loses only when it opened too low on the outcome that won, so accurate opening odds are the main lever.

**Rules to protect the margin (proposed)**

1. **Open from data, never 50/50 by default.** Bookmakers start by estimating the fair probability of each outcome from data and models, then add their margin ([LSports](https://lsports.eu/blog/how-do-bookmakers-set-odds-overround-explained)). Here the margin is the 10% fee, so the opening prices are the fair estimate itself.
2. **Floor every opening probability at 5%.** The worst case is b × ln(1 ÷ lowest opening probability): 0.92 × b at 40%, but 3.0 × b at 5%. Band markets with many outcomes need this most.
3. **Size b from expected stakes.** Choose m, the share of stakes the house accepts losing in the worst case, then:

   ```latex
   b = \frac{m \times H_{expected}}{\ln(1 / p_{min})}
   ```

   Example: 200,000 coins expected, m = 5%, lowest opening price 40% gives b ≈ 10,914, and a worst-case margin of 10% − 5% = 5% if stakes reach 200,000. The trade-off is price movement: a 1,000-coin bet moves Yes from 60% to 63.2% at b = 10,914, against 61.8% at b = 20,000.
4. **Live loss limit per outcome.** At any moment the house's loss if outcome w wins is b × ln(p\_w ÷ p\_w,open). Stop selling w once that exceeds the fees collected so far plus the market's budget; this is the same as capping w's price at p\_open × e^((fees + budget) ÷ b). Bookmakers use the same tool, adjusting odds or limiting stakes when liability builds ([LSports](https://lsports.eu/blog/how-do-bookmakers-set-odds-overround-explained)).
5. **Close before the answer leaks.** Late, well-informed bets push the closing price toward the truth at the house's expense; the full spec's early close times and insider bans stay.
6. **Measure the margin.** For each market: (fees − market-maker loss) ÷ stakes, reported by template. Coins carry no risk, so the POC is where b and the opening methods get tuned.

Not recommended for the POC: liquidity-sensitive market makers can book a profit whatever the outcome once enough volume has traded ([Othman et al., 2010](https://www.cs.cmu.edu/~./theorylunch/pastSemesterIndices/20100922.html)), and their prices sum above 1 as the house's cut, but those prices no longer read as probabilities ([Li and Vaughan, 2013](https://www.jennwv.com/papers/liquidity.pdf)). Revisit for real money.

**Opening odds by template**

| Template | Anchor | Turning it into opening probabilities | Caution |
| --- | --- | --- | --- |
| Weekly fuel band | DOE sets the adjustment from the week's average fuel cost ([DZRH, 9 March 2026](https://www.dzrh.com.ph/post/oil-prices-expected-to-rise-by-p17-p24-per-liter-this-week-doe)), plus the history of past weekly adjustments | Spread of past adjustments, shifted by the week's cost movement so far | A public feed for the week's cost movement is not yet identified |
| PSA inflation | BSP's month-ahead forecast range, e.g. 7.1–7.9% for May 2026 ([Philstar](https://www.philstar.com/business/science-and-environment/2026/05/30/2531635/bsp-projects-may-inflation-71-79-amid-food-forex-pressures)) | Centre on the range midpoint; spread wider than the range, sized from BSP's past misses | May 2026 came in at 6.8%, below the range ([Philstar](https://www.philstar.com/headlines/2026/06/05/2533026/inflation-slows-68-may-2026-amid-easing-transport-food-costs)) |
| BSP rate decision | Analyst polls, e.g. BusinessWorld's 18-analyst poll in which 17 expected a 25 bp cut ([BusinessWorld](https://bworldonline.com/?p=717211)) | Poll shares, with every outcome held at or above the 5% floor | One-sided polls give extreme prices, which is where the floor matters |
| PHP/USD reference rate | Latest BSP reference rate ([PesoHub](https://www.pesohub.ph/government/bsp/bsp-exchange-rate-guide/)) | Bands from the spread of past moves over the same number of working days | Bands must cover every possible value |
| PAGASA wind signal | PAGASA bulletins; signals 1–5 have lead times of 36 hours down to 12 ([PAGASA](https://pagasa.dost.gov.ph/learning-tools/tropical-cyclone-wind-signal)) | Staff judgment from the forecast track, with a small b | Highest uncertainty; open only once the storm is inside PAR |

### Getting money on both sides

With locked odds no bet waits for a counterparty, because the market maker always takes the other side; one-sided money instead moves the price and raises the house's exposure. Both sides draw money when the question splits opinion, when each side still pays enough after the 10% fee, and when the price moves enough to make the unpopular side tempting.

**What the research shows**

- **Bookmakers want balance, but do not insist on it.** They move the line to pull money to the other side when one side gets heavy action, but accept some imbalance when they trust their number ([Bleacher Nation](https://www.bleachernation.com/betting/2026/06/06/how-do-sportsbooks-determine-the-spread/)). In Levitt's NFL data, prices "did not equalize bets on each side," and in almost 10% of games more than 80% of bets went to one team ([Levitt, 2004, via AcaWiki](https://acawiki.org/Why_are_Gambling_Markets_Organised_So_Differently_from_Financial_Markets%3F)). The goal is bounded exposure, not a perfect 50/50 split.
- **Bettors lean differently by market shape.** The evidence fits favourite bias in two-outcome markets and longshot bias in markets with several outcomes ([Newall and Cortis, 2021](https://ideas.repec.org/a/gam/jrisks/v9y2021i1p22-d478780.html)). On Kalshi, cheap contracts are overbought: "a 10 cent contract will win less often than 10% of the time" ([Burgi, Deng and Whelan, 2026](https://cepr.org/voxeu/columns/economics-kalshi-prediction-market)).
- **Trade needs disagreement.** If everyone reads the evidence the same way, the no-trade theorem says nobody should bet; trade comes from people who see it differently ([Wikipedia: no-trade theorem](https://en.wikipedia.org/wiki/No-trade_theorem)).
- **Filipino bettors already know two-sided betting.** In sabong the meron is the favourite (llamado) and the wala the long shot; when bets are unequal, the casador asks ringside bettors for amounts "to equalize the bets," and long-shot odds such as logro diez pay 125 on 100 ([StuartXchange](https://stuartxchange.org/Sabong)).

**The 10% fee kills heavy favourites.** With the fee taken from the stake, a winning coin returns 0.9 ÷ price. At a 90% price a winner gets back exactly what they staked, so nobody should buy that side.

| Opening price of a side | Return per coin if it wins, 10% fee on stake | Return per coin, 10% fee on profit |
| --- | --- | --- |
| 30% | 3.00 | 3.10 |
| 50% | 1.80 | 1.90 |
| 70% | 1.29 | 1.39 |
| 80% | 1.13 | 1.23 |
| 90% | 1.00 | 1.10 |

Kalshi avoids this by scaling its fee with price: 0.07 × contracts × P × (1 − P), highest at 50 cents and small near 1 or 99 cents ([Allium](https://allium.so/blog/kalshi-fees-why-the-cost-peaks-near-50-cents/)). A fee on profit keeps favourites worth buying but earns the house less on them; the team should choose between the two.

**Rules for two-sided markets (proposed)**

1. **Set the line where opinion splits.** For a Yes/No question on a number, put the threshold at the anchor's midpoint (for example the middle of BSP's inflation range), so the market opens near 50%.
2. **Open every Yes/No side between 30% and 70%.** Each side then returns at least 1.29 per coin after the fee. If the data puts one side above 70%, move the threshold rather than list a lopsided market.
3. **Offer bands as well as Yes/No.** Kalshi lists both "above X%" and range markets for CPI ([BotForKalshi](https://www.botforkalshi.com/blog/can-you-bet-on-inflation)). Bands let each user back their own number and draw the longshot money that multi-outcome markets attract; the 5% opening floor still applies.
4. **Let the price do the balancing, and show it.** When money piles onto one side, LMSR raises that side's price and the other side's payout. Show the underdog's payout first, with the Dehado label and the change ("Dehado now pays 100 → 250"), the way a casador calls for the other side.
5. **Give the minority side its argument.** The data tab shows the anchor and how often it missed (for example, May 2026 inflation fell below BSP's range), so a contrarian has evidence, not just a hunch.
6. **Watch the imbalance.** Track each market's share of stakes on the smaller side; the live loss limit above caps the house when imbalance gets too large.

Not proposed: bonuses for betting the underdog. They are inducements, which the full spec's safer-gambling rules exclude.

## Features

The POC ships 11 feature areas, each taken from the full spec and cut to what play money needs. Values marked *proposed* are for the team to confirm.

| Area | Features in the POC |
| --- | --- |
| Sign-up and KYC | Browse markets as a guest. Application: email and password with email verification (mobile OTP is post-POC), 21+ and "I am in the Philippines" declarations, ID capture (PhilID or ePhilID, passport, driver's license, UMID), selfie with liveness, face match, duplicate-person check. A staff reviewer approves every account; the user sees "Under review" until then. |
| Markets | Yes/No and numeric-band markets. Market page leads with the crowd's chance and "100 → X coins", then pool size, bettor count, rules, resolution source and close time (PHT). Data tab: probability and pool history chart, base-rate table per template. |
| Odds display | Default payout-first ("100 → 160"). Toggles: decimal, American, implied %. Llamado and Dehado labels on favourite and underdog. Every number shown after the fee. |
| Forecasting | Bet slip with an empty stake field, live estimate, odds-changed check (default 5% slippage), confirm. My bets: open, settled, voided, with payout breakdown. 24-hour dispute window after each result. |
| Coin wallet | Balances: available, in play, pending withdrawal. Full history. Starting grant on approval (*proposed: 1,000 coins*). |
| Simulated top-up | In-app mock: the user picks a method and enters a peso amount; the same number of coins is added. No payment provider, no charge. Caps mirror the full spec's deposit limits: 10,000 a day, 30,000 a week, 100,000 a month. Every screen says "Simulation — no money is charged." |
| Simulated withdraw | In-app mock: the user picks a method label (no real account number) and an amount; coins move to pending and follow the full spec's status timeline (requested, held, approved, sent, paid). Amounts above 20,000 go to a staff approval queue, so the ops flow is tested too. |
| Safer play | Limits on top-up and stakes (lower now, raise after 72 hours), reality check every 60 minutes, cooling-off (24 hours, 7 or 30 days), self-exclusion, "21+" and helpline banner, close account in three steps. No streaks, daily rewards or win celebrations. |
| Leaderboard and analytics | Leaderboard ranked by accuracy (Brier score), not coins won. Accuracy badges. Personal analytics: ROI, win rate by category, closing-line value, Brier score. CSV export of own forecasts and history. |
| Notifications | Web push (on iOS only after "Add to Home Screen", iOS 16.4+), email for KYC decisions and settlements. |
| Staff console | KYC review queue with reason codes; market builder with two-person approval; resolution queue with evidence and two-person confirmation; simulated withdrawal approvals; user view; audit log of every staff action. |

**Market templates at launch**

| Template | Resolution source | Cadence | Note |
| --- | --- | --- | --- |
| Weekly fuel price band (gasoline, diesel, kerosene) | DOE weekly price guidance; pricing weeks start Tuesday morning ([Daily Tribune](https://tribune.net.ph/2026/07/13/renewed-oil-volatility-prompts-doe-to-revisit-fuel-pricing-rules)) | Weekly | DOE switched between a single figure and a range in 2026 ([Daily Tribune](https://tribune.net.ph/2026/06/29/fuel-prices-split-course-as-doe-eases-pricing-controls)); rules must say which figure resolves the market |
| PSA headline inflation | PSA monthly CPI release (September 2026 was released 6 October 2026: [GMA](https://www.gmanetwork.com/news/money/economy/1004884/inflation-snaps-four-month-easing-accelerates-to-7-2-in-september-2026/story/)) | Monthly | Close 48 hours before release |
| BSP policy rate decision | BSP Monetary Board statement ([FocusEconomics](https://www.focus-economics.com/countries/philippines/news/monetary-policy/philippines-central-bank-meeting-18-06-2026-bsp-raises-rates-in-june/)) | Per meeting | 2027 meeting dates to be taken from BSP before setup |
| PHP/USD reference rate on a date | BSP Reference Exchange Rate Bulletin, working days only ([PesoHub](https://www.pesohub.ph/government/bsp/bsp-exchange-rate-guide/)) | Weekly | Close the day before |
| PAGASA wind signal for a province | PAGASA bulletin; signals 1–5 ([PAGASA](https://pagasa.dost.gov.ph/learning-tools/tropical-cyclone-wind-signal)) | When a storm forms | Close when the storm enters PAR |

Not in the POC: politics, price alerts, calibration page, public API, promotions, native apps.

## Tech stack

Recommended: a Next.js web app installable as a PWA, hosted on Vercel Hobby, on Supabase Free in Singapore, with all coin and settlement logic inside Postgres functions. Every service runs on a free tier; the paid upgrades are listed under Post-POC: paid integrations. It matches the team's Next.js and Supabase skills and keeps the full spec's data model, so real money extends it rather than replacing it.

| Layer | Choice | Why | Source |
| --- | --- | --- | --- |
| Web app | Next.js App Router, PWA through `app/manifest.ts` and a service worker | Built-in manifest support; web push works on Android browsers and on iOS 16.4+ once installed to the home screen | [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps) |
| UI | Tailwind with the Tantiya tokens, TanStack Query, react-hook-form + zod, uPlot charts | Same choices as the full spec's frontend, so screens carry over | [Full spec](https://claude.ai/code/artifact/c270058a-9bab-46e4-a109-35be595edf95) |
| Staff console | Second Next.js app in the same repo, on its own free `*.vercel.app` address, staff TOTP MFA | Keeps staff tools off the public app, as the full spec requires | [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa) |
| Hosting | Vercel Hobby, $0: 100 GB data transfer and 1M function invocations a month, one developer seat | The POC earns nothing and sells nothing; Hobby is for personal, non-commercial use, so see the Hobby risks under Risks | [Vercel pricing](https://vercel.com/pricing), [fair use](https://vercel.com/docs/limits/fair-use-guidelines) |
| Database, auth, files, live updates | Supabase Free, $0, region `ap-southeast-1` (Singapore): 2 projects, 500 MB database, 1 GB files, 5 GB egress, 50,000 monthly active users | Postgres, Auth, private Storage and Realtime in one service, in the closest region to Manila | [Supabase pricing](https://supabase.com/pricing), [regions](https://supabase.com/docs/guides/platform/regions) |
| Backups | Nightly `pg_dump` from a scheduled GitHub Actions job, kept as private workflow artifacts | Supabase Free includes no backups | [Supabase pricing](https://supabase.com/pricing) |
| Coin ledger and settlement | Postgres functions called through `rpc()` | Each API request runs inside one transaction, so a bet's ledger entries and pool totals change together or not at all | [PostgREST](https://docs.postgrest.org/en/stable/references/transactions.html) |
| Scheduled jobs | Supabase Cron (pg\_cron) | Closes markets on time, settles, steps simulated withdrawals, runs the nightly ledger check | [Supabase Cron](https://supabase.com/docs/guides/cron) |
| Sign-in | Supabase Auth: email and password with email verification; no phone OTP | Phone OTP needs paid SMS (post-POC). Didit's duplicate-face search still keeps one person per account | [Supabase Auth](https://supabase.com/docs/guides/auth) |
| Auth and notification email | A free-tier SMTP provider connected to Supabase Auth (for example Brevo) | Supabase's built-in sender is limited to a few emails an hour; custom SMTP is allowed on the Free plan | [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Brevo](https://developers.brevo.com/docs/supabase-smtp-integration) |
| KYC | Didit: PhilID, UMID, passport, LTO license, liveness, face match, duplicate-face search | 500 verifications free each month. The app stops new applications at 500 a month, so it never reaches the paid rate | [Didit](https://didit.me/solutions/countries/philippines/) |

&#91;embedded content: POC architecture · 2 apps, 1 backend, 2 vendors\]

Both apps call Postgres functions through Supabase; KYC results arrive by webhook and auth emails go out through the SMTP provider. (The architecture diagram still shows Twilio, which moves to post-POC.)

**Why not the full spec's stack yet.** It adds a separate NestJS API, Redis, a job queue and Terraform-managed cloud, which is a lot to run for 2–4 developers and play money. Supabase is plain Postgres, so the ledger tables and functions move over when real money needs a dedicated API.

**Why not self-host.** Hetzner has a Singapore location ([Hetzner](https://www.hetzner.com/cloud-singapore/)), but self-hosting puts backups, patching and the security of ID images on the team. Revisit after the POC.

## Branding

Tantiya keeps the full spec's visual system: it should read as a research tool, not a casino. The name is Tagalog for "estimate" or "calculation" ([Tagalog.com](https://tagalog.com/dictionary/tantiya)), which fits a product about forecasting public data.

| Token | Value |
| --- | --- |
| Base | Ink navy `#0F1B2D` (dark theme, the default); off-white `#F7F7F4` (light theme) |
| Accent | Teal `#14B8A6` for actions |
| Outcomes | Blue for Yes or the first outcome, orange for No or the second; always with text labels |
| Status | Green open, amber closing, grey closed; always with an icon |
| Type | IBM Plex Sans; tabular numerals for every coin amount and odds |
| Type scale | 12 / 14 / 16 / 20 / 28; body 16 |
| Spacing and corners | 4-unit grid; 12 radius on cards, 8 on inputs |
| Motion | 200 ms ease on number changes; nothing over 400 ms; no confetti, sounds or flashing |
| Avoid | Gold, red, neon and slot-style motion |

Phone and desktop mockups in this system already exist in the [Core Screen Mockups](https://claude.ai/artifact/JTbb52u16tSony2VgoH6od) design file. Still to design for the POC: the application flow, simulated top-up and withdraw, the odds-changed state, and the light theme. The full spec does not define a logo.

## Legal and privacy check

A free, no-prize app is the safest legal position available, but two choices in this proposal need counsel's sign-off before launch: full KYC for a free app, and simulated peso top-ups.

| Question | What the research says | What the POC does |
| --- | --- | --- |
| Is real-money event betting legal now? | No. Prediction markets remain illegal under current law; PAGCOR has authorised none ([AGBrief](https://agbrief.com/news/27/10/2025/philippines-law-keeps-prediction-markets-at-bay/)). PAGCOR had Polymarket blocked on 14 May 2026 ([BitPinas](https://bitpinas.com/feature/exclusive-globe-polymarket-order/)). | No real money, no prizes, no coin sales |
| Is a play-money app gambling? | A platform purely for entertainment, with no chance to stake money or anything of value, may not be classed as gambling; cash or convertible credits push it toward gambling ([Lawyer Philippines](https://www.lawyer-philippines.com/articles/a-comprehensive-legal-overview-of-philippine-regulations-on-online-gaming-applications); not legal advice). | Coins can never be bought, cashed out or traded |
| Could simulated top-ups look like real deposits? | Not covered by any source found. | "Simulation — no money is charged" on every top-up and withdraw screen; no payment provider connected. Counsel to confirm. |
| Is full KYC proportionate for a free app? | The Data Privacy Act requires personal data to be adequate, relevant and limited to what the declared purpose needs (Section 11) ([Batas Natin](https://batasnatin.com/laws/data-privacy-act-principles-of-lawful-processing)). | Declared purposes: 21+ gate, one person per account for a fair leaderboard, and readiness for real money. Collect ID, selfie and liveness only; no address, income or source of funds until real money. Privacy impact assessment before launch. |
| Can we check PhilIDs with PSA directly? | PhilSys Check verifies the PhilID QR signature in a browser at verify.philsys.gov.ph; PSA lists no API for private apps ([PSA](https://psa.gov.ph/content/philsys-authentication-services-strengthen-transaction-security)). | Use the KYC vendor's PhilID reading; reviewers can use PhilSys Check by hand on doubtful cases |

KYC records are held in Singapore under the recommended stack, so counsel should also confirm the cross-border transfer basis.

## Success criteria for moving to real money

The POC runs 12 weeks of live markets, enough for 12 fuel weeks, 3 inflation releases and at least one BSP meeting; real-money planning starts only if the targets below hold. All targets are *proposed* for the team to confirm.

| Measure | Proposed target | Basis |
| --- | --- | --- |
| Approved users | 1,000 in 12 weeks | Fits inside Didit's 500 free verifications a month ([Didit](https://didit.me/solutions/countries/philippines/)) |
| Application starts that end approved | 50% or more | The full spec cites a 40–60% loss of sign-ups for poorly designed KYC flows |
| KYC decisions within 24 hours | 90% | Full spec's service target |
| Approved users still active on day 30 | 12% or more | Average day-30 retention is 6% across apps and 11.6% for finance apps ([Plotline](https://www.plotline.so/blog/retention-rates-mobile-apps-by-industry)) |
| Testers who can explain "100 → 160 est." and why it moves | 8 of 10 | Full spec's comprehension test, target proposed |
| Ledger and settlement errors | Zero | Full spec's pilot exit rule: no reconciliation breaks, no settlement errors |
| Users who try a simulated top-up; average amount | Measured, no target | Signal of real-money demand; no benchmark found |
| Realized house margin per market: (fees − market-maker loss) ÷ stakes | Measured, no target | Shows how close locked odds come to the 10% fee in practice |

The POC tests demand and operations, not profit. The full spec estimates break-even at roughly 70,000–85,000 monthly active bettors under its own assumptions, which a 12-week POC cannot show.

## Team, timeline and cost

With 2–4 developers the POC takes an estimated 12 weeks to build and 12 weeks to run, at $0 a month in services: every service stays on its free tier. The timeline is an estimate, not sourced.

&#91;embedded content: POC roadmap · 3 build phases, 1 run phase, 2 gates\]

Weeks are counted from the team's start date, which is not set yet.

**People besides developers.** The two-person rules need at least two staff who are not the same person for market approval and resolution, plus KYC reviewers to meet the 24-hour target. Design is needed for the screens listed under Branding.

**Free-tier limits the POC must stay within**

| Service | Free limit | What the POC does about it | Source |
| --- | --- | --- | --- |
| Vercel Hobby | 100 GB data transfer and 1M function invocations a month; one developer seat; no extra usage can be bought | Watch usage monthly; at 1,000 users this is far from the limits | [Vercel](https://vercel.com/pricing) |
| Supabase Free | 2 projects; 500 MB database, 1 GB files, 5 GB egress, 50,000 monthly active users; paused after 1 week of inactivity; no backups; 1-day log retention | One project for production, one for staging; nightly `pg_dump` backup from GitHub Actions; ID images stay with Didit, not in Supabase Storage | [Supabase](https://supabase.com/pricing) |
| Didit KYC | 500 full checks a month | Stop new applications at 500 a month; the 1,000-user target fits across 12 weeks | [Didit](https://didit.me/solutions/countries/philippines/) |
| SMTP email provider | The provider's free daily cap | Send only auth and KYC/settlement emails; set Supabase's auth email rate limit to match | [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) |
| GitHub Free (private repo) | Limited Actions minutes a month; no branch protection | CI runs on PRs only plus `main`; "no commits to `main`" is a team rule, not enforced | [GitHub pricing](https://github.com/pricing) |

Staff salaries are not included.

## Risks and open questions

The largest risk is regulatory perception: a betting-style app, even with free coins, launches months after PAGCOR had Polymarket blocked.

| Risk | Mitigation |
| --- | --- |
| Regulators read the POC as promoting gambling ([BitPinas](https://bitpinas.com/feature/exclusive-globe-polymarket-order/)) | No money, prizes or coin sales; "Simulation" labels; counsel review before launch |
| Full KYC deters sign-ups for a free product | Measure each step; the approval-rate target shows whether it is too costly |
| Holding ID images for a free app | Collect only ID, selfie and liveness; private storage; access limited to KYC staff; privacy impact assessment |
| Fuel markets resolve ambiguously because DOE has used both a range and a single figure in 2026 | Each market's rules name the exact figure and a backup source |
| Too few markets to keep users coming back (one weekly, the rest monthly or per event) | Day-30 retention target makes this visible early |
| Leaked figures let a few users top the leaderboard | Close markets before known pre-announcements; flag large late forecasts |
| Vercel reads the POC as commercial use of Hobby: its guidelines count "financial gain for anyone involved", including paid developers ([Vercel](https://vercel.com/docs/limits/fair-use-guidelines)) | The POC takes no payments, shows no ads and sells nothing; ask Vercel support if unsure; move to Pro post-POC |
| Vercel Hobby only deploys commits authored by the account owner when the repo is private ([Vercel Community](https://community.vercel.com/t/hobby-account-private-repo-collaborators-deployment-blocked/1030)) | The Vercel account owner merges PRs, or CI deploys with the owner's token; move to Pro post-POC |
| Supabase Free has no backups, so a bad migration could lose the ledger | Nightly `pg_dump` from GitHub Actions; test a restore before launch |
| Supabase Free pauses a project after a week without activity | Live markets and scheduled jobs keep production active; resume staging by hand when needed |
| Free caps hit mid-run (Didit 500 a month, Supabase 500 MB, email daily cap) | Hard stop on applications at 500 a month; monitor database size and email volume weekly |

**Open questions for the team**

- [ ] Locked-odds settings: the 5% opening floor, the worst-case loss share m, and the opening method per template
- [ ] Fee basis for locked odds: 10% of the stake, or 10% of the profit (keeps favourites worth buying, earns less on them)
- [ ] Starting coin grant (proposed 1,000)
- [ ] Success targets in the table above
- [ ] Counsel: simulated peso top-ups, KYC for a free app, KYC data held in Singapore
- [ ] Who staffs KYC review, market approval and resolution
- [ ] BSP 2027 meeting dates, from BSP, before the BSP template goes live
- [ ] Who owns the Vercel Hobby account (only that person's commits deploy)
- [ ] Which free SMTP provider sends auth email

## Post-POC: paid integrations

The POC subscribes to no paid plans. If the success criteria hold and the team continues, integrate the items below. Prices are as checked in October 2026; confirm them before subscribing.

| # | Item | What it adds | What changes | Cost (USD) | Source |
| --- | --- | --- | --- | --- | --- |
| 1 | Vercel Pro | Commercial use allowed; team seats, so any developer's commits deploy | Move both projects from the Hobby account to a Pro team | $20 per developer seat a month: $40–$80 for 2–4 | [Vercel](https://vercel.com/pricing) |
| 2 | Supabase Pro | Daily backups kept 7 days; no pausing; 8 GB disk per project | Upgrade the organization; keep the nightly `pg_dump` only as an off-site copy | From $25 a month, including $10 of compute credits | [Supabase](https://supabase.com/pricing) |
| 3 | Supabase point-in-time recovery (optional) | Restore to any moment in the last 7 days | Enable on the production project | $100 a month | [Supabase](https://supabase.com/pricing) |
| 4 | Supabase Team | SOC 2 and ISO 27001 coverage | Needed for the real-money phase | $599 a month | [Supabase](https://supabase.com/pricing) |
| 5 | Twilio SMS for phone OTP | Mobile number verified at sign-up, as in the full spec | Add mobile OTP back to the application flow through Supabase phone login with Twilio; the architecture diagram already shows it | $0.241 per SMS to a Philippine mobile: about $120 for 500 sign-ups at one OTP each | [Supabase phone login](https://supabase.com/docs/guides/auth/phone-login), [Twilio](https://www.twilio.com/en-us/sms/pricing/ph) |
| 6 | Didit above 500 checks a month | More than 500 applications a month | Remove the monthly application cap | $0.33 per full check after the first 500 | [Didit](https://didit.me/solutions/countries/philippines/) |
| 7 | Custom domain | Branded address for the public app and a staff subdomain | Register the domain, point both Vercel projects at it, update auth redirect URLs | Domain registration, not yet priced | — |
| 8 | GitHub Pro (personal) or Team (organization) | Branch protection on a private repo | Add a ruleset on `main`: PR required, 1 approval, CI must pass | See GitHub pricing | [GitHub](https://github.com/pricing) |
| 9 | Turborepo remote cache on Vercel | CI and developers reuse each other's build results | In `.github/workflows/ci.yml`, set job `env` `TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}` and `TURBO_TEAM: ${{ vars.TURBO_TEAM }}`; create a Vercel token for the team and add it as the repo secret `TURBO_TOKEN`, with the team slug as the variable `TURBO_TEAM`. Turborepo recommends OIDC instead (`vercel/setup-turborepo-remote-cache-action`) once a Vercel team exists. Locally: `pnpm turbo login`, then `pnpm turbo link` | Comes with the Vercel team | [Turborepo: GitHub Actions](https://turborepo.com/docs/guides/ci-vendors/github-actions) |
| 10 | Paid email plan | Higher sending volume | Upgrade the SMTP provider's plan, then raise Supabase's auth email rate limit | Depends on the provider | — |

The monthly floor after the POC, with 2–4 developers and without point-in-time recovery or the Team plan, is Vercel Pro plus Supabase Pro plus OTP for 500 sign-ups: about $185–$225 a month.

## Sources

All links were opened on 19 October 2026, except the free-tier figures (Vercel and Supabase pricing pages, Vercel fair use guidelines and community thread), which were checked on 20 October 2026. Benchmarks and break-even figures marked "full spec" come from the [PH Event-Betting App — Technical Specification](https://claude.ai/code/artifact/c270058a-9bab-46e4-a109-35be595edf95), which carries its own sources.

- Regulation: [AGBrief](https://agbrief.com/news/27/10/2025/philippines-law-keeps-prediction-markets-at-bay/), [BitPinas](https://bitpinas.com/feature/exclusive-globe-polymarket-order/), [Lawyer Philippines](https://www.lawyer-philippines.com/articles/a-comprehensive-legal-overview-of-philippine-regulations-on-online-gaming-applications), [Batas Natin — Data Privacy Act](https://batasnatin.com/laws/data-privacy-act-principles-of-lawful-processing), [PSA — PhilSys authentication](https://psa.gov.ph/content/philsys-authentication-services-strengthen-transaction-security)
- Market sources: [Daily Tribune, 29 June 2026](https://tribune.net.ph/2026/06/29/fuel-prices-split-course-as-doe-eases-pricing-controls), [Daily Tribune, 13 July 2026](https://tribune.net.ph/2026/07/13/renewed-oil-volatility-prompts-doe-to-revisit-fuel-pricing-rules), [GMA](https://www.gmanetwork.com/news/money/economy/1004884/inflation-snaps-four-month-easing-accelerates-to-7-2-in-september-2026/story/), [FocusEconomics](https://www.focus-economics.com/countries/philippines/news/monetary-policy/philippines-central-bank-meeting-18-06-2026-bsp-raises-rates-in-june/), [PesoHub](https://www.pesohub.ph/government/bsp/bsp-exchange-rate-guide/), [PAGASA](https://pagasa.dost.gov.ph/learning-tools/tropical-cyclone-wind-signal)
- Stack and costs: [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps), [Vercel pricing](https://vercel.com/pricing), [Supabase pricing](https://supabase.com/pricing), [Supabase regions](https://supabase.com/docs/guides/platform/regions), [Supabase Cron](https://supabase.com/docs/guides/cron), [Supabase phone login](https://supabase.com/docs/guides/auth/phone-login), [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa), [PostgREST transactions](https://docs.postgrest.org/en/stable/references/transactions.html), [Hetzner Singapore](https://www.hetzner.com/cloud-singapore/), [Didit](https://didit.me/solutions/countries/philippines/), [Twilio](https://www.twilio.com/en-us/sms/pricing/ph)
- Other: [Tagalog.com](https://tagalog.com/dictionary/tantiya), [Plotline](https://www.plotline.so/blog/retention-rates-mobile-apps-by-industry)

* Pricing and opening odds: [Hanson, 2003](https://healy.econ.ohio-state.edu/pubfiles/infomkts/litreview/Hanson%20-%20Combinatorial%20Information%20Market%20Design%2003.pdf), [Othman et al., 2010](https://www.cs.cmu.edu/~./theorylunch/pastSemesterIndices/20100922.html), [Li and Vaughan, 2013](https://www.jennwv.com/papers/liquidity.pdf), [LSports](https://lsports.eu/blog/how-do-bookmakers-set-odds-overround-explained), [DZRH](https://www.dzrh.com.ph/post/oil-prices-expected-to-rise-by-p17-p24-per-liter-this-week-doe), [Philstar, 30 May 2026](https://www.philstar.com/business/science-and-environment/2026/05/30/2531635/bsp-projects-may-inflation-71-79-amid-food-forex-pressures), [Philstar, 5 June 2026](https://www.philstar.com/headlines/2026/06/05/2533026/inflation-slows-68-may-2026-amid-easing-transport-food-costs), [BusinessWorld](https://bworldonline.com/?p=717211)

- Two-sided markets: [Bleacher Nation](https://www.bleachernation.com/betting/2026/06/06/how-do-sportsbooks-determine-the-spread/), [Levitt, 2004, via AcaWiki](https://acawiki.org/Why_are_Gambling_Markets_Organised_So_Differently_from_Financial_Markets%3F), [Newall and Cortis, 2021](https://ideas.repec.org/a/gam/jrisks/v9y2021i1p22-d478780.html), [Burgi, Deng and Whelan, 2026](https://cepr.org/voxeu/columns/economics-kalshi-prediction-market), [No-trade theorem](https://en.wikipedia.org/wiki/No-trade_theorem), [StuartXchange](https://stuartxchange.org/Sabong), [Allium](https://allium.so/blog/kalshi-fees-why-the-cost-peaks-near-50-cents/), [BotForKalshi](https://www.botforkalshi.com/blog/can-you-bet-on-inflation)
