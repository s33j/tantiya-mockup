-- Run with: pnpm supabase test db
-- Everything here rolls back, including the throwaway auth users.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(33);

-- Sign-up makes a profile through the auth trigger.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ledger-a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'ledger-b@example.test');

-- House accounts
select is(
  (select count(*)::int from public.wallet_accounts where user_id is null),
  3,
  'one account per house kind'
);

-- Before approval
select is(
  (select count(*)::int from public.wallet_accounts where user_id = '00000000-0000-0000-0000-00000000000a'),
  0,
  'no wallet before approval'
);
select lives_ok(
  $$ delete from auth.users where id = '00000000-0000-0000-0000-00000000000b' $$,
  'a never-approved user can be deleted'
);
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'ledger-b@example.test');

-- Approval pays the grant
update public.profiles set status = 'approved' where id = '00000000-0000-0000-0000-00000000000a';

select is(
  (select count(*)::int from public.wallet_accounts where user_id = '00000000-0000-0000-0000-00000000000a'),
  3,
  'approval opens all three wallet accounts'
);
select is(
  (select balance_minor from public.wallet_accounts where user_id = '00000000-0000-0000-0000-00000000000a' and kind = 'available'),
  100000::bigint,
  'starting grant is 1,000 coins in minor units'
);
select is(
  (select balance_minor from public.wallet_accounts where user_id = '00000000-0000-0000-0000-00000000000a' and kind = 'in_play'),
  0::bigint,
  'in-play starts at zero'
);
select is(
  (select balance_minor from public.wallet_accounts where user_id = '00000000-0000-0000-0000-00000000000a' and kind = 'pending_withdrawal'),
  0::bigint,
  'pending withdrawal starts at zero'
);
select is(
  (select balance_minor from public.wallet_accounts where kind = 'house_issuance' and user_id is null),
  -100000::bigint,
  'the grant comes out of house issuance'
);
select is(
  (select sum(balance_minor)::bigint from public.wallet_accounts),
  0::bigint,
  'all balances sum to zero'
);

-- No double grant
update public.profiles set status = 'closed' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set status = 'approved' where id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select balance_minor from public.wallet_accounts where user_id = '00000000-0000-0000-0000-00000000000a' and kind = 'available'),
  100000::bigint,
  're-approval does not pay again'
);
select lives_ok(
  $$ select private.open_wallet_with_grant('00000000-0000-0000-0000-00000000000a') $$,
  'calling the grant directly again is harmless'
);
select is(
  (select count(*)::int from public.ledger_transactions where kind = 'starting_grant' and user_id = '00000000-0000-0000-0000-00000000000a'),
  1,
  'exactly one grant transaction'
);
select throws_ok(
  $$ insert into public.ledger_transactions (kind, user_id) values ('starting_grant', '00000000-0000-0000-0000-00000000000a') $$,
  '23505',
  null,
  'the database refuses a second grant even outside the function'
);

-- Other statuses
select is(
  (select count(*)::int from public.wallet_accounts where user_id = '00000000-0000-0000-0000-00000000000b'),
  0,
  'an unapproved user is not paid'
);

-- Posting rules
select throws_ok(
  $$ select private.post_ledger_transaction('top_up', array[(1, 100)::private.ledger_posting]) $$,
  'P0001',
  'a ledger transaction needs at least two postings',
  'one posting is rejected'
);
select throws_ok(
  $$ select private.post_ledger_transaction(
       'top_up',
       array[
         ((select id from public.wallet_accounts where kind = 'house_issuance'), -100)::private.ledger_posting,
         ((select id from public.wallet_accounts where kind = 'house_fees'), 99)::private.ledger_posting
       ]
     ) $$,
  'P0001',
  'ledger postings do not sum to zero',
  'unbalanced postings are rejected'
);
select throws_ok(
  $$ select private.post_ledger_transaction(
       'bet',
       array[
         ((select id from public.wallet_accounts where user_id = '00000000-0000-0000-0000-00000000000a' and kind = 'available'), -100001)::private.ledger_posting,
         ((select id from public.wallet_accounts where user_id = '00000000-0000-0000-0000-00000000000a' and kind = 'in_play'), 100001)::private.ledger_posting
       ]
     ) $$,
  '23514',
  null,
  'a user balance cannot go negative'
);
select is(
  (select balance_minor from public.wallet_accounts where user_id = '00000000-0000-0000-0000-00000000000a' and kind = 'available'),
  100000::bigint,
  'the failed posting changed nothing'
);
select is(
  (select balance_minor from public.wallet_accounts where user_id = '00000000-0000-0000-0000-00000000000a' and kind = 'in_play'),
  0::bigint,
  'the failed posting left in-play alone'
);

-- Append-only and deletion
select throws_ok(
  $$ delete from public.ledger_entries $$,
  'P0001',
  'ledger_entries is append-only',
  'entries cannot be deleted'
);
select throws_ok(
  $$ delete from auth.users where id = '00000000-0000-0000-0000-00000000000a' $$,
  '23503',
  null,
  'a user with a wallet cannot be deleted'
);

-- What a signed-in user can reach
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.wallet_accounts),
  3,
  'a user sees only their own wallet accounts'
);
select is(
  (select count(*)::int from public.ledger_entries),
  1,
  'a user sees only their own ledger entries'
);
select throws_ok(
  $$ update public.wallet_accounts set balance_minor = 999999999 $$,
  '42501',
  null,
  'a user cannot edit a balance'
);
select throws_ok(
  $$ select private.open_wallet_with_grant('00000000-0000-0000-0000-00000000000b') $$,
  '42501',
  null,
  'a user cannot call the grant'
);
select is(
  (select count(*)::int from public.ledger_check_runs),
  0,
  'a non-admin sees no ledger checks'
);

reset role;
select set_config('request.jwt.claims', '', true);

-- Nightly check. A statement can't see rows it inserts, so run it first, then read.
select lives_ok($$ select private.run_ledger_check() $$, 'the check runs');
select is(
  (select passed from public.ledger_check_runs order by id desc limit 1),
  true,
  'the check passes on a clean ledger'
);

update public.wallet_accounts set balance_minor = balance_minor + 5
where user_id = '00000000-0000-0000-0000-00000000000a' and kind = 'available';

select lives_ok($$ select private.run_ledger_check() $$, 'the check runs on a bad balance');
select is(
  (select passed from public.ledger_check_runs order by id desc limit 1),
  false,
  'the check fails when a balance differs from its entries'
);
select is(
  (select balance_mismatches -> 0 ->> 'ledger_minor' from public.ledger_check_runs order by id desc limit 1),
  '100000',
  'the check records the amount the ledger says'
);

-- Entries that don't balance are refused at commit. Last, as it fires the deferred trigger.
select throws_ok(
  $$ do $do$
     declare v_id bigint;
     begin
       insert into public.ledger_transactions (kind) values ('top_up') returning id into v_id;
       insert into public.ledger_entries (transaction_id, account_id, amount_minor)
       values (v_id, (select id from public.wallet_accounts where kind = 'house_fees'), 1);
       set constraints ledger_entries_balanced immediate;
     end
     $do$ $$,
  'P0001',
  null,
  'unbalanced entries written directly are refused at commit'
);

select is(
  (select cron.job.schedule from cron.job where jobname = 'nightly-ledger-check'),
  '30 17 * * *',
  'the nightly check is scheduled'
);

select * from finish();

rollback;
