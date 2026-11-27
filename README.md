# Tantiya

A free, play-money forecasting web app for KYC-verified adults in the Philippines. Scope, pricing model and stack are set out in the [POC proposal](.claude/Tantiya%20—%20Play-Money%20POC%20Proposal.md).

This repo holds two things for the Dec 1, 2026 review:

- **The working app** (everything below): the MVP from `sicnarf14sf/tantiya` (`main` at `d9d029d`, Nov 20) plus real bets on automatic American lines (Nov 27).
- **The clickable mockup** in [`mockup/`](mockup/README.md): a static prototype of the whole app flow, with sample data and no backend. Open `mockup/dist/index.html`.

Show the flows in the mockup, then show betting working for real in the app.

## Repo layout

| Path          | What it is                                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`    | Public app (Next.js App Router, installable PWA). Dev port 3000.                                                                               |
| `apps/staff`  | Staff console (Next.js App Router, own subdomain). Dev port 3001.                                                                              |
| `packages/ui` | Shared Tailwind theme tokens (`@tantiya/ui/theme.css`), font (`@tantiya/ui/fonts`) and TanStack Query provider (`@tantiya/ui/query-provider`). |
| `supabase/`   | Supabase CLI project: local config, migrations, Postgres functions.                                                                            |
| `mockup/`     | Clickable mockup (static HTML, not part of the pnpm workspace). See `mockup/README.md`.                                                        |

Tooling: pnpm workspaces + Turborepo, Tailwind CSS v4, ESLint (per app), Prettier (root).

## Prerequisites

- Node 24 (`nvm use` reads `.nvmrc`)
- pnpm 11 (`corepack enable` picks up the version in `package.json`)
- Docker, only to run Supabase locally

## Getting started

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
cp apps/staff/.env.example apps/staff/.env.local
pnpm dev            # runs both apps
```

Fill in each `.env.local` as its comments describe. Never commit `.env.local`.

Run one app: `pnpm --filter @tantiya/web dev`.

## Scripts

| Command                           | What it does                                                            |
| --------------------------------- | ----------------------------------------------------------------------- |
| `pnpm dev`                        | Start both apps in dev mode                                             |
| `pnpm build`                      | Production build of both apps                                           |
| `pnpm lint`                       | ESLint in every app                                                     |
| `pnpm check-types`                | TypeScript check in every app                                           |
| `pnpm format`                     | Format the repo with Prettier                                           |
| `pnpm supabase ...`               | Supabase CLI, pinned to the repo's version (e.g. `pnpm supabase start`) |
| `pnpm supabase test db --local`   | Run the database tests in `supabase/tests/` against local Supabase      |
| `pnpm --filter @tantiya/web test` | Run the public app's unit tests (`*.test.ts`, Node's built-in runner)   |

## Auth email

Locally, nothing is really sent: read auth emails at <http://127.0.0.1:54324>. Local settings and templates come from `supabase/config.toml` and `supabase/templates/`. Open the app at `http://localhost:3000`, not `127.0.0.1`: email links use the `site_url`, and session cookies belong to one hostname.

Hosted projects send through a dedicated Gmail account, since the POC has no domain, and are set up by hand. Do this for staging, then for production. Don't run `supabase config push`: it would overwrite the hosted site URL with the local one.

1. **Gmail:** create an account just for Tantiya, turn on 2-Step Verification, and create an app password at <https://myaccount.google.com/apppasswords>. Never commit the app password.
2. **Supabase > Authentication > SMTP settings:** enable custom SMTP with host `smtp.gmail.com`, port `587`, the full Gmail address as both the username and the sender email, `Tantiya` as the sender name, and the app password as the password.
3. **Supabase > Authentication > Sign In / Providers:** turn on "Confirm email", set the minimum password length to 8, and set the email resend interval to 60 seconds.
4. **Supabase > Authentication > Rate Limits:** set emails to 12 an hour, about 288 a day. Gmail's limit is reported as 500 a day, though Google doesn't confirm a figure for SMTP.
5. **Supabase > Authentication > URL Configuration:** set the Site URL to the app's address. Email links are built from it.
6. **Supabase > Authentication > Emails:** paste `supabase/templates/confirmation.html` into "Confirm signup" and `supabase/templates/recovery.html` into "Reset password". The subjects are in `supabase/config.toml`.
7. **Database:** apply migrations with `pnpm supabase db push` while linked to that project.

