-- Run with: pnpm supabase test db
-- kyc_confirm_declarations (Task 9, screen 10). Everything here rolls back.
--
-- Users: e has no declarations, a declared at sign-up, p is approved.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'decl-e@example.test', '{}'),
  ('00000000-0000-0000-0000-0000000000a1', 'decl-a@example.test', '{"declared_21_plus": "true", "declared_in_ph": "true"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'decl-p@example.test', '{}');
update public.profiles set declared_21_plus_at = '2026-11-01T00:00:00Z'
where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set status = 'approved'
where id = '00000000-0000-0000-0000-0000000000b1';

set local role anon;
select throws_ok(
  $$ select public.kyc_confirm_declarations(true, true) $$,
  '42501',
  null,
  'guests cannot call it'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select throws_ok(
  $$ select public.kyc_confirm_declarations(true, true) $$,
  '28000',
  null,
  'a token without a user is refused'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select throws_ok(
  $$ select public.kyc_confirm_declarations(true, false) $$,
  '22023',
  'both declarations are required',
  'the Philippines declaration is required'
);
select throws_ok(
  $$ select public.kyc_confirm_declarations(null, true) $$,
  '22023',
  'both declarations are required',
  'the 21+ declaration is required'
);
select throws_ok(
  $$ update public.profiles set declared_21_plus_at = now() where id = '00000000-0000-0000-0000-0000000000e1' $$,
  '42501',
  null,
  'users still cannot write their profile directly'
);
select lives_ok(
  $$ select public.kyc_confirm_declarations(true, true) $$,
  'an undeclared user can confirm both'
);
select ok(
  (select declared_21_plus_at is not null and declared_in_ph_at is not null
   from public.profiles where id = '00000000-0000-0000-0000-0000000000e1'),
  'both declarations are recorded'
);
select is(
  (select result from public.kyc_start_application()),
  'reserved',
  'the user can now start an application'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok(
  $$ select public.kyc_confirm_declarations(true, true) $$,
  'confirming again is harmless'
);
select is(
  (select declared_21_plus_at from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  '2026-11-01T00:00:00Z'::timestamptz,
  'the first declaration time is kept'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok(
  $$ select public.kyc_confirm_declarations(true, true) $$,
  '42501',
  'account is not under review',
  'an approved account cannot call it'
);
select is(
  (select declared_21_plus_at from public.profiles where id = '00000000-0000-0000-0000-0000000000b1'),
  null,
  'and nothing changes for it'
);

reset role;

select * from finish();

rollback;
