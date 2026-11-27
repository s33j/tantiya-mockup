-- Run with: pnpm supabase test db
-- Automatic American lines and place_bet (migration 20261127000100).
-- Everything here rolls back, including the throwaway auth users and markets.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(38);

-- ---------------------------------------------------------------------------
-- Odds maths
-- ---------------------------------------------------------------------------

select is(private.chance_from_american(-150), 0.6, '−150 is a 60% implied chance');
select is(round(private.chance_from_american(130), 4), 0.4348, '+130 is a 43.48% implied chance');
select is(private.american_from_chance(0.6), -150, '60% is −150');
select is(private.american_from_chance(0.4348), 130, '43.48% is +130');
select is(private.american_from_chance(0.5), -100, 'an even chance is −100');
select is(private.american_from_chance(0.512), -105, 'lines round to the nearest 5');
select is(private.to_win_minor(30000, -150), 20000::bigint, '300 coins at −150 wins 200');
select is(private.to_win_minor(10000, 130), 13000::bigint, '100 coins at +130 wins 130');
select is(private.to_win_minor(10100, -150), 6700::bigint, 'to win rounds down to whole coins');

-- ---------------------------------------------------------------------------
-- Setup: two staff (builder and approver), a bettor, a second user not approved
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'bet-builder@example.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'bet-approver@example.test'),
  ('00000000-0000-0000-0000-0000000000c3', 'bettor@example.test'),
  ('00000000-0000-0000-0000-0000000000c4', 'not-approved@example.test');
update public.profiles set status = 'approved' where id = '00000000-0000-0000-0000-0000000000c3';

insert into public.market_templates (code, name, type, resolution_source, cadence)
values ('test_tpl', 'Test', 'yes_no', 'Test source', 'once')
on conflict (code) do nothing;

insert into public.markets (template_code, slug, type, status, question_en, question_fil, rules_en, rules_fil,
  resolution_source, closes_at, created_by, approved_by, approved_at)
values
  ('test_tpl', 'test-yes-no', 'yes_no', 'open', 'Q?', 'Q?', 'R', 'R', 'S', now() + interval '2 days',
   '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2', now()),
  ('test_tpl', 'test-three', 'band', 'open', 'Q3?', 'Q3?', 'R', 'R', 'S', now() + interval '2 days',
   '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2', now());

insert into public.market_outcomes (market_id, position, label_en, label_fil, opening_odds, odds)
select id, 0, 'Yes', 'Yes', -150, -150 from public.markets where slug = 'test-yes-no'
union all select id, 1, 'No', 'No', 130, 130 from public.markets where slug = 'test-yes-no'
union all select id, p, 'B' || p, 'B' || p, 200, 200 from public.markets, generate_series(0, 2) p where slug = 'test-three';

create temporary table ids as
select
  (select o.id from public.market_outcomes o join public.markets m on m.id = o.market_id where m.slug = 'test-yes-no' and o.position = 0) as yes_id,
  (select o.id from public.market_outcomes o join public.markets m on m.id = o.market_id where m.slug = 'test-yes-no' and o.position = 1) as no_id,
  (select o.id from public.market_outcomes o join public.markets m on m.id = o.market_id where m.slug = 'test-three' and o.position = 0) as band_id;
grant select on ids to authenticated, anon;

-- Over/under markets need a line, and only they may have one.
select throws_ok(
  $$ insert into public.markets (template_code, slug, type, status, question_en, question_fil, rules_en, rules_fil,
       resolution_source, closes_at, created_by)
     values ('test_tpl', 'test-ou-no-line', 'over_under', 'draft', 'Q', 'Q', 'R', 'R', 'S', now() + interval '1 day',
       '00000000-0000-0000-0000-0000000000c1') $$,
  '23514', null, 'an over/under market needs a line'
);
select throws_ok(
  $$ insert into public.markets (template_code, slug, type, status, question_en, question_fil, rules_en, rules_fil,
       resolution_source, closes_at, created_by, line)
     values ('test_tpl', 'test-yn-line', 'yes_no', 'draft', 'Q', 'Q', 'R', 'R', 'S', now() + interval '1 day',
       '00000000-0000-0000-0000-0000000000c1', 2.5) $$,
  '23514', null, 'a Yes/No market cannot have a line'
);
select throws_ok(
  $$ update public.market_outcomes set odds = 50 where id = (select yes_id from ids) $$,
  '23514', null, 'lines between −100 and +100 are refused'
);

-- ---------------------------------------------------------------------------
-- Who may bet
-- ---------------------------------------------------------------------------

