# Tantiya: Development Progress Report

As of November 6, 2026

## Summary

The foundation of Tantiya is built and running. People can now create an account, verify their email, and sign in on the live site, and the system that tracks coins is in place. The features users came for, such as markets, forecasting, and identity checks (KYC), are the next stage of work.

**This is a proof-of-concept (POC) version.** It uses free virtual coins with no cash value, and no real money is involved. It tests whether people sign up, verify, and come back. Features and values in this version may change or be removed before any full release. For example, the **1,000-coin gift on account approval applies to the POC only**.

Live address: https://tantiya-murex.vercel.app

## What's finished

| Work | What it means |
| --- | --- |
| Project setup | One shared codebase for the public app and the staff console, with automatic quality checks on every change |
| Databases and backups | Separate production and test databases, with security rules on every table and an automatic nightly backup of production, kept 30 days |
| Design foundation | Tantiya's colors and type, the main navigation, and English and Filipino throughout |
| Accounts and email | Sign-up with 21+ and Philippines declarations, email verification, sign-in, sign-out, and password reset, tested on the live site with real email |
| Coin system | Every coin movement is permanently recorded and must balance. Each approved user gets a wallet and a one-time 1,000-coin grant. Balances are compared to the records every night |

Production runs in Singapore, the closest available region to Manila. The test database is in Mumbai, which does not affect users.

### Built, in review, not yet live

- Wallet page showing balances and coin history
- An extra confirmation step on email links, so automated email scanners can't use them up
- Show-password option and smaller sign-in improvements
- An alert to the team if a nightly coin check fails

## What you can and can't see today

- **Working now:** sign-up, email verification, sign-in, sign-out, password reset, language switching
- **Not built yet:** the Markets page is empty, and My bets and Watchlist show "not found" after sign-in. Wallet does too until the review above is complete
- **No one can receive coins through the app yet:** coins are granted on approval, and the review that approves accounts isn't built

## Remaining work

| Area | What's left |
| --- | --- |
| Identity checks (KYC) | ID capture, selfie and liveness through Didit, face match, and duplicate-person check |
| Staff console | Staff sign-in, KYC review queue, market builder with two-person approval, resolution queue, withdrawal approvals, user view, and audit log |
| Markets | Yes/No and numeric-band markets, market pages, charts, and the five launch templates |
| Forecasting | Odds calculation, bet slip, My bets, settlement, and 24-hour disputes |
| Odds display | Payout-first view, other odds formats, and Llamado and Dehado labels |
| Simulated top-up and withdraw | In-app mocks with caps and status steps; no money is charged |
| Safer play | Limits, reality checks, cooling-off, self-exclusion, and account closure |
| Leaderboard and analytics | Accuracy ranking and badges, personal analytics, and CSV export |
| Notifications | Web push, plus email for KYC decisions and settlements |
| Before launch | Test restoring a backup, privacy impact assessment, counsel sign-off, and remaining screen designs |

## What we need to move forward

- **Start date and schedule:** the proposal counts about 12 weeks of build and 12 of live running from a start date that still needs confirming
- **Legal counsel:** review of simulated peso top-ups, full KYC for a free app, and KYC data held in Singapore
- **Staff:** at least two people for market approval and resolution, plus KYC reviewers
- **Decisions on the game rules:** fee basis, locked-odds settings, and success targets
- **Didit:** an account for identity checks, with 500 free checks a month
- **Design:** the application flow, simulated top-up and withdraw, the odds-changed state, and the light theme
- **Data:** BSP's 2027 meeting dates before that market template goes live

## Things to consider

- **Regulatory perception:** even with free coins, a betting-style app is launching soon after PAGCOR had Polymarket blocked. Counsel should review before launch
- **Free-tier limits:** the POC runs on free services. Identity checks stop at 500 a month, and the free database has no backups of its own, which is why we run our own
- **Email sender:** verification emails currently come from a dedicated Gmail address, because the POC has no domain. Gmail's limit is reported at about 500 emails a day, and we recommend a domain and a dedicated email provider before nearing the 1,000-user target
- **Hosting terms:** Vercel's free plan is for non-commercial use, and its guidelines count paid developers. We'd confirm with Vercel or move to its paid plan
- **Permanent records:** the coin records can't be erased, so approved accounts can't currently be deleted. Counsel should advise how this fits Data Privacy Act erasure requests
- **Long-term hosting:** moving away from Supabase later is possible, and the database is the easy part. Login and app connections are more work. Physical servers in the Philippines would add hardware, backups, security, and uptime to the ongoing work
- **After the POC:** the proposal estimates about $185–$225 a month for paid services, before any domain or larger plans

## Questions for you

1. When should the schedule officially start, and is there a target launch date?
2. Who will act as legal counsel, and when can the review begin?
3. Who will staff KYC review, market approval, and resolution?
4. Is hosting in the Philippines a requirement, now or for the real-money stage?
5. Should ID images stay with Didit as planned, or must they be stored on your own systems? What other sensitive data do you expect to hold yourselves?
6. Should the fee be 10% of the stake, or 10% of the profit? The second keeps favorites worth buying but earns less on them.
7. Is 1,000 coins the right starting amount for the POC, and what should replace it afterward?
8. Do you agree with the proposed success targets, such as 1,000 approved users in 12 weeks and 12% still active on day 30?
9. What domain name do you want, and when should we buy it?
10. Who should own the service accounts long term (hosting, database, email, code, and Didit)?
11. Do you have a budget for paid services after the POC, if the targets are met?
