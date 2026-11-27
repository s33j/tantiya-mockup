-- Base schema for the play-money POC.
--
-- Coin amounts are integers in minor units: 1 coin = 100 units (columns end in
-- _minor). LMSR shares use the same units, since one share pays one coin.
--
-- Apps only read tables directly. Every write goes through Postgres functions
-- added with each feature, so ledger entries and balances change together.

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.account_status as enum ('under_review', 'approved', 'rejected', 'closed');
create type public.kyc_status as enum ('started', 'submitted', 'approved', 'rejected');
create type public.staff_role as enum ('kyc_reviewer', 'market_builder', 'resolver', 'withdrawal_approver', 'admin');
create type public.market_type as enum ('yes_no', 'band');
create type public.market_status as enum ('draft', 'pending_approval', 'open', 'closed', 'resolved', 'voided');
create type public.dispute_status as enum ('open', 'upheld', 'dismissed');
create type public.bet_status as enum ('open', 'settled', 'voided');
create type public.withdrawal_status as enum ('requested', 'held', 'approved', 'sent', 'paid', 'rejected');
create type public.wallet_account_kind as enum (
  'available', 'in_play', 'pending_withdrawal',
  'house_fees', 'house_market_maker', 'house_issuance'
);
create type public.ledger_transaction_kind as enum (
  'starting_grant', 'top_up', 'bet', 'settlement', 'void_refund',
  'withdrawal_request', 'withdrawal_paid', 'withdrawal_rejected'
);
create type public.limit_kind as enum (
  'top_up_daily', 'top_up_weekly', 'top_up_monthly',
  'stake_daily', 'stake_weekly', 'stake_monthly'
);
create type public.exclusion_kind as enum ('cooling_off', 'self_exclusion');

-- ---------------------------------------------------------------------------
-- Shared trigger functions
-- ---------------------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.reject_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Users, staff and KYC
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 40),
  locale text not null default 'en' check (locale in ('en', 'fil')),
  status public.account_status not null default 'under_review',
  declared_21_plus_at timestamptz,
  declared_in_ph_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_members (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.staff_role not null,
  granted_by uuid references auth.users (id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ID images and biometrics stay with Didit; only the result is kept here.
create table public.kyc_applications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  didit_session_id text unique,
  status public.kyc_status not null default 'started',
  reason_code text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status not in ('approved', 'rejected') or (reviewed_by is not null and reviewed_at is not null)),
  check (status <> 'rejected' or reason_code is not null)
);

-- ---------------------------------------------------------------------------
-- Markets
-- ---------------------------------------------------------------------------

create table public.market_templates (
  code text primary key,
  name text not null,
  type public.market_type not null,
  resolution_source text not null,
  cadence text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.markets (
  id bigint generated always as identity primary key,
  template_code text not null references public.market_templates (code),
  slug text not null unique,
  type public.market_type not null,
  status public.market_status not null default 'draft',
  question_en text not null,
  question_fil text not null,
  rules_en text not null,
  rules_fil text not null,
  resolution_source text not null,
  -- LMSR liquidity setting b, in coins.
  liquidity_b numeric(14, 4) not null check (liquidity_b > 0),
  opens_at timestamptz,
  closes_at timestamptz not null,
  created_by uuid not null references auth.users (id),
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (opens_at is null or closes_at > opens_at),
  -- Two-person rule: the builder cannot approve their own market.
  check (approved_by is null or approved_by <> created_by),
  check (status in ('draft', 'pending_approval') or approved_by is not null)
);

create table public.market_outcomes (
  id bigint generated always as identity primary key,
  market_id bigint not null references public.markets (id) on delete cascade,
  position smallint not null check (position >= 0),
  label_en text not null,
  label_fil text not null,
  -- Opening odds come from data, floored at 5%.
  opening_probability numeric(6, 5) not null check (opening_probability >= 0.05 and opening_probability < 1),
  shares_outstanding_minor bigint not null default 0 check (shares_outstanding_minor >= 0),
  unique (market_id, position),
  unique (id, market_id)
);

-- A null winning outcome means the market was voided.
create table public.market_resolutions (
  market_id bigint primary key references public.markets (id) on delete cascade,
  winning_outcome_id bigint,
  evidence_url text,
  evidence_note text,
  proposed_by uuid not null references auth.users (id),
  proposed_at timestamptz not null default now(),
  confirmed_by uuid references auth.users (id),
  confirmed_at timestamptz,
  dispute_window_ends_at timestamptz,
  foreign key (winning_outcome_id, market_id) references public.market_outcomes (id, market_id),
  -- Two-person rule: the proposer cannot confirm their own resolution.
  check (confirmed_by is null or confirmed_by <> proposed_by),
  check ((confirmed_by is null) = (confirmed_at is null))
);

create table public.disputes (
  id bigint generated always as identity primary key,
  market_id bigint not null references public.markets (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 2000),
  status public.dispute_status not null default 'open',
  decided_by uuid references auth.users (id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  check (status = 'open' or (decided_by is not null and decided_at is not null))
);

-- ---------------------------------------------------------------------------
-- Bets, simulated top-ups and withdrawals
-- ---------------------------------------------------------------------------

create table public.bets (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id),
  market_id bigint not null references public.markets (id),
  outcome_id bigint not null,
  status public.bet_status not null default 'open',
  stake_minor bigint not null check (stake_minor > 0),
  fee_minor bigint not null check (fee_minor >= 0 and fee_minor < stake_minor),
  shares_minor bigint not null check (shares_minor > 0),
  price_before numeric(8, 7) not null check (price_before > 0 and price_before < 1),
  price_after numeric(8, 7) not null check (price_after > 0 and price_after < 1),
  payout_minor bigint check (payout_minor >= 0),
  placed_at timestamptz not null default now(),
  settled_at timestamptz,
  foreign key (outcome_id, market_id) references public.market_outcomes (id, market_id),
  check ((status = 'open') = (settled_at is null))
);

create table public.simulated_top_ups (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id),
  method text not null,
  amount_minor bigint not null check (amount_minor > 0),
  created_at timestamptz not null default now()
);

