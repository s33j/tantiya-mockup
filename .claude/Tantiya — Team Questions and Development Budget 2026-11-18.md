# Tantiya: Team Questions and Development Budget

November 18, 2026 · Draft for team review

## Summary

To keep building after the December prototype, and to pitch investors, we need answers from each team and a development budget. This document lists the questions for each team and sets a 12-month development budget in pesos, within the ₱5 million cap.

| Budget | Amount | What it pays for |
| --- | ---: | --- |
| First 6 months | ₱2,062,221 | A security-tested play-money app, ready to launch, run as a closed beta |
| 12 months (base) | ₱3,800,663 | The above, plus 6 months of public operation |
| Real-money add-on | ₱1,038,970 | Payments, withdrawals and AML checks. Spent only if Legal confirms a license path |
| Base + add-on | ₱4,839,633 | ₱160,367 under the cap |

Team pay is 68% of the base budget, subscriptions and usage 13%, the security test 10%, and the contingency 9%. Legal fees, licenses, marketing and operations staff are not included; see [Not in this budget](#not-in-this-budget).

**Two things to know first**

1. **Identity checks now cost money from the first one.** On 1 November 2026, Didit replaced its 500 free checks a month with $10 of monthly credit, about 30 full checks ([Didit](https://didit.me/blog/new-pricing-november-2026/)). The POC proposal's free-tier plan counted on the 500. This budget prices checks at $0.33 each, after the monthly credit.
2. **Election-linked questions need Legal's written sign-off before we build them.** The law bans betting on "any contingency connected with an election", so rewording a question may not help when an election result decides it. See the [Legal team](#legal-team) questions.

## What we need from each team

### Legal team

**1. What do we need before a public play-money launch?**

- Which company signs vendor contracts and holds user data, and is it registered (SEC, BIR, local permits)?
- NPC registration is mandatory for anyone processing sensitive personal information of 1,000 or more people ([NPC Circular 2022-04](https://privacy.gov.ph/wp-content/uploads/2023/05/Circular-2022-04.pdf)). KYC collects government IDs and selfies, and the plan passes 1,000 approved users in month 4 of the closed beta. What do we file, and who is our Data Protection Officer?
- PAGCOR had Polymarket blocked in May 2026 ([BitPinas](https://bitpinas.com/feature/exclusive-globe-polymarket-order/)). Does a free-coin app with no prizes need anything from PAGCOR?
- The counsel items still open from the [POC proposal](<Tantiya — Play-Money POC Proposal.md>): simulated peso top-ups, full KYC for a free app, and KYC data held abroad.
- Coin records can't be erased. How do we answer erasure requests under the Data Privacy Act?
- Who drafts the terms of use, privacy notice and market rules?

**2. Election-linked questions (new)**

The team wants survey-style questions, for example "Who do people think will help the country more by 20XX?", with election results deciding the answer.

- The Omnibus Election Code makes it an election offense for anyone who "bets or wagers upon the outcome of, or any contingency connected with an election" (Sec. 261(c)). The penalty is 1 to 6 years in prison with no probation (Sec. 264), and the stakes are forfeited to the government ([BP 881](https://lawphil.net/statutes/bataspam/bp1985/bp_881_1985.html)). The POC proposal left election markets out for this reason.
- Does rewording change anything when an election result decides the question?
- Is it allowed with free coins that have no cash value and no prizes? Is it allowed with real money?
- Would questions decided by survey results instead of election results, and asked outside election periods, be treated differently?
- During an election period, anyone who publishes an election survey must also publish who paid for it, the firm, the fieldwork dates and method, the sample and the margin of error ([RA 9006, Sec. 5.2](https://lawphil.net/statutes/repacts/ra2001/ra_9006_2001.html)). Does that apply if the app shows survey results?

We recommend a written opinion before Development builds these questions.

**3. Should the app be hosted in the Philippines or abroad?**

Today the database and sign-in run on Supabase in Singapore (Supabase has no Philippine region), the app is served by Vercel, and ID images stay with Didit. Under the Data Privacy Act, we stay responsible for personal data processed abroad ([RA 10173, Sec. 21](https://lawphil.net/statutes/repacts/ra2012/ra_10173_2012.html)).

- Is hosting abroad acceptable for the play-money launch?
- For real money, do PAGCOR or BSP rules require servers or data in the Philippines? If so, Development must re-plan hosting, and that cost is not in this budget.

**4. What are the fintech requirements for real money?**

- Which license, from whom? Legal commentary in 2025 said PAGCOR has no license category for prediction markets ([AGBrief](https://agbrief.com/news/27/10/2025/philippines-law-keeps-prediction-markets-at-bay/), [Chambers](https://chambers.com/articles/prediction-markets-booming-globally-but-a-legal-gamble-in-the-philippines)).
- Can we hold user balances ourselves, or does that need a BSP license or a licensed partner holding the funds?
- Would we be a covered person under the Anti-Money Laundering Act (customer checks, record keeping, reports to AMLC)?
- What taxes apply to fees and winnings?
- Senate Bill 47, filed in July 2025, would ban online gambling outright ([Manila Bulletin](https://mb.com.ph/2025/07/04/senate-bill-seeks-outright-ban-of-online-gambling-in-the-philippines)). How would it affect the plan?
- What will license fees, bonds, minimum capital and legal work cost, and how long will each take? If the ₱5M cap must also cover legal work, about ₱1.2M is left after the base budget, or ₱160,367 with the add-on.

Development can give Legal a data map (what we collect, where it's stored, which vendor sees it) and the vendor list.

### Development team

Answered in [Development budget](#development-budget):

| Question from the draft | Answer |
| --- | --- |
| What subscriptions do we need, and how much, for a year of development? | ₱186,950 for 12 months, VAT included. See [Subscriptions](#subscriptions) |
| Target number of users per month | 300 new approved users a month in the closed beta, then 1,000 a month after launch. See [Users per month](#users-per-month) |
| Consumption-wise, what should we allocate? | ₱301,698 for 12 months in the base case, ₱805,496 in the high case. See [Usage costs](#usage-costs) |

Still open for us:

- **Apps:** stay a PWA, or also publish store apps? Apple's developer program is $99 a year and Google Play is $25 once, but Apple can reject an app that is mostly a website in a wrapper. Not in this budget.
- **Didit plan:** pay as you go during the beta; switch to Growth ($99 a month) or Scale ($299 a month) when volume justifies it.
- **Hosting:** if Legal requires Philippine hosting, the hosting plan changes.

### Research team

**Which survey firms should we use?** Start from the firms that ran 2025 Senate surveys ([Wikipedia](https://en.wikipedia.org/wiki/Opinion_polling_for_the_2025_Philippine_Senate_election)). For each, tell us how close its final survey came to the results, how often it publishes, and whether we may show its data in the app. Pre-election surveys missed several 2025 Senate results, and Pulse Asia said it would review its methods ([Inquirer](https://www.inquirer.net/443401/when-pre-poll-surveys-go-way-off-mark/), [Inquirer](https://www.inquirer.net/?p=445349)), so track record matters more than name.

| Firm | 2025 Senate surveys listed | Last fieldwork before the 12 May 2025 election |
| --- | ---: | --- |
| Social Weather Stations (SWS) | 5 | 2–6 May |
| Pulse Asia | 5 | 6–9 May |
| OCTA Research | 5 | 20–24 April |
| The Center | 4 | 28 April–3 May |
| WR Numero | 3 | 23–30 April |
| Arkipelago Analytics | 3 | 26 April–1 May |
| Publicus Asia | 2 | 1 May |
| DZRH | 2 | 12–14 April |
| RMN–Oculum | 0 | December 2024 |
| Peers Agency | 0 | October 2024 |

Also:

- Which official result decides each question: COMELEC's canvass and proclamation, or an unofficial count? When does a result count as final?
- Which elections and dates will decide questions? The next national and local elections are in May 2028.
- Which recurring surveys outside elections, such as trust and performance ratings, could anchor questions?

### Data Science team

**What data sets each question's opening odds, and how do we turn it into probabilities?** (The draft's "What are the odds to be used in calculating the odds?")

- **Survey-style questions:** how to turn survey shares, margins of error and undecided voters into opening probabilities, and how to weight firms by track record (from Research).
- **The five economic templates:** confirm or replace the anchors in the POC proposal: DOE price guidance, BSP's inflation forecast range, analyst polls, BSP's reference rate and PAGASA bulletins.
- **Settings the POC proposal left open:** the 5% opening floor, the liquidity setting per template, the share of stakes the house may lose in the worst case, and whether the 10% fee is on the stake or on the profit.
- **Long questions:** how to price questions that resolve in 2028 and keep them active for over a year.
- **Measurement:** confirm accuracy (Brier score) and house margin per market ((fees − market-maker loss) ÷ stakes) as the ways we judge each market.
- **Data access:** what you need from the app (exports, read-only database access, dashboards). This budget includes no extra data tools, so tell us early.

### Marketing team

- **Audience and message:** who is the launch audience (adults 21+ in the Philippines who pass ID checks), and what is the message?
- **User targets:** Development planned for 300 new approved users a month in the closed beta and 1,000 a month after launch. Do you agree? What will each approved user cost by channel, and what is your budget?
- **Channels and rules:** Senate Bill 2347 and House Bill 10982, both filed in 2026, would ban online gambling ads ([Gambling.com](https://www.gambling.com/news/philippines-bill-would-ban-online-gambling-ads), [AGBrief](https://agbrief.com/news/philippines/01/09/2026/philippine-house-bill-seeks-nationwide-ban-on-public-advertising-of-online-gambling/)). Would they cover a free-coin forecasting app? Ad platforms also have their own gambling ad rules.
- **Safer play:** the rules exclude bonuses, streaks and daily rewards. How will you bring people in, and back, within them?
- **Brand:** there is no logo yet. Which domain name (one .ph domain is budgeted)? Store listings, if we publish apps?
- **Revenue for the pitch:** the POC earns nothing. Which model do we show investors: sponsored markets, subscriptions, ads, or a fee on real money after a license?
- **Break-even:** the full technical spec puts real-money break-even at 70,000–85,000 monthly active bettors. The base plan here reaches 7,800 approved users by month 12. What growth plan gets there, and when?
- **Support:** who answers users, through which channel, and how fast?
- **Budget:** if the ₱5M cap must also cover marketing, about ₱1.2M is left after the base development budget, shared with Legal.

## Development budget

### Assumptions

| Item | Assumption |
| --- | --- |
| Period | 12 months, starting when funding starts after the December prototype; the start date is still to be set |
| Scope | A play-money app, launched publicly in month 7. Real-money work only in the add-on |
| Exchange rate | ₱65 per US$, rounded up from ₱63.62 on 2 November 2026, with the peso near record lows |
| Prices | From each vendor's own pricing page, checked 18 November 2026 |
| VAT | 12% added to foreign online services (RA 12023) and to the security test. Semaphore's site lists its price both with and without VAT, so we add VAT to be safe |
| Team | Paid as contractors at monthly rates. Hiring employees would add 13th-month pay and SSS, PhilHealth and Pag-IBIG contributions |
| Contingency | 10% of each period's costs |

### What the money buys

| Months | Development work | Users |
| --- | --- | --- |
| 1–6 | Finish and harden what the December prototype leaves open; move to paid plans, a .ph domain and a proper email sender; add phone OTP at sign-up; build survey-style questions only after Legal's sign-off; security test and fixes; support the privacy impact assessment; test a backup restore | Closed beta |
| 7–12 | Public launch in month 7; improve from real usage; keep costs and speed in check. If the add-on is approved: build payments in months 7–10, test them, and go live from month 10 at the earliest, license permitting | Public |

### Users per month

| Case | New approved users a month, months 1–6 | Months 7–12 | Approved users by month 12 | Basis |
| --- | ---: | ---: | ---: | --- |
| Low | 300 | 300 | 3,600 | No growth after launch |
| **Base (the plan)** | 300 | 1,000 | 7,800 | Beta close to the POC's target pace (1,000 in 12 weeks), about three times that after launch. Marketing to confirm |
| High | 300 | 3,000 | 19,800 | A strong launch; used to stress-test the budget |

These are planning assumptions, not forecasts. Supabase Pro includes 100,000 monthly active users, so even the high case fits the plan. Users mainly drive identity-check and SMS costs: about ₱39.80 per approved user, VAT included (₱36.04 for KYC, ₱3.76 for SMS).

### Subscriptions

| Service | What it's for | Plan | US$ a month | 12 months (₱) |
| --- | --- | --- | ---: | ---: |
| Vercel | Hosting for the app and the staff console | Pro: 2 developer seats at $20; designer and QA as viewer seats (no charge listed) | 40 | 31,200 |
| Supabase | Database, sign-in, files, scheduled jobs | Pro $25 with a $10 compute credit; Small production ($15) and Micro staging ($10) | 40 | 31,200 |
| Resend | Sign-up, KYC and settlement email, replacing the Gmail sender | Pro: 50,000 emails a month | 20 | 15,600 |
| Sentry | Error alerts | Team, billed yearly | 26 | 20,280 |
| GitHub | Code, reviews, CI, protected `main` branch | Team: 3 users at $4 | 12 | 9,360 |
| Figma | Screen design | Professional: 1 Full seat | 16 | 12,480 |
| Claude | AI coding assistant; the team already builds with Claude Code, which Pro includes | Pro, billed yearly: 2 developers at $17 | 34 | 26,520 |
| Bitwarden | Shared vault for service passwords and keys | Teams, billed yearly: 4 users at $4 | 16 | 12,480 |
| Zoho Mail | Team and support mailboxes on our domain | Mail Lite, billed yearly: 5 at $1 | 5 | 3,900 |
| .ph domain | Branded web and email address | About $60 a year | 5 | 3,900 |
| **Subtotal** | | | **214** | **166,920** |
| VAT 12% | | | | 20,030 |
| **Total** | | | | **186,950** |

Heavy daily use of Claude Code may need Claude Max at $100 a month per developer.

### Usage costs

12 months, in pesos:

| Item | Unit price | Low | Base | High |
| --- | --- | ---: | ---: | ---: |
| Identity checks (Didit) | $0.33 per full check, after $10 of free credit a month | 108,030 | 243,165 | 629,265 |
| Phone OTP (Semaphore) | ₱0.56 per credit, plus VAT | 13,548 | 29,353 | 74,511 |
| Bigger database and email plans | High case only, months 7–12: Supabase Medium (+$45) and Resend 100,000 emails (+$15) a month | 0 | 0 | 23,400 |
| VAT 12% on foreign services | | 12,964 | 29,180 | 78,320 |
| **Total** | | **134,542** | **301,698** | **805,496** |

- **Checks per user:** 1.5 full checks per approved user, to cover people who fail or retry. Replace with POC data.
- **SMS per user:** 6 credits per approved user: about 2 applications per approval (the POC's 50% target), 1.5 texts each, and 2 credits per OTP text. Semaphore's site doesn't list OTP pricing, so 2 credits is a cautious guess. Semaphore would connect through Supabase's Send SMS hook; the POC proposal's Twilio option was $0.241 a text.
- **Cheaper Didit plans:** Growth costs about 9% less than pay-as-you-go at beta volume; Scale about 19% less at the base case's 1,500 checks a month.

### Team

| Role | Full-time monthly rate (₱) | Time | Months 1–6 (₱) | Months 7–12 (₱) | 12 months (₱) |
| --- | ---: | --- | ---: | ---: | ---: |
| Lead full-stack developer | 100,000 | Full time | 600,000 | 600,000 | 1,200,000 |
| Full-stack developer | 70,000 | Full time | 420,000 | 420,000 | 840,000 |
| UI/UX designer | 65,000 | Half time, then quarter time from month 7 | 195,000 | 97,500 | 292,500 |
| QA tester | 45,000 | Half time | 135,000 | 135,000 | 270,000 |
| **Total** | | | **1,350,000** | **1,252,500** | **2,602,500** |

Rates come from November 2026 JobStreet job-ad averages and a 2026 engineering salary report:

- **Lead developer:** JobStreet full-stack averages run ₱82,000–₱125,000 by city (Taguig ₱100,000). The report puts senior engineers at ₱100,000–₱180,000.
- **Developer:** the report puts mid-level engineers at ₱50,000–₱90,000. JobStreet's typical front-end developer pay is ₱69,000.
- **Designer:** JobStreet UX designer averages run from ₱62,500 (provinces) to ₱110,000 (Taguig).
- **QA:** JobStreet software tester averages run from ₱42,500 (provinces) to ₱60,000 (Taguig).

Replace these with the team's agreed rates.

### One-time costs

| Item | Cost (₱) | Notes |
| --- | ---: | --- |
| Security test (penetration test) of the app and staff console, before public launch | 364,000 | US$5,000 plus VAT, the low end of published web-app ranges ($5,000–$20,000). We found no published Philippine prices, so get 2–3 quotes |

### Budget by period

Base case, in pesos:

| Category | Months 1–6 | Months 7–12 | 12 months |
| --- | ---: | ---: | ---: |
| Team | 1,350,000 | 1,252,500 | 2,602,500 |
| Subscriptions, VAT included | 93,475 | 93,475 | 186,950 |
| Usage, base case, VAT included | 67,271 | 234,427 | 301,698 |
| Security test | 364,000 | — | 364,000 |
| Subtotal | 1,874,746 | 1,580,402 | 3,455,148 |
| Contingency 10% | 187,475 | 158,040 | 345,515 |
| **Total** | **2,062,221** | **1,738,442** | **3,800,663** |

With low-case usage the 12-month total is about ₱3.62 million; with high-case usage, about ₱4.35 million.

### Real-money add-on

Only if Legal confirms a license path. A third developer builds payments in months 7–10. Real money goes live in month 10 at the earliest, so running costs cover months 10–12.

| Item | Cost (₱) | Notes |
| --- | ---: | --- |
| Payments developer, months 7–10 | 280,000 | ₱70,000 a month. Replaces the simulated top-up and withdraw with real ones, plus reconciliation and AML flags |
| Security test of payments and withdrawals | 364,000 | US$5,000 plus VAT |
| Supabase Team plan, 3 months | 111,930 | $574 a month over Pro. The POC proposal lists it as needed for real money (SOC 2 and ISO 27001 coverage) |
| Point-in-time database recovery, 3 months | 19,500 | $100 a month; restore to any moment in the last 7 days |
| AML screening (Didit) | 136,890 | $0.20 per person, plus $0.07 per person a year for ongoing monitoring, for 7,800 users |
| VAT 12% on foreign services | 32,198 | |
| Contingency 10% | 94,452 | |
| **Total** | **1,038,970** | |

Each month after go-live adds about ₱49,067 (Team plan ₱41,787, recovery ₱7,280), plus ₱19.66 of AML checks per new user.

Paid from transaction volume, not this budget: payment fees. PayMongo, for example, charges 2.23% for GCash, 1.79% for Maya, 1.34% for QR Ph, 3.125% + ₱13.39 for local cards and ₱10 per payout, plus 12% VAT on each fee.

Not included: license fees, bonds and minimum capital. Legal to advise.

### Not in this budget

- Legal work, licenses, bonds and minimum capital (Legal team)
- Marketing and user acquisition (Marketing team)
- Operations staff from the closed beta on: KYC reviewers, the two people needed to approve and resolve markets, and user support
- Company setup, accounting, and taxes other than VAT
- Equipment, office space and internet
- Employer costs if team members are hired as employees
- Hosting in the Philippines, if Legal requires it
- Native iOS and Android apps

## Sources

Prices were checked on each vendor's own pricing page on 18 November 2026 unless noted.

- **Services:** [Vercel](https://vercel.com/pricing), [Supabase](https://supabase.com/pricing), [Didit pricing](https://didit.me/pricing) and [November 2026 change](https://didit.me/blog/new-pricing-november-2026/), [Resend](https://resend.com/pricing), [Semaphore](https://www.semaphore.co/) and [its FAQ](https://www.semaphore.co/faq), [Sentry](https://sentry.io/pricing/), [GitHub](https://github.com/pricing), [Figma](https://www.figma.com/pricing/), [Claude](https://claude.com/pricing), [Bitwarden](https://bitwarden.com/pricing/business/), [Zoho Mail](https://www.zoho.com/mail/zohomail-pricing.html), [PayMongo](https://www.paymongo.com/pricing), [.ph domain prices](https://domainoffer.net/tld/ph) (October 2026 snapshot)
- **Exchange rate:** [ADB AsianBondsOnline](https://asianbondsonline.adb.org/economy/?economy=PH&page=1) (₱63.616 per US$ on 2 November 2026)
- **VAT on digital services:** [EY Tax News](https://taxnews.ey.com/news/2024-1874-philippines-passes-vat-on-digital-services-law-affecting-nonresident-providers), [Grant Thornton Philippines](https://www.grantthornton.com.ph/insights/articles-and-updates1/lets-talk-tax/navigating-the-complexities-of-vat-liabilities-of-non-resident-digital-service-providers/)
- **Salaries:** JobStreet, November 2026: [full-stack developer](https://ph.jobstreet.com/career-advice/role/full-stack-developer/salary), [user experience designer](https://ph.jobstreet.com/career-advice/role/user-experience-designer/salary), [software tester](https://ph.jobstreet.com/career-advice/role/software-tester/salary); [Philippines Engineering Salary Report 2026](https://dev.to/devwithzach/philippines-engineering-salary-report-2026-is-now-live-4ch7)
- **Security test cost:** [ONES](https://ones.com/blog/?p=1261394), [Packetlabs](https://packetlabs.net/posts/web-application-security-testing-pricing)
- **Law:** [Omnibus Election Code (BP 881)](https://lawphil.net/statutes/bataspam/bp1985/bp_881_1985.html), [RA 9006](https://lawphil.net/statutes/repacts/ra2001/ra_9006_2001.html), [RA 10173](https://lawphil.net/statutes/repacts/ra2012/ra_10173_2012.html), [NPC Circular 2022-04](https://privacy.gov.ph/wp-content/uploads/2023/05/Circular-2022-04.pdf), [Baker McKenzie on NPC registration](https://insightplus.bakermckenzie.com/bm/data-technology/philippines-new-npc-circular-on-registration-of-data-protection-officers-and-data-processing-systems-takes-effect_1)
- **Regulation news:** [BitPinas](https://bitpinas.com/feature/exclusive-globe-polymarket-order/), [AGBrief, October 2025](https://agbrief.com/news/27/10/2025/philippines-law-keeps-prediction-markets-at-bay/), [Chambers](https://chambers.com/articles/prediction-markets-booming-globally-but-a-legal-gamble-in-the-philippines), [Senate Bill 47](https://digitalpolicyalert.org/event/32387-act-no47-on-prohibition-of-online-gambling-and-the-placing-of-wagers-or-bets-through-the-internet-or-any-form-of-online-gambling-activities-was-introduced-to-the-senate), [Manila Bulletin](https://mb.com.ph/2025/07/04/senate-bill-seeks-outright-ban-of-online-gambling-in-the-philippines), [Gambling.com](https://www.gambling.com/news/philippines-bill-would-ban-online-gambling-ads), [AGBrief, September 2026](https://agbrief.com/news/philippines/01/09/2026/philippine-house-bill-seeks-nationwide-ban-on-public-advertising-of-online-gambling/)
- **Surveys:** [Opinion polling for the 2025 Philippine Senate election](https://en.wikipedia.org/wiki/Opinion_polling_for_the_2025_Philippine_Senate_election), [Inquirer: When pre-poll surveys go way off mark](https://www.inquirer.net/443401/when-pre-poll-surveys-go-way-off-mark/), [Inquirer: Pulse Asia on its off-target survey](https://www.inquirer.net/?p=445349)
- **Internal:** [Play-Money POC Proposal](<Tantiya — Play-Money POC Proposal.md>) (October 19, 2026), [Progress Report](<Tantiya — Progress Report 2026-11-06.md>) (November 6, 2026)
