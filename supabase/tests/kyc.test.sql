-- Run with: pnpm supabase test db
-- Everything here rolls back, including the throwaway auth users.
--
-- Users: a, b, c, d, f declared 21+ and Philippines at sign-up; e did not.
-- s is a KYC reviewer.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(57);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'kyc-a@example.test', '{"declared_21_plus": "true", "declared_in_ph": "true"}'),
  ('00000000-0000-0000-0000-00000000000b', 'kyc-b@example.test', '{"declared_21_plus": "true", "declared_in_ph": "true"}'),
  ('00000000-0000-0000-0000-00000000000c', 'kyc-c@example.test', '{"declared_21_plus": "true", "declared_in_ph": "true"}'),
  ('00000000-0000-0000-0000-00000000000d', 'kyc-d@example.test', '{"declared_21_plus": "true", "declared_in_ph": "true"}'),
  ('00000000-0000-0000-0000-00000000000e', 'kyc-e@example.test', '{}'),
  ('00000000-0000-0000-0000-00000000000f', 'kyc-f@example.test', '{"declared_21_plus": "true", "declared_in_ph": "true"}'),
  ('00000000-0000-0000-0000-0000000000aa', 'kyc-s@example.test', '{}');
insert into public.staff_members (user_id, role) values ('00000000-0000-0000-0000-0000000000aa', 'kyc_reviewer');

-- Applications already in the database this month (e.g. local Didit sandbox
-- runs) count toward the cap too, so the cap tests below are set relative to
-- them. A setting, so every role in this file can read it.
select set_config('tantiya_test.cap_base',
  (select count(*) from public.kyc_applications where cap_month = private.kyc_cap_month())::text, true);

-- ---------------------------------------------------------------------------
-- Starting
-- ---------------------------------------------------------------------------

set local role anon;
select throws_ok(
  $$ select * from public.kyc_start_application() $$,
  '42501',
  null,
  'guests cannot start'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}', true);