create table public.simulated_withdrawals (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id),
  -- A label only; no real account number is collected.
  method_label text not null,
  amount_minor bigint not null check (amount_minor > 0),
  status public.withdrawal_status not null default 'requested',
  requires_approval boolean not null default false,
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  requested_at timestamptz not null default now(),
  held_at timestamptz,
  sent_at timestamptz,
  paid_at timestamptz,
  updated_at timestamptz not null default now(),
  check (not requires_approval or status in ('requested', 'held', 'rejected') or approved_by is not null)
);

-- ---------------------------------------------------------------------------
-- Coin ledger (double entry)
-- ---------------------------------------------------------------------------

-- Balances are a cache of the ledger; the nightly ledger check compares them.
create table public.wallet_accounts (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id),
  kind public.wallet_account_kind not null,
  balance_minor bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind in ('available', 'in_play', 'pending_withdrawal')) = (user_id is not null)),
  check (user_id is null or balance_minor >= 0),
  unique (user_id, kind)
);

-- One account per house kind.
create unique index wallet_accounts_house_kind on public.wallet_accounts (kind) where user_id is null;

create table public.ledger_transactions (
  id bigint generated always as identity primary key,
  kind public.ledger_transaction_kind not null,
  bet_id bigint references public.bets (id),
  market_id bigint references public.markets (id),
  top_up_id bigint references public.simulated_top_ups (id),
  withdrawal_id bigint references public.simulated_withdrawals (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.ledger_entries (
  id bigint generated always as identity primary key,
  transaction_id bigint not null references public.ledger_transactions (id),
  account_id bigint not null references public.wallet_accounts (id),
  -- Positive credits the account, negative debits it.
  amount_minor bigint not null check (amount_minor <> 0),
  created_at timestamptz not null default now()
);

-- Every transaction's entries must sum to zero, checked at commit.
create function private.check_transaction_balanced()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select coalesce(sum(amount_minor), 0) from public.ledger_entries where transaction_id = new.transaction_id) <> 0 then
    raise exception 'ledger transaction % does not balance', new.transaction_id;
  end if;
  return null;
end;
$$;

create constraint trigger ledger_entries_balanced
after insert on public.ledger_entries
deferrable initially deferred
for each row execute function private.check_transaction_balanced();

create trigger ledger_transactions_append_only
before update or delete on public.ledger_transactions
for each row execute function private.reject_change();

create trigger ledger_entries_append_only
before update or delete on public.ledger_entries
for each row execute function private.reject_change();

-- ---------------------------------------------------------------------------
-- Safer play and audit
-- ---------------------------------------------------------------------------

-- Lowering a limit applies now; raising it waits 72 hours in the pending columns.
create table public.user_limits (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.limit_kind not null,
  amount_minor bigint not null check (amount_minor >= 0),
  pending_amount_minor bigint check (pending_amount_minor >= 0),
  pending_effective_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind),
  check ((pending_amount_minor is null) = (pending_effective_at is null))
);

-- A null end means an indefinite self-exclusion.
create table public.exclusions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.exclusion_kind not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (kind = 'self_exclusion' or ends_at is not null)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users (id),
  action text not null,
  target_table text not null,
  target_id text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create trigger audit_log_append_only
before update or delete on public.audit_log
for each row execute function private.reject_change();

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger profiles_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger kyc_applications_updated_at before update on public.kyc_applications
for each row execute function private.set_updated_at();
create trigger market_templates_updated_at before update on public.market_templates
for each row execute function private.set_updated_at();
create trigger markets_updated_at before update on public.markets
for each row execute function private.set_updated_at();
create trigger simulated_withdrawals_updated_at before update on public.simulated_withdrawals
for each row execute function private.set_updated_at();
create trigger wallet_accounts_updated_at before update on public.wallet_accounts
for each row execute function private.set_updated_at();
create trigger user_limits_updated_at before update on public.user_limits
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Indexes on foreign keys used by queries and policies
-- ---------------------------------------------------------------------------