Then sign up with a real address and check that the email arrives in the inbox and its link works.

## KYC

Identity checks use Didit's hosted flow: the app creates a Didit session, sends the user to Didit's own screens, and Didit reports back by signed webhook. A Didit "Approved" does not approve the account. Every application then waits for a staff reviewer (proposal, Features > Sign-up and KYC), and the user sees "Under review" until then.

| Piece                                                     | What it does                                                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/20261112000000_kyc_verification.sql` | Monthly cap, vendor status mapping, reviewer summary, webhook log and the Postgres functions below                              |
| `POST /api/kyc/session`                                   | Starts or resumes the signed-in user's application                                                                              |
| `POST /api/webhooks/didit`                                | Receives Didit's webhooks (checks `X-Signature`)                                                                                |
| `/kyc/return`                                             | Where Didit sends the user back. Redirects to `/account`, dropping Didit's `?status=`                                           |
| `/account`                                                | The application flow (Task 9): shows the screen for the user's account and latest application, see "Application screens"        |
| `/dev/mock-didit?session=…`                               | Mock Didit for development: pick an outcome, it sends Didit-format webhooks. 404s unless `KYC_PROVIDER=mock` and not production |
| `apps/web/src/lib/kyc/`                                   | Provider (mock or Didit), signature check, reviewer summary, mock scenarios                                                     |

### Database functions

| Function                                                               | Who calls it        | What it does                                                                                       |
| ---------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------- |
| `kyc_start_application()`                                              | Signed-in user      | Checks the declarations, the account and the monthly cap, then reserves an application             |
| `kyc_attach_session(id, provider, session_id, url)`                    | Server (secret key) | Stores the vendor session on the reservation                                                       |
| `kyc_release_reservation(id)`                                          | Server              | Frees the slot when creating the vendor session failed                                             |
| `kyc_record_provider_event(event_id, session_id, status, at, summary)` | Server              | Applies a webhook once, in order; never changes a staff decision or an abandoned application       |
| `kyc_staff_decide(id, 'approved' \| 'rejected', reason_code)`          | KYC reviewer, MFA   | Approves (sets `profiles.status`, which pays the starting grant) or rejects; see "Staff audit log" |
| `kyc_confirm_declarations(declared_21_plus, declared_in_ph)`           | Signed-in user      | Records both declarations for an account under review that has none (screen 10); both must be true |

Applicants read their own `kyc_applications` row; scores and duplicate flags sit in `kyc_check_results`, which only KYC reviewers can read. No names, birth dates, ID numbers or images are stored: reviewers open the full record in the Didit console.

### Statuses

| Didit status                                         | `kyc_applications.status`              |
| ---------------------------------------------------- | -------------------------------------- |
| Not Started, In Progress, Awaiting User, Resubmitted | `started`                              |
| Approved, Declined, In Review                        | `submitted` ("Under review")           |
| Abandoned, Expired, Kyc Expired                      | `abandoned` (the user may start again) |
| —                                                    | `approved` / `rejected`, by staff only |

### `POST /api/kyc/session`

Called by every start button on the Account page. No body. Always JSON with a `state`:

| HTTP | `state`                   | What the Account page does                                      |
| ---- | ------------------------- | --------------------------------------------------------------- |
| 200  | `redirect`, `url`         | Sends the user to `url` (Didit's hosted flow)                   |
| 409  | `already_submitted`       | Reloads: 04 "Under review"                                      |
| 409  | `already_approved`        | Reloads: 08 "Approved"                                          |
| 409  | `cap_reached`, `resetsOn` | 06 "Applications are full this month", with the date it reopens |
| 409  | `declarations_missing`    | Reloads: 10 "Confirm two things first"                          |
| 403  | `not_eligible`            | Reloads: the account status only                                |
| 401  | `unauthenticated`         | Reloads, so the proxy sends the user to sign in                 |
| 502  | `provider_error`          | 11 "We couldn't start the ID check"                             |
| 500  | `error`                   | 11 "We couldn't start the ID check"                             |

06 and 11 exist only in this response, so they have no URL: a reload shows the saved state again.

### Application screens (Task 9)

`/account` picks the screen from `profiles` and the user's latest `kyc_applications` row (`apps/web/src/lib/kyc/view-state.ts`). Numbers match the "Tantiya — Task 9 Application Flow" canvas.

| Account and application                               | Screen                                                                     |
| ----------------------------------------------------- | -------------------------------------------------------------------------- |
| `profiles.status` approved                            | 08 Approved, with the starting grant from the ledger                       |
| `profiles.status` rejected or closed                  | Account status only (no screen designed)                                   |
| `submitted`                                           | 04 Under review                                                            |
| `rejected`                                            | 07 Not approved, with the reason in plain language                         |
| `abandoned`                                           | 05 ID check not finished                                                   |
| `started` with a Didit session                        | 09 Receiving your result; the page reloads every 3 seconds                 |
| No application (or a reserved slot without a session) | 10 Confirm declarations if either is missing, otherwise 03 Verify identity |

"Apply again" on 07 shows only for reasons the applicant can fix: `id_unreadable`, `id_expired`, `id_type_not_accepted`, `face_mismatch`, `liveness_failed` and `other`. Unknown codes read as `other`.

### Try it locally with the mock

1. `pnpm supabase start`, then `pnpm supabase migration up` to apply the new migration.
2. In `apps/web/.env.local`, fill in the values from `pnpm supabase status` and set `KYC_PROVIDER=mock` and any `DIDIT_WEBHOOK_SECRET` (see `.env.example`).
3. `pnpm --filter @tantiya/web dev`, sign up at <http://localhost:3000/en/sign-up> with both declarations ticked, confirm the email in Mailpit (<http://127.0.0.1:54324>), and sign in.
4. Open <http://localhost:3000/en/account> and press **Start verification**.
5. Pick a document and an outcome, optionally tick "Send every webhook twice", then **Finish verification**. You land on `/kyc/return`, which forwards to `/account`. Check `kyc_applications`, `kyc_check_results` and `kyc_provider_events` in Studio (<http://127.0.0.1:54323>).
6. Until the staff console has a review queue (Task 10), decide in Studio's SQL editor:

   ```sql
   insert into public.staff_members (user_id, role) values ('<staff user id>', 'kyc_reviewer');

   begin;
   set local role authenticated;
   select set_config('request.jwt.claims', '{"sub":"<staff user id>","role":"authenticated","aal":"aal2"}', true);
   select public.kyc_staff_decide(<application id>, 'approved');
   commit;
   ```

   The applicant's `profiles.status` becomes `approved` and their wallet gets the starting grant.

   To reject instead, pass a reason code: `select public.kyc_staff_decide(<application id>, 'rejected', 'id_unreadable');`

Test the cap with `update public.kyc_settings set monthly_cap = 1;`.

### Switching to the real Didit

Start with Didit's **Sandbox** application: every check is mocked, nothing is billed, it does not use the plan's monthly credit, and you can force each outcome. Sandbox and live are separate applications in the same organization, each with its own API key, webhook destinations and secrets.

1. Sign up at <https://business.didit.me> and create the organization. Switch to **Sandbox** (the pill under the application name). If it is greyed out, Didit support has to enable it.
2. **Workflows:** create a KYC workflow with ID verification, liveness and face match (Face Search runs inside liveness), limited to PhilID/ePhilID, passport, driver's license and UMID. Copy its id into `DIDIT_WORKFLOW_ID`.
3. **API & Webhooks:** copy the Sandbox API key into `DIDIT_API_KEY`.
4. Didit refuses localhost webhook URLs, so expose the local app with a tunnel, for example `cloudflared tunnel --url http://localhost:3000` (no account needed; the address changes every run). `APP_URL` can stay `http://localhost:3000`: only the webhook needs the public address.
5. **API & Webhooks > add destination:** `https://<tunnel or app>/api/webhooks/didit`, version **V3** (the default), events `status.updated` and `data.updated`. Copy its secret (shown once) into `DIDIT_WEBHOOK_SECRET`.
6. Set `KYC_PROVIDER=didit` and `DIDIT_ENVIRONMENT=sandbox`, restart `pnpm --filter @tantiya/web dev`.
7. **Try Webhook** in the console: the route answers `{"result":"test"}` when the signature checks out (test deliveries never touch the database).
8. Start verification from `/account`. In Didit's hosted flow, pick a scenario in the card before capture (approved, a decline, or in review) and use Didit's sample documents, not a real ID: sandbox media is stored. Check `kyc_provider_events` and `kyc_check_results` in Studio, and compare the stored body with `didit-types.ts`.
9. Live, later: the live application's key and its own destination secret, `DIDIT_ENVIRONMENT=live`, and `kyc_settings.monthly_cap` set to what the team approves.

