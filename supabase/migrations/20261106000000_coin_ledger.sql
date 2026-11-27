-- Coin ledger: the one function that posts to the ledger, the starting grant
-- paid on approval, and the nightly check of balances against the ledger.
--
-- Amounts are integers in minor units: 1 coin = 100 units.
--
-- Wallets are created on approval, not at sign-up. Ledger entries are append-only
-- and hold a reference to the wallet, so a user with a wallet cannot be deleted;
-- accounts that were never approved can still be removed.

-- ---------------------------------------------------------------------------
-- House accounts
-- ---------------------------------------------------------------------------

-- House balances can go negative: house_issuance goes down by every coin issued,
-- so all balances together always sum to zero.
insert into public.wallet_accounts (kind)
values ('house_fees'), ('house_market_maker'), ('house_issuance');

-- ---------------------------------------------------------------------------
-- Posting
-- ---------------------------------------------------------------------------

create type private.ledger_posting as (account_id bigint, amount_minor bigint);

-- Every coin movement goes through here, so entries and balances change together.
-- A user balance going below zero fails the check on wallet_accounts and rolls the
-- whole transaction back.
create function private.post_ledger_transaction(
  p_kind public.ledger_transaction_kind,
  p_postings private.ledger_posting[],
  p_user_id uuid default null,
  p_bet_id bigint default null,
  p_market_id bigint default null,
  p_top_up_id bigint default null,
  p_withdrawal_id bigint default null
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_transaction_id bigint;
begin
  if coalesce(cardinality(p_postings), 0) < 2 then
    raise exception 'a ledger transaction needs at least two postings';
  end if;

  if (select sum(amount_minor) from unnest(p_postings)) is distinct from 0 then
    raise exception 'ledger postings do not sum to zero';
  end if;

  -- Same lock order everywhere, so concurrent postings cannot deadlock.
  perform 1
  from public.wallet_accounts
  where id in (select account_id from unnest(p_postings))
  order by id
  for update;

  insert into public.ledger_transactions (kind, user_id, bet_id, market_id, top_up_id, withdrawal_id, created_by)
  values (p_kind, p_user_id, p_bet_id, p_market_id, p_top_up_id, p_withdrawal_id, (select auth.uid()))
  returning id into v_transaction_id;

  insert into public.ledger_entries (transaction_id, account_id, amount_minor)
  select v_transaction_id, account_id, amount_minor
  from unnest(p_postings);

  update public.wallet_accounts a
  set balance_minor = a.balance_minor + p.amount_minor
  from (
    select account_id, sum(amount_minor)::bigint as amount_minor
    from unnest(p_postings)
    group by account_id
  ) p
  where a.id = p.account_id;

  return v_transaction_id;
end;
$$;

revoke all on function private.post_ledger_transaction from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Starting grant
-- ---------------------------------------------------------------------------

-- Set only on starting grants, where it allows one grant per user.
alter table public.ledger_transactions
  add column user_id uuid references public.profiles (id),
  add constraint ledger_transactions_grant_has_user check (kind <> 'starting_grant' or user_id is not null);

create unique index ledger_transactions_one_starting_grant
on public.ledger_transactions (user_id) where kind = 'starting_grant';

-- 1,000 coins.
create function private.starting_grant_minor()
returns bigint
language sql
immutable
set search_path = ''
as $$
  select 100000::bigint;
$$;

revoke all on function private.starting_grant_minor from public, anon, authenticated;

-- Safe to call twice: re-approving a user never pays a second grant.
create function private.open_wallet_with_grant(p_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into public.wallet_accounts (user_id, kind)
  values (p_user_id, 'available'), (p_user_id, 'in_play'), (p_user_id, 'pending_withdrawal')
  on conflict (user_id, kind) do nothing;

  if exists (
    select 1 from public.ledger_transactions
    where kind = 'starting_grant' and user_id = p_user_id
  ) then
    return;
  end if;

  perform private.post_ledger_transaction(
    'starting_grant',
    array[
      (
        (select id from public.wallet_accounts where kind = 'house_issuance' and user_id is null),
        -private.starting_grant_minor()
      )::private.ledger_posting,
      (
        (select id from public.wallet_accounts where kind = 'available' and user_id = p_user_id),
        private.starting_grant_minor()
      )::private.ledger_posting
    ],
    p_user_id => p_user_id
  );
end;
$$;

revoke all on function private.open_wallet_with_grant from public, anon, authenticated;

-- Security definer so whatever approves a user can pay the grant without holding
-- any ledger privileges itself.
create function private.handle_account_approved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.open_wallet_with_grant(new.id);
  return new;
end;
$$;

revoke all on function private.handle_account_approved from public, anon, authenticated;

create trigger profiles_account_approved
after insert or update of status on public.profiles
for each row
when (new.status = 'approved')
execute function private.handle_account_approved();

-- Anyone approved before this migration.
select private.open_wallet_with_grant(id) from public.profiles where status = 'approved';

-- ---------------------------------------------------------------------------
-- Nightly ledger check
-- ---------------------------------------------------------------------------

create table public.ledger_check_runs (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  accounts_checked integer not null,
  -- [{ account_id, balance_minor, ledger_minor }] for balances that differ from their entries.
  balance_mismatches jsonb not null,
  -- Ids of transactions whose entries do not sum to zero.
  unbalanced_transactions bigint[] not null,
  passed boolean generated always as (
    jsonb_array_length(balance_mismatches) = 0 and cardinality(unbalanced_transactions) = 0
  ) stored
);

create trigger ledger_check_runs_append_only
before update or delete on public.ledger_check_runs
for each row execute function private.reject_change();

revoke all on public.ledger_check_runs from anon, authenticated;
grant select on public.ledger_check_runs to authenticated;

alter table public.ledger_check_runs enable row level security;

create policy "Admins read ledger checks" on public.ledger_check_runs for select to authenticated
using ((select private.has_staff_role(array['admin']::public.staff_role[])));

-- One statement, so it sees one snapshot and postings in progress cannot show up
-- as false mismatches.
create function private.run_ledger_check()
returns bigint
language sql
set search_path = ''
as $$
  with account_totals as (
    select a.id, a.balance_minor, coalesce(sum(e.amount_minor), 0)::bigint as ledger_minor
    from public.wallet_accounts a
    left join public.ledger_entries e on e.account_id = a.id
    group by a.id
  ),
  unbalanced as (
    select transaction_id
    from public.ledger_entries
    group by transaction_id
    having sum(amount_minor) <> 0
  )
  insert into public.ledger_check_runs (accounts_checked, balance_mismatches, unbalanced_transactions)
  select
    (select count(*) from account_totals),
    coalesce(
      (
        select jsonb_agg(jsonb_build_object(
          'account_id', id,
          'balance_minor', balance_minor,
          'ledger_minor', ledger_minor
        ))
        from account_totals
        where balance_minor <> ledger_minor
      ),
      '[]'::jsonb
    ),
    coalesce((select array_agg(transaction_id) from unbalanced), '{}')
  returning id;
$$;

revoke all on function private.run_ledger_check from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

-- 17:30 UTC = 01:30 PHT, just before the nightly backup at 02:00 PHT.
select cron.schedule('nightly-ledger-check', '30 17 * * *', 'select private.run_ledger_check()');