set local role anon;
select throws_ok(
  $$ select public.place_bet((select yes_id from ids), 100, -150) $$,
  '42501', null, 'anon cannot call place_bet'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select throws_ok($$ select public.place_bet((select yes_id from ids), 100, -150) $$, 'P0001', 'not_signed_in', 'needs a signed-in user');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated"}', true);
select throws_ok($$ select public.place_bet((select yes_id from ids), 100, -150) $$, 'P0001', 'not_approved', 'needs an approved account');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select throws_ok($$ select public.place_bet((select yes_id from ids), 0, -150) $$, 'P0001', 'invalid_stake', 'stake must be at least 1 coin');
select throws_ok($$ select public.place_bet(-1, 100, -150) $$, 'P0001', 'outcome_not_found', 'unknown outcome');
select throws_ok($$ select public.place_bet((select band_id from ids), 100, 200) $$, 'P0001', 'not_two_outcomes', 'only two-outcome markets take bets');
select throws_ok($$ select public.place_bet((select yes_id from ids), 2000, -150) $$, 'P0001', 'insufficient_coins', 'cannot stake more than is available');
select throws_ok(
  $$ insert into public.bets (user_id, market_id, outcome_id, stake_minor, odds, to_win_minor)
     select '00000000-0000-0000-0000-0000000000c3', market_id, id, 100, odds, 100 from public.market_outcomes where id = (select yes_id from ids) $$,
  '42501', null, 'users cannot insert bets directly'
);

-- ---------------------------------------------------------------------------
-- Line moved: a stale line places nothing
-- ---------------------------------------------------------------------------

select is(
  public.place_bet((select yes_id from ids), 300, -140),
  jsonb_build_object('status', 'line_moved', 'odds', -150, 'other_odds', 130),
  'a stale line returns the current line instead of placing'
);
select is((select count(*)::int from public.bets), 0, 'nothing was placed on a stale line');

-- ---------------------------------------------------------------------------
-- A placed bet
-- ---------------------------------------------------------------------------

select is(
  public.place_bet((select yes_id from ids), 1000, -150) - 'bet_id',
  jsonb_build_object('status', 'placed', 'odds', -150, 'stake_minor', 100000, 'to_win_minor', 66600),
  '1,000 coins on Yes −150 is placed and wins 666'
);
reset role;

select is(
  (select row(stake_minor, odds, to_win_minor, status::text)::text from public.bets),
  row(100000::bigint, -150, 66600::bigint, 'open')::text,
  'the bet keeps the stake, line and to-win fixed at bet time'
);
select is(
  (select balance_minor from public.wallet_accounts where user_id = '00000000-0000-0000-0000-0000000000c3' and kind = 'available'),
  0::bigint, 'the stake leaves Available'
);
select is(
  (select balance_minor from public.wallet_accounts where user_id = '00000000-0000-0000-0000-0000000000c3' and kind = 'in_play'),
  100000::bigint, 'and goes to In play'
);
select is(
  (select count(*)::int from public.ledger_transactions t join public.bets b on b.id = t.bet_id where t.kind = 'bet'),
  1, 'one ledger transaction of kind bet, linked to the bet'
);
select is((select sum(balance_minor)::bigint from public.wallet_accounts), 0::bigint, 'all balances still sum to zero');

-- Placeholder rule: 1,000 coins raise Yes from 57.98% fair to 58.98%, re-priced with the same margin.
select is((select odds from public.market_outcomes where id = (select yes_id from ids)), -155, 'the line moves toward the side that was bet');
select is((select odds from public.market_outcomes where id = (select no_id from ids)), 135, 'and the other side moves away');
select is((select opening_odds from public.market_outcomes where id = (select yes_id from ids)), -150, 'the opening line stays');

-- The bettor sees their own bet; others don't.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select is((select count(*)::int from public.bets), 1, 'the bettor sees their bet');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated"}', true);
select is((select count(*)::int from public.bets), 0, 'another user does not');
reset role;

-- ---------------------------------------------------------------------------
-- Safer play and closed markets
-- ---------------------------------------------------------------------------

-- Top the bettor up through the ledger so the next checks aren't about balance.
select private.post_ledger_transaction(
  'top_up',
  array[
    ((select id from public.wallet_accounts where kind = 'house_issuance' and user_id is null), -100000)::private.ledger_posting,
    ((select id from public.wallet_accounts where user_id = '00000000-0000-0000-0000-0000000000c3' and kind = 'available'), 100000)::private.ledger_posting
  ]
);

insert into public.user_limits (user_id, kind, amount_minor)
values ('00000000-0000-0000-0000-0000000000c3', 'stake_daily', 105000);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select throws_ok($$ select public.place_bet((select no_id from ids), 100, 135) $$, 'P0001', 'stake_limit', 'a daily stake limit stops the bet that would pass it');
select is((public.place_bet((select no_id from ids), 50, 135)) ->> 'status', 'placed', 'a bet within the limit goes through');
reset role;

delete from public.user_limits where user_id = '00000000-0000-0000-0000-0000000000c3';
insert into public.exclusions (user_id, kind, ends_at)
values ('00000000-0000-0000-0000-0000000000c3', 'cooling_off', now() + interval '1 day');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select throws_ok($$ select public.place_bet((select no_id from ids), 10, 135) $$, 'P0001', 'excluded', 'no bets during a break');
reset role;

delete from public.exclusions where user_id = '00000000-0000-0000-0000-0000000000c3';
update public.markets set closes_at = now() - interval '1 minute' where slug = 'test-yes-no';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select throws_ok($$ select public.place_bet((select no_id from ids), 10, 135) $$, 'P0001', 'market_closed', 'no bets after the close time');
reset role;

update public.markets set closes_at = now() + interval '1 day', status = 'closed' where slug = 'test-yes-no';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select throws_ok($$ select public.place_bet((select no_id from ids), 10, 135) $$, 'P0001', 'market_closed', 'no bets on a market that is not open');
reset role;

select * from finish();
rollback;