### Needs confirmation

- **Monthly cap 30.** That is what Didit's $10 monthly free credit covers since 1 November 2026; the proposal assumed 500 free checks. The vendor and budget decision is open.
- **Every application counts toward its month's cap**, including abandoned ones. Didit bills completed steps only.
- **A rejected applicant can apply again** (tentative): rejection leaves `profiles.status` at `under_review`. The proposal doesn't say.
- **Deciding needs MFA** (`aal2`) as well as the `kyc_reviewer` role, per the proposal's staff TOTP MFA. Reading the queue does not.
- **Rejecting needs a reason code.** The proposed codes are listed under "Application screens"; the list is for Task 10 to confirm.
- **Placeholders:** the helpline number (footer) and the support email (screen 07) are `[HELPLINE NUMBER]` and `[SUPPORT EMAIL]` in `messages/*.json` until they are decided.
- Filipino copy on the Account page is a first draft for native-speaker review (Task 27).

### Checked against Didit's sandbox (Nov 19)

- Three hosted-flow runs (approve, `decline_document_expired`, `review_face_match_borderline`): every webhook answered 200, every account stayed "Under review", and the reviewer summary held document type, scores and warning codes, with no names, ID numbers or images.
- Real sessions send `liveness_checks[].score` and `face_matches[].score` on a 0–100 scale; the console's "Send test event" sample uses `liveness_score` / `face_match_score` (0–1) instead. `summarizeDecision` accepts both.
- `created_at` orders events (`timestamp` changes on retry), but Didit doesn't always move it on a status change: an "In Progress" event carried the session's creation time. Equal times are applied, so ordering held.
- `DOCUMENT_EXPIRED` and `LOW_FACE_MATCH_SIMILARITY` are real codes. `DUPLICATED_FACE` and `POSSIBLE_DUPLICATED_FACE` come from Didit's Face Search docs and haven't been seen in a webhook yet.
- On a desktop, Didit's hosted flow sends the user to their phone by QR code; the callback still returns the desktop to `/kyc/return`.
- Didit shows its own verdict to the applicant at the end ("We could not verify you", "We are checking your details") and mid-flow ("This ID has expired").