create index kyc_applications_user_id on public.kyc_applications (user_id);
create index markets_status_closes_at on public.markets (status, closes_at);
create index market_outcomes_market_id on public.market_outcomes (market_id);
create index disputes_market_id on public.disputes (market_id);
create index disputes_user_id on public.disputes (user_id);
create index bets_user_id on public.bets (user_id);
create index bets_market_id on public.bets (market_id);
create index simulated_top_ups_user_id_created_at on public.simulated_top_ups (user_id, created_at);
create index simulated_withdrawals_user_id on public.simulated_withdrawals (user_id);
create index simulated_withdrawals_status on public.simulated_withdrawals (status);
create index ledger_entries_transaction_id on public.ledger_entries (transaction_id);
create index ledger_entries_account_id on public.ledger_entries (account_id);
create index exclusions_user_id on public.exclusions (user_id);
create index audit_log_actor_id on public.audit_log (actor_id);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

-- Security definer so policies can check staff_members without recursing into its own RLS.
create function private.has_staff_role(roles public.staff_role[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_members
    where user_id = (select auth.uid())
      and (roles is null or role = any (roles) or role = 'admin')
  );
$$;

revoke all on function private.has_staff_role from public;
-- anon needs it too: the market policies call it, and it returns false without a user.
grant usage on schema private to anon, authenticated;
grant execute on function private.has_staff_role to anon, authenticated;

-- Reads only: no client writes, whatever later default privileges say.
revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;
grant select on public.market_templates, public.markets, public.market_outcomes, public.market_resolutions to anon;

alter table public.profiles enable row level security;
alter table public.staff_members enable row level security;
alter table public.kyc_applications enable row level security;
alter table public.market_templates enable row level security;
alter table public.markets enable row level security;
alter table public.market_outcomes enable row level security;
alter table public.market_resolutions enable row level security;
alter table public.disputes enable row level security;
alter table public.bets enable row level security;
alter table public.simulated_top_ups enable row level security;
alter table public.simulated_withdrawals enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.ledger_transactions enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.user_limits enable row level security;
alter table public.exclusions enable row level security;
alter table public.audit_log enable row level security;

-- Own rows, or any staff member.
create policy "Own profile or staff" on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.has_staff_role()));
create policy "Own roles or staff" on public.staff_members for select to authenticated
using (user_id = (select auth.uid()) or (select private.has_staff_role()));
create policy "Own disputes or staff" on public.disputes for select to authenticated
using (user_id = (select auth.uid()) or (select private.has_staff_role()));
create policy "Own bets or staff" on public.bets for select to authenticated
using (user_id = (select auth.uid()) or (select private.has_staff_role()));
create policy "Own top-ups or staff" on public.simulated_top_ups for select to authenticated
using (user_id = (select auth.uid()) or (select private.has_staff_role()));
create policy "Own withdrawals or staff" on public.simulated_withdrawals for select to authenticated
using (user_id = (select auth.uid()) or (select private.has_staff_role()));
create policy "Own accounts or staff" on public.wallet_accounts for select to authenticated
using (user_id = (select auth.uid()) or (select private.has_staff_role()));
create policy "Own limits or staff" on public.user_limits for select to authenticated
using (user_id = (select auth.uid()) or (select private.has_staff_role()));
create policy "Own exclusions or staff" on public.exclusions for select to authenticated
using (user_id = (select auth.uid()) or (select private.has_staff_role()));

-- KYC results are limited to KYC reviewers (and admins).
create policy "Own KYC or reviewers" on public.kyc_applications for select to authenticated
using (user_id = (select auth.uid()) or (select private.has_staff_role(array['kyc_reviewer']::public.staff_role[])));

-- Ledger rows follow the accounts they touch; wallet_accounts RLS does the filtering.
create policy "Entries on visible accounts" on public.ledger_entries for select to authenticated
using (exists (select 1 from public.wallet_accounts a where a.id = ledger_entries.account_id));
create policy "Transactions with visible entries" on public.ledger_transactions for select to authenticated
using (exists (select 1 from public.ledger_entries e where e.transaction_id = ledger_transactions.id));

-- Markets are public once approved; staff also see drafts.
create policy "Anyone reads templates" on public.market_templates for select to anon, authenticated
using (true);
create policy "Public markets or staff" on public.markets for select to anon, authenticated
using (status not in ('draft', 'pending_approval') or (select private.has_staff_role()));
create policy "Outcomes of visible markets" on public.market_outcomes for select to anon, authenticated
using (exists (select 1 from public.markets m where m.id = market_outcomes.market_id));
create policy "Confirmed resolutions or staff" on public.market_resolutions for select to anon, authenticated
using (confirmed_at is not null or (select private.has_staff_role()));

create policy "Admins read audit log" on public.audit_log for select to authenticated
using ((select private.has_staff_role(array['admin']::public.staff_role[])));
