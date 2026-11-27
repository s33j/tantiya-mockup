-- Run with: pnpm supabase test db
-- Everything here rolls back, including the throwaway auth users.
--
-- Staff console database side (Gantt Task 10, 20261120000000_staff_console.sql).
-- Users: a and b apply for KYC; c starts but never finishes the ID check; r is a
-- KYC reviewer who has also applied; k is a market builder (staff, but not KYC).

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(32);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000c00a', 'staffc-a@example.test', '{"declared_21_plus": "true", "declared_in_ph": "true"}'),
  ('00000000-0000-0000-0000-00000000c00b', 'staffc-b@example.test', '{"declared_21_plus": "true", "declared_in_ph": "true"}'),
  ('00000000-0000-0000-0000-00000000c00c', 'staffc-c@example.test', '{"declared_21_plus": "true", "declared_in_ph": "true"}'),
  ('00000000-0000-0000-0000-00000000c001', 'staffc-r@example.test', '{"declared_21_plus": "true", "declared_in_ph": "true"}'),
  ('00000000-0000-0000-0000-00000000c002', 'staffc-k@example.test', '{}');

insert into public.staff_members (user_id, role) values
  ('00000000-0000-0000-0000-00000000c001', 'kyc_reviewer'),
  ('00000000-0000-0000-0000-00000000c002', 'market_builder');

-- Applications: a, b and r reach Didit's verdict; c stops in the ID check.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c00a","role":"authenticated"}', true);
select public.kyc_start_application();
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c00b","role":"authenticated"}', true);
select public.kyc_start_application();
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c00c","role":"authenticated"}', true);
select public.kyc_start_application();
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c001","role":"authenticated"}', true);
select public.kyc_start_application();
reset role;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select public.kyc_attach_session(
  (select id from public.kyc_applications where user_id = '00000000-0000-0000-0000-00000000c00a'),
  'mock', 'staffc-sess-a', 'https://example.test/staffc-sess-a');
select public.kyc_attach_session(
  (select id from public.kyc_applications where user_id = '00000000-0000-0000-0000-00000000c00b'),
  'mock', 'staffc-sess-b', 'https://example.test/staffc-sess-b');
select public.kyc_attach_session(
  (select id from public.kyc_applications where user_id = '00000000-0000-0000-0000-00000000c00c'),
  'mock', 'staffc-sess-c', 'https://example.test/staffc-sess-c');
select public.kyc_attach_session(
  (select id from public.kyc_applications where user_id = '00000000-0000-0000-0000-00000000c001'),
  'mock', 'staffc-sess-r', 'https://example.test/staffc-sess-r');
select public.kyc_record_provider_event('staffc-a1', 'staffc-sess-a', 'Approved', '2026-11-20T01:00:00Z');
select public.kyc_record_provider_event('staffc-b1', 'staffc-sess-b', 'Declined', '2026-11-20T01:00:00Z');
select public.kyc_record_provider_event('staffc-c1', 'staffc-sess-c', 'In Progress', '2026-11-20T01:00:00Z');
select public.kyc_record_provider_event('staffc-r1', 'staffc-sess-r', 'Approved', '2026-11-20T01:00:00Z');
reset role;
select set_config('request.jwt.claims', '', true);

-- ---------------------------------------------------------------------------
-- When the ID check was submitted
-- ---------------------------------------------------------------------------

select is(
  (select submitted_at from public.kyc_applications where didit_session_id = 'staffc-sess-a'),
  now(),
  'Didit''s verdict records when the application was submitted'
);
select is(
  (select submitted_at from public.kyc_applications where didit_session_id = 'staffc-sess-c'),
  null,
  'an application still in the ID check has no submitted time'
);

-- ---------------------------------------------------------------------------
-- Staff access needs two-step sign-in
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c001","role":"authenticated","aal":"aal1"}', true);
select is(
  (select array_agg(role::text) from public.staff_members where user_id = '00000000-0000-0000-0000-00000000c001'),
  array['kyc_reviewer'],
  'staff without MFA still see their own roles'
);
select is(
  (select count(*)::int from public.kyc_applications where user_id <> '00000000-0000-0000-0000-00000000c001'),
  0,
  'reviewers without MFA see no one else''s applications'
);
select is((select count(*)::int from public.kyc_provider_events), 0, 'reviewers without MFA read no vendor events');
select throws_ok(
  $$ select * from public.staff_user_emails(array['00000000-0000-0000-0000-00000000c00a']::uuid[]) $$,
  '42501', null, 'reviewers without MFA cannot look up emails'
);
select throws_ok(
  $$ select * from public.staff_find_users('staffc') $$,
  '42501', null, 'reviewers without MFA cannot search users'
);
select throws_ok(
  $$ select * from public.staff_user_audit('00000000-0000-0000-0000-00000000c00a') $$,
  '42501', null, 'reviewers without MFA cannot read a user''s audit entries'
);