### Not yet confirmed against Didit

- `document_type` values for PhilID, ePhilID, UMID and the driver's license (the sandbox sample document was always a passport).
- Whether Didit's hosted flow offers Filipino.

### Not built yet

- A pg_cron job that re-fetches Didit's decision for applications stuck in `started` for over 24 hours, in case a webhook is missed.
- The review queue in the staff console (Task 10).

## Staff audit log

Every change a staff member makes is recorded in `audit_log` (proposal, Features > Staff console). Triggers on the tables staff change write the entries, so edits made by hand are recorded too. Only admins can read it. Until the staff console has sign-in and an audit log page, read it in Studio.

| Change made by                                                    | Recorded | `actor_id`       | `db_user`             |
| ----------------------------------------------------------------- | -------- | ---------------- | --------------------- |
| A signed-in staff member, through the app                         | Yes      | The staff member | `authenticator`       |
| Anyone outside the app: Studio, the SQL editor, psql              | Yes      | Empty            | `postgres`            |
| Supabase Auth deleting a user (dashboard or admin API)            | Yes      | Empty            | `supabase_auth_admin` |
| Applicants and guests                                             | No       |                  |                       |
| The app server with the secret key (KYC sessions, Didit webhooks) | No       |                  |                       |

| Column                      | What it holds                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `action`                    | The staff action's name, e.g. `kyc_approved` or `kyc_rejected`; otherwise `insert`, `update` or `delete`                              |
| `target_table`, `target_id` | The row changed. Composite keys are joined with `/`: a `staff_members` row is `<user id>/<role>`                                      |
| `before`, `after`           | The row before and after. Updates hold only the columns that changed, without `updated_at`; an update that changes nothing is skipped |
| `db_user`                   | The database login, as in the table above. Empty on entries written before this column existed                                        |

