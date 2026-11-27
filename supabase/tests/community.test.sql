-- Run with: pnpm supabase test db
-- Community: posts, likes, comments, reports, moderation (migration 20261127000300).
-- Everything here rolls back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(40);

-- ---------------------------------------------------------------------------
-- Setup: author and reader (approved), newcomer (under review), moderator,
-- builder and approver for a market.
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'author@example.test'),
  ('00000000-0000-0000-0000-0000000000d2', 'reader@example.test'),
  ('00000000-0000-0000-0000-0000000000d3', 'newcomer@example.test'),
  ('00000000-0000-0000-0000-0000000000d4', 'moderator@example.test'),
  ('00000000-0000-0000-0000-0000000000d5', 'builder@example.test'),
  ('00000000-0000-0000-0000-0000000000d6', 'approver@example.test');
update public.profiles set status = 'approved'
where id in ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2');
insert into public.staff_members (user_id, role) values ('00000000-0000-0000-0000-0000000000d4', 'moderator');

insert into public.market_templates (code, name, type, resolution_source, cadence)
values ('test_tpl', 'Test', 'yes_no', 'Test source', 'once')
on conflict (code) do nothing;
insert into public.markets (template_code, slug, type, status, question_en, question_fil, rules_en, rules_fil,
  resolution_source, closes_at, created_by, approved_by, approved_at)
values ('test_tpl', 'community-test', 'yes_no', 'open', 'Q?', 'Q?', 'R', 'R', 'S', now() + interval '2 days',
  '00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000d6', now());
insert into public.market_outcomes (market_id, position, label_en, label_fil, opening_odds, odds)
select id, 0, 'Yes', 'Yes', -150, -150 from public.markets where slug = 'community-test'
union all select id, 1, 'No', 'No', 130, 130 from public.markets where slug = 'community-test';

create temporary table ids as select
  (select id from public.markets where slug = 'community-test') as market_id,
  (select o.id from public.market_outcomes o join public.markets m on m.id = o.market_id where m.slug = 'community-test' and o.position = 1) as no_id;
grant select on ids to authenticated, anon;