select is(
  (select result from public.kyc_start_application()),
  'declarations_missing',
  'no application without the 21+ and Philippines declarations'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select is(
  (select result from public.kyc_start_application()),
  'reserved',
  'a declared user gets a reserved slot'
);
select is(
  (select result from public.kyc_start_application()),
  'reserved',
  'starting again before a session is attached reuses the slot'
);
select is(
  (select count(*)::int from public.kyc_applications where user_id = '00000000-0000-0000-0000-00000000000a'),
  1,
  'still one application'
);
select throws_ok(
  $$ select public.kyc_attach_session(1, 'mock', 'x', 'y') $$,
  '42501',
  null,
  'users cannot attach sessions'
);
select throws_ok(
  $$ select public.kyc_record_provider_event('e', 'x', 'Approved', now()) $$,
  '42501',
  null,
  'users cannot record vendor events'
);

reset role;
set local role service_role;
select lives_ok(
  $$ select public.kyc_attach_session(
       (select id from public.kyc_applications where user_id = '00000000-0000-0000-0000-00000000000a'),
       'mock', 'sess-a', 'https://example.test/sess-a') $$,
  'the server attaches the vendor session'
);
select throws_ok(
  $$ select public.kyc_attach_session(
       (select id from public.kyc_applications where user_id = '00000000-0000-0000-0000-00000000000a'),
       'mock', 'sess-a2', 'https://example.test/sess-a2') $$,
  'P0001',
  null,
  'a session is attached only once'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select results_eq(
  $$ select result, session_url from public.kyc_start_application() $$,
  $$ values ('existing', 'https://example.test/sess-a') $$,
  'starting again returns the same session'
);

-- ---------------------------------------------------------------------------
-- Monthly cap and releasing a reservation
-- ---------------------------------------------------------------------------

reset role;
update public.kyc_settings set monthly_cap = current_setting('tantiya_test.cap_base')::int + 2;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select is((select result from public.kyc_start_application()), 'reserved', 'second slot of two');

reset role;
set local role service_role;
select public.kyc_attach_session(
  (select id from public.kyc_applications where user_id = '00000000-0000-0000-0000-00000000000b'),
  'mock', 'sess-b', 'https://example.test/sess-b'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
select results_eq(
  $$ select result, resets_on from public.kyc_start_application() $$,
  $$ values ('cap_reached', (date_trunc('month', now() at time zone 'Asia/Manila') + interval '1 month')::date) $$,
  'the cap stops new applications and gives the reset date'
);

reset role;
update public.kyc_settings set monthly_cap = current_setting('tantiya_test.cap_base')::int + 10;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
select is((select result from public.kyc_start_application()), 'reserved', 'a raised cap lets them in');

reset role;
set local role service_role;
select lives_ok(
  $$ select public.kyc_release_reservation(
       (select id from public.kyc_applications where user_id = '00000000-0000-0000-0000-00000000000c')) $$,
  'the server releases a reservation when the vendor session fails'
);
reset role;
select is(
  (select count(*)::int from public.kyc_applications where user_id = '00000000-0000-0000-0000-00000000000c'),
  0,
  'releasing frees the slot'
);

-- ---------------------------------------------------------------------------
-- Vendor events
-- ---------------------------------------------------------------------------

set local role service_role;
select is(
  public.kyc_record_provider_event('a1', 'sess-a', 'In Progress', '2026-11-09T01:00:00Z'),
  'applied',
  'In Progress applies'
);
select is(
  public.kyc_record_provider_event(
    'a2', 'sess-a', 'Approved', '2026-11-09T01:01:00Z',
    '{"document_type": "PhilID", "face_match_score": 92, "liveness_score": 97, "duplicate_face": "none", "warning_codes": []}'
  ),
  'applied',
  'a vendor Approved applies'
);
select is(
  public.kyc_record_provider_event('a2', 'sess-a', 'Approved', '2026-11-09T01:01:00Z'),
  'duplicate',
  'the same event twice is a no-op'
);
select is(
  public.kyc_record_provider_event('a3', 'sess-a', 'In Progress', '2026-11-09T01:00:30Z'),
  'stale',
  'an older event is ignored'
);
select is(
  public.kyc_record_provider_event('a4', 'sess-nope', 'Approved', null),
  'unknown_session',
  'an unknown session is logged, not applied'
);
select is(
  public.kyc_record_provider_event('a5', 'sess-a', 'Weird', null),
  'unknown_status',
  'an unknown status is logged, not applied'
);
reset role;

select results_eq(
  $$ select status::text, provider_status from public.kyc_applications where didit_session_id = 'sess-a' $$,
  $$ values ('submitted', 'Approved') $$,
  'a vendor Approved only submits the application for staff review'
);
select results_eq(
  $$ select r.document_type, r.face_match_score, r.liveness_score, r.duplicate_face, r.warning_codes
     from public.kyc_check_results r
     join public.kyc_applications a on a.id = r.application_id
     where a.didit_session_id = 'sess-a' $$,
  $$ values ('PhilID', 92::numeric, 97::numeric, 'none', '{}'::text[]) $$,
  'the reviewer summary is stored'
);
select is(
  (select status from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'under_review'::public.account_status,
  'the account stays under review'
);

-- Resubmission and summaries
set local role service_role;
select public.kyc_record_provider_event(
  'b1', 'sess-b', 'In Review', '2026-11-09T04:00:00Z',
  '{"duplicate_face": "possible", "warning_codes": ["POSSIBLE_DUPLICATED_FACE"]}'
);
select is(
  public.kyc_record_provider_event('b2', 'sess-b', 'Resubmitted', '2026-11-09T04:10:00Z'),
  'applied',
  'Resubmitted applies'
);
reset role;
select is(
  (select status::text from public.kyc_applications where didit_session_id = 'sess-b'),
  'started',
  'a resubmission moves the application back to started'
);
select is(
  (select r.warning_codes from public.kyc_check_results r
   join public.kyc_applications a on a.id = r.application_id where a.didit_session_id = 'sess-b'),
  array['POSSIBLE_DUPLICATED_FACE'],
  'a later event without a decision keeps the summary'
);

-- ---------------------------------------------------------------------------
-- What applicants can see
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.kyc_applications),
  1,
  'applicants see only their own application'
);
select is(
  (select count(*)::int from public.kyc_check_results),
  0,
  'applicants cannot see scores or duplicate flags'
);
select is((select count(*)::int from public.kyc_settings), 0, 'applicants cannot see the cap');
select is((select count(*)::int from public.kyc_provider_events), 0, 'applicants cannot read vendor events');
select is(
  (select result from public.kyc_start_application()),
  'already_submitted',
  'a submitted application blocks a second one'
);

-- ---------------------------------------------------------------------------
-- Staff decision
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ select public.kyc_staff_decide(
       (select id from public.kyc_applications where didit_session_id = 'sess-a'), 'approved') $$,
  '42501',
  null,
  'applicants cannot decide'
);

-- Staff access needs two-step sign-in (Task 10, 20261120000000_staff_console.sql).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated","aal":"aal1"}', true);
select is(
  (select count(*)::int from public.kyc_check_results),
  0,
  'reviewers without MFA read no summaries'
);
select is((select count(*)::int from public.kyc_settings), 0, 'reviewers without MFA cannot read the cap');
select throws_ok(
  $$ select public.kyc_staff_decide(
       (select id from public.kyc_applications where didit_session_id = 'sess-a'), 'approved') $$,
  '42501',
  null,
  'reviewers without MFA cannot decide'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated","aal":"aal2"}', true);
select is(
  (select count(*)::int from public.kyc_check_results
   where application_id in (select id from public.kyc_applications where didit_session_id like 'sess-%')),
  2,
  'reviewers with MFA read every summary'
);
select is(
  (select monthly_cap from public.kyc_settings),
  current_setting('tantiya_test.cap_base')::int + 10,
  'reviewers with MFA read the cap'
);
select throws_ok(
  $$ select public.kyc_staff_decide(
       (select id from public.kyc_applications where didit_session_id = 'sess-a'), 'rejected') $$,
  '22023',
  null,
  'rejecting needs a reason code'
);
select throws_ok(
  $$ select public.kyc_staff_decide(
       (select id from public.kyc_applications where didit_session_id = 'sess-b'), 'approved') $$,
  '22023',
  null,
  'only submitted applications can be decided'
);
select is(
  public.kyc_staff_decide((select id from public.kyc_applications where didit_session_id = 'sess-a'), 'approved'),
  'approved'::public.kyc_status,
  'a reviewer with MFA approves'
);
reset role;

select results_eq(
  $$ select status::text, reviewed_by from public.kyc_applications where didit_session_id = 'sess-a' $$,
  $$ values ('approved', '00000000-0000-0000-0000-0000000000aa'::uuid) $$,
  'the decision records the reviewer'
);
select is(
  (select status from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'approved'::public.account_status,
  'approval approves the account'
);
select is(
  (select balance_minor from public.wallet_accounts
   where user_id = '00000000-0000-0000-0000-00000000000a' and kind = 'available'),
  100000::bigint,
  'approval pays the starting grant'
);
select results_eq(
  $$ select actor_id, action, target_table from public.audit_log
     where target_id = (select id::text from public.kyc_applications where didit_session_id = 'sess-a') $$,
  $$ values ('00000000-0000-0000-0000-0000000000aa'::uuid, 'kyc_approved', 'kyc_applications') $$,
  'the decision is in the audit log'
);

set local role service_role;
select is(
  public.kyc_record_provider_event('a6', 'sess-a', 'Declined', '2026-11-09T02:00:00Z'),
  'final_locked',
  'vendor events never change a staff decision'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select is(
  (select result from public.kyc_start_application()),
  'already_approved',
  'an approved user has nothing to start'
);

-- Rejection, then a new application (tentative rule)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000f","role":"authenticated"}', true);
select public.kyc_start_application();
reset role;
set local role service_role;
select public.kyc_attach_session(
  (select id from public.kyc_applications where user_id = '00000000-0000-0000-0000-00000000000f'),
  'mock', 'sess-f', 'https://example.test/sess-f'
);
select public.kyc_record_provider_event('f1', 'sess-f', 'Declined', '2026-11-09T05:00:00Z',
  '{"duplicate_face": "strong", "warning_codes": ["DUPLICATED_FACE"]}');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated","aal":"aal2"}', true);
select is(
  public.kyc_staff_decide(
    (select id from public.kyc_applications where didit_session_id = 'sess-f'), 'rejected', 'duplicate_person'),
  'rejected'::public.kyc_status,
  'a reviewer rejects with a reason code'
);
reset role;
select is(
  (select status from public.profiles where id = '00000000-0000-0000-0000-00000000000f'),
  'under_review'::public.account_status,
  'a rejection leaves the account under review'
);
select is(
  (select count(*)::int from public.wallet_accounts where user_id = '00000000-0000-0000-0000-00000000000f'),
  0,
  'a rejection pays nothing'
);
select is(
  (select after ->> 'reason_code' from public.audit_log
   where target_id = (select id::text from public.kyc_applications where didit_session_id = 'sess-f')),
  'duplicate_person',
  'the reason code is in the audit log'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000f","role":"authenticated"}', true);
select is(
  (select result from public.kyc_start_application()),
  'reserved',
  'a rejected applicant can apply again'
);

-- ---------------------------------------------------------------------------
-- Abandoning and starting again
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
select public.kyc_start_application();
reset role;
set local role service_role;
select public.kyc_attach_session(
  (select id from public.kyc_applications where user_id = '00000000-0000-0000-0000-00000000000d'),
  'mock', 'sess-d', 'https://example.test/sess-d'
);
select is(
  public.kyc_record_provider_event('d1', 'sess-d', 'Abandoned', '2026-11-09T03:00:00Z'),
  'applied',
  'Abandoned applies'
);
reset role;
select is(
  (select status::text from public.kyc_applications where didit_session_id = 'sess-d'),
  'abandoned',
  'the application is abandoned'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
select is((select result from public.kyc_start_application()), 'reserved', 'the user can start again');
reset role;
select is(
  (select count(*)::int from public.kyc_applications
   where user_id = '00000000-0000-0000-0000-00000000000d' and cap_month = private.kyc_cap_month()),
  2,
  'both applications count toward the cap'
);
set local role service_role;
select is(
  public.kyc_record_provider_event('d2', 'sess-d', 'Approved', '2026-11-09T03:30:00Z'),
  'final_locked',
  'a late result never revives an abandoned application'
);
reset role;

select * from finish();

rollback;