Watched tables: `staff_members`, `kyc_settings`, `kyc_applications` and `profiles` (updates and deletes; inserts are sign-ups). An approval is two entries named `kyc_approved`: the application and the account.

**Writing a staff function:** call `private.set_audit_action('<name>')` before its changes and `private.set_audit_action(null)` before it returns. Every row it changes is recorded under that name. If it changes a table that isn't watched yet, add the trigger in the same migration:

```sql
create trigger markets_audit
after insert or update or delete on public.markets
for each row execute function private.audit_staff_change('id');
```

**Not recorded:** staff reading data; changes made with the secret key, so keep it on the server; markets, resolutions, disputes and withdrawals until their staff functions add the trigger. Anyone with the database password can turn triggers off, so the log records routine work and mistakes, not a determined administrator.

To try it: run `pnpm supabase test db --local` (`supabase/tests/audit_log.test.sql`), or, on local Supabase only, change the cap in Studio's SQL editor (<http://127.0.0.1:54323>) and read the entry. Entries can't be deleted, even locally.

```sql
update public.kyc_settings set monthly_cap = 31;
select * from public.audit_log order by id desc limit 5;
```

## Betting demo (Task 15)

A clickable demo of the market list, market page, bet slip, My bets and Wallet, built from page 2 of the "Tantiya — Core Screen Mockups (copy + POC changes)" canvas.

| Route             | Screen                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `/`               | Market list: phone cards (canvas 01), a table from `md` up (10). Category chips filter it                    |
| `/markets/[slug]` | Market page: Yes/No or over/under lines; bet slip as a bottom sheet on phones (03), beside it from `md` (09) |
| `/watchlist`      | Watchlist demo: markets starred on the list or market page, kept in this browser                             |
| `/bets`           | My bets, Open tab, from the `bets` table                                                                     |
| `/wallet`         | Balances and history from the coin ledger, with "Simulation — no money is charged."                          |

**What is real (updated Nov 27, 2026: automatic American lines replace LMSR and the 10% fee):** markets, outcomes and their current American lines come from the database. A bet goes through `public.place_bet` (migration `20261127000100_american_lines.sql`): it checks the account, breaks and self-exclusion, stake limits, the close time and the balance; refuses a stale line with the current one, which the bet slip shows as "Line moved"; moves the stake from Available to In play through the coin ledger; then moves the line. Odds, To win and Total return are fixed at bet time. My bets and the wallet read from the database. Only approved accounts can bet. `apps/web/src/lib/markets/odds.ts` only formats lines and mirrors `private.to_win_minor`.

**Placeholders until decided:** margin (whatever each market's opening line carries), the line-move rule (`private.line_move_coins_per_point()`: 1,000 coins on a side raise its implied chance by 1 point, both sides re-priced with the same margin), "Line moved" on any change, and no max stake beyond the user's own limits.

**What is demo:** the watchlist (not in the proposal's feature list) is kept in the browser's local storage only (`lib/markets/local-store.ts`). Top up and Withdraw are disabled until those screens are built. Settlement (results, payouts, pushes, voids) isn't built yet, so bets stay open.

**Sample markets:** `supabase/seed.sql` adds six `[SAMPLE]` markets with opening lines (one per proposal template, plus a diesel market; inflation is over/under 2.5%) on `pnpm supabase db reset`. They are local only: `supabase db push` never runs the seed. Their Filipino columns repeat the English text, and the new screens' Filipino strings are English copies for now (paused, Gantt Task 27).

To try it: `pnpm supabase db reset`, sign up and approve an account as in "Try it locally with the mock" above, then open <http://localhost:3000/en>.

**Left out until there is data or a decision:** pool size, bettor count, side bets, the line history chart (bets are only readable by their owner, so totals need a database view or function); the odds-format toggle (the slip shows American, decimal and implied % side by side); settlement and the result breakdown; hold-to-place.

## CI

GitHub Actions runs the format check, lint, type check and build on every PR and on `main`.

## Contributing

- Never commit to `main`; work on a feature branch and open a PR.
- All coin and settlement logic lives in Postgres functions under `supabase/`, not in the apps.