create function pg_temp.as_user(p_id text, p_aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_id, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;
grant execute on function pg_temp.as_user to authenticated;

-- ---------------------------------------------------------------------------
-- Display names
-- ---------------------------------------------------------------------------

set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select throws_ok($$ select public.create_post('Hello') $$, 'P0001', 'needs_display_name', 'a post needs a display name first');
select throws_ok($$ select public.set_display_name('A') $$, 'P0001', 'invalid_name', 'names are at least 2 characters');
select throws_ok($$ select public.set_display_name('Ana <b>') $$, 'P0001', 'invalid_name', 'names use letters, digits, spaces, dots, dashes, underscores');
select is(public.set_display_name('  Ana   S. '), 'Ana S.', 'names are trimmed and spaces collapsed');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select throws_ok($$ select public.set_display_name('ana s.') $$, 'P0001', 'name_taken', 'names are unique whatever the case');
select is(public.set_display_name('Ben T'), 'Ben T', 'a second member picks another name');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
select is(public.set_display_name('New Person'), 'New Person', 'an account under review can set a name');
select is(
  (select array_agg(display_name order by display_name) from public.member_profiles),
  array['Ana S.', 'Ben T'],
  'member names show approved accounts only'
);
reset role;

set local role anon;
select throws_ok($$ select * from public.member_profiles $$, '42501', null, 'anon cannot read member names');
select throws_ok($$ select * from public.posts $$, '42501', null, 'anon cannot read posts');
reset role;

-- ---------------------------------------------------------------------------
-- Posting
-- ---------------------------------------------------------------------------

set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
select throws_ok($$ select public.create_post('Hi') $$, 'P0001', 'cannot_post', 'an account under review cannot post');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select throws_ok($$ select public.create_post('   ') $$, 'P0001', 'invalid_post', 'an empty post is refused');
select throws_ok($$ select public.create_post(repeat('x', 501)) $$, 'P0001', 'invalid_post', 'posts are at most 500 characters');
select throws_ok($$ select public.create_post('Hi', -1) $$, 'P0001', 'market_not_found', 'an unknown market is refused');
select throws_ok(
  $$ insert into public.posts (author_id, body) values ('00000000-0000-0000-0000-0000000000d1', 'x') $$,
  '42501', null, 'posts cannot be inserted directly'
);

select ok(public.create_post('Plain post') > 0, 'an approved member with a name can post');
select is((public.place_bet((select no_id from ids), 100, 130)) ->> 'status', 'placed', 'the author bets No on the market');
select ok(public.create_post('No for me', (select market_id from ids)) > 0, 'a post can carry a market card');
reset role;

select is(
  (select forecast_outcome_id from public.posts where body = 'No for me'),
  (select no_id from ids),
  'the post saves the side of the author''s open bet'
);
select is((select forecast_outcome_id from public.posts where body = 'Plain post'), null, 'no market, no forecast');

create temporary table post_ids as select
  (select id from public.posts where body = 'No for me') as p1,
  (select id from public.posts where body = 'Plain post') as p2;
grant select on post_ids to authenticated;

-- ---------------------------------------------------------------------------
-- Likes and comments
-- ---------------------------------------------------------------------------

set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
select is((select count(*)::int from public.posts), 2, 'an account under review can read posts');
select throws_ok(
  $$ insert into public.post_likes (post_id, user_id) select p1, '00000000-0000-0000-0000-0000000000d3' from post_ids $$,
  '42501', null, 'but cannot like'
);
select throws_ok(
  $$ insert into public.post_comments (post_id, author_id, body) select p1, '00000000-0000-0000-0000-0000000000d3', 'Hi' from post_ids $$,
  '42501', null, 'or comment'
);

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select lives_ok(
  $$ insert into public.post_likes (post_id, user_id) select p1, '00000000-0000-0000-0000-0000000000d2' from post_ids $$,
  'an approved member likes a post'
);
select throws_ok(
  $$ insert into public.post_likes (post_id, user_id) select p1, '00000000-0000-0000-0000-0000000000d2' from post_ids $$,
  '23505', null, 'once'
);
select throws_ok(
  $$ insert into public.post_likes (post_id, user_id) select p2, '00000000-0000-0000-0000-0000000000d1' from post_ids $$,
  '42501', null, 'and only as themselves'
);
select lives_ok(
  $$ insert into public.post_comments (post_id, author_id, body) select p1, '00000000-0000-0000-0000-0000000000d2', 'Same here' from post_ids $$,
  'an approved member comments'
);
select throws_ok(
  $$ insert into public.post_comments (post_id, author_id, body) select p1, '00000000-0000-0000-0000-0000000000d2', repeat('x', 301) from post_ids $$,
  '23514', null, 'comments are at most 300 characters'
);
select lives_ok(
  $$ delete from public.post_likes where user_id = '00000000-0000-0000-0000-0000000000d2' and post_id = (select p1 from post_ids) $$,
  'a member can unlike'
);

-- ---------------------------------------------------------------------------
-- Reports and moderation
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into public.post_reports (post_id, reporter_id, reason) select p1, '00000000-0000-0000-0000-0000000000d2', 'spam' from post_ids $$,
  'a member reports someone else''s post'
);
select throws_ok(
  $$ insert into public.post_reports (post_id, reporter_id, reason) select p1, '00000000-0000-0000-0000-0000000000d2', 'other' from post_ids $$,
  '23505', null, 'once per post'
);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select throws_ok(
  $$ insert into public.post_reports (post_id, reporter_id, reason) select p1, '00000000-0000-0000-0000-0000000000d1', 'spam' from post_ids $$,
  '42501', null, 'nobody reports their own post'
);
select throws_ok($$ select public.staff_moderate_post((select p1 from post_ids), 'hide') $$, '42501', 'not_a_moderator', 'members cannot moderate');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d4');
select throws_ok($$ select public.staff_moderate_post((select p1 from post_ids), 'hide') $$, '42501', 'not_a_moderator', 'moderators need two-step sign-in');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d4', 'aal2');
select lives_ok($$ select public.staff_moderate_post((select p1 from post_ids), 'hide') $$, 'a moderator hides a reported post');
select is(
  (select resolution from public.post_reports where post_id = (select p1 from post_ids)),
  'hidden', 'its open reports close as hidden'
);

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select is((select count(*)::int from public.posts where id = (select p1 from post_ids)), 0, 'other members no longer see it');
select throws_ok(
  $$ insert into public.post_comments (post_id, author_id, body) select p1, '00000000-0000-0000-0000-0000000000d2', 'Hi' from post_ids $$,
  '42501', null, 'nor comment on it'
);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select isnt((select hidden_at from public.posts where id = (select p1 from post_ids)), null, 'the author still sees it, marked hidden');
reset role;

select ok(
  exists (select 1 from public.audit_log where target_table = 'posts' and actor_id = '00000000-0000-0000-0000-0000000000d4'),
  'hiding a post writes an audit entry'
);

select * from finish();
rollback;