-- ---------------------------------------------------------------------------
-- Only KYC reviewers (and admins)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c002","role":"authenticated","aal":"aal2"}', true);
select throws_ok(
  $$ select * from public.staff_user_emails(array['00000000-0000-0000-0000-00000000c00a']::uuid[]) $$,
  '42501', null, 'other staff cannot look up emails'
);
select throws_ok(
  $$ select * from public.staff_user_audit('00000000-0000-0000-0000-00000000c00a') $$,
  '42501', null, 'other staff cannot read a user''s audit entries'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c00a","role":"authenticated","aal":"aal2"}', true);
select throws_ok(
  $$ select * from public.staff_find_users('staffc') $$,
  '42501', null, 'applicants cannot search users'
);

-- ---------------------------------------------------------------------------
-- Emails, search and vendor events for reviewers
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c001","role":"authenticated","aal":"aal2"}', true);
select results_eq(
  $$ select user_id, email from public.staff_user_emails(
       array['00000000-0000-0000-0000-00000000c00a', '00000000-0000-0000-0000-00000000c001']::uuid[])
     order by email $$,
  $$ values ('00000000-0000-0000-0000-00000000c00a'::uuid, 'staffc-a@example.test'),
            ('00000000-0000-0000-0000-00000000c001'::uuid, 'staffc-r@example.test') $$,
  'reviewers look up emails by user id'
);
select results_eq(
  $$ select email from public.staff_find_users('STAFFC-B@') $$,
  $$ values ('staffc-b@example.test') $$,
  'search matches part of the email, ignoring case'
);
select results_eq(
  $$ select email from public.staff_find_users('00000000-0000-0000-0000-00000000c00c') $$,
  $$ values ('staffc-c@example.test') $$,
  'search finds a user by id'
);
select is(
  (select count(*)::int from public.staff_find_users('%@%')),
  0,
  'search treats % and _ as plain characters'
);
select throws_ok(
  $$ select * from public.staff_find_users('st') $$,
  '22023', null, 'an email search needs at least 3 characters'
);
select results_eq(
  $$ select provider_status from public.kyc_provider_events where session_id = 'staffc-sess-a' $$,
  $$ values ('Approved') $$,
  'reviewers read the vendor events for the timeline'
);

-- ---------------------------------------------------------------------------
-- Decisions: own application, reason codes, internal notes
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ select public.kyc_staff_decide(
       (select id from public.kyc_applications where didit_session_id = 'staffc-sess-r'), 'approved') $$,
  '42501', null, 'reviewers cannot decide their own application'
);
select throws_ok(
  $$ select public.kyc_staff_decide(
       (select id from public.kyc_applications where didit_session_id = 'staffc-sess-b'), 'rejected', 'blurry') $$,
  '23514', null, 'only the listed reason codes are accepted'
);
select throws_ok(
  $$ select public.kyc_staff_decide(
       (select id from public.kyc_applications where didit_session_id = 'staffc-sess-b'), 'rejected', 'other') $$,
  '22023', null, 'the reason other needs an internal note'
);
select throws_ok(
  $$ select public.kyc_staff_decide(
       (select id from public.kyc_applications where didit_session_id = 'staffc-sess-b'), 'rejected', 'other', '   ') $$,
  '22023', null, 'a blank note does not count'
);
select throws_ok(
  $$ select public.kyc_staff_decide(
       (select id from public.kyc_applications where didit_session_id = 'staffc-sess-b'), 'rejected', 'other',
       repeat('x', 2001)) $$,
  '23514', null, 'a note is at most 2,000 characters'
);
select is(
  public.kyc_staff_decide(
    (select id from public.kyc_applications where didit_session_id = 'staffc-sess-b'), 'rejected', 'other',
    '  Name on the ID does not match the account.  '),
  'rejected'::public.kyc_status,
  'a reviewer rejects with the reason other and a note'
);
select is(
  public.kyc_staff_decide(
    (select id from public.kyc_applications where didit_session_id = 'staffc-sess-a'), 'approved'),
  'approved'::public.kyc_status,
  'a reviewer approves without a note'
);
select results_eq(
  $$ select n.note, n.written_by from public.kyc_review_notes n
     join public.kyc_applications a on a.id = n.application_id
     where a.user_id in ('00000000-0000-0000-0000-00000000c00a', '00000000-0000-0000-0000-00000000c00b') $$,
  $$ values ('Name on the ID does not match the account.', '00000000-0000-0000-0000-00000000c001'::uuid) $$,
  'the note is stored trimmed, under the reviewer; no note without one'
);
select isnt(
  (select submitted_at from public.kyc_applications where didit_session_id = 'staffc-sess-a'),
  null,
  'the submitted time stays after the decision'
);

-- ---------------------------------------------------------------------------
-- Who can read the notes
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c00b","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.kyc_review_notes), 0, 'applicants never see the internal note');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c001","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.kyc_review_notes), 0, 'reviewers without MFA read no notes');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c001","role":"authenticated","aal":"aal2"}', true);
select ok((select count(*) from public.kyc_review_notes) > 0, 'reviewers with MFA read the notes');

-- ---------------------------------------------------------------------------
-- Audit entries about one user (S7)
-- ---------------------------------------------------------------------------

select results_eq(
  $$ select target_table, action, actor_email from public.staff_user_audit('00000000-0000-0000-0000-00000000c00b')
     order by target_table $$,
  $$ values ('kyc_applications', 'kyc_rejected', 'staffc-r@example.test'),
            ('kyc_review_notes', 'kyc_rejected', 'staffc-r@example.test') $$,
  'a rejection shows the application and its note under the reviewer'
);
select results_eq(
  $$ select target_table, action from public.staff_user_audit('00000000-0000-0000-0000-00000000c00a')
     order by target_table $$,
  $$ values ('kyc_applications', 'kyc_approved'), ('profiles', 'kyc_approved') $$,
  'an approval shows the application and the account, nothing about other users'
);
reset role;

-- A role granted outside the app (Studio) is a staff action on that user too.
select set_config('request.jwt.claims', '', true);
insert into public.staff_members (user_id, role) values ('00000000-0000-0000-0000-00000000c00a', 'resolver');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c001","role":"authenticated","aal":"aal2"}', true);
select results_eq(
  $$ select target_id, actor_email from public.staff_user_audit('00000000-0000-0000-0000-00000000c00a')
     where target_table = 'staff_members' $$,
  $$ values ('00000000-0000-0000-0000-00000000c00a/resolver', null::text) $$,
  'role changes on the user are included, with no staff email when made outside the app'
);
reset role;

select * from finish();
rollback;
