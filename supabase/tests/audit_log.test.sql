-- Run with: pnpm supabase test db
-- Everything here rolls back, including the throwaway auth users.
--
-- Users: a and b declared 21+ and Philippines at sign-up and apply for KYC;
-- r becomes a KYC reviewer and m an admin. Statements with no JWT claims stand
-- for changes made outside the app's API, as in Supabase Studio. The tests
-- connect as postgres, so that is the database login recorded.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(17);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000ad0a', 'audit-a@example.test', '{"declared_21_plus": "true", "declared_in_ph": "true"}'),
  ('00000000-0000-0000-0000-00000000ad0b', 'audit-b@example.test', '{"declared_21_plus": "true", "declared_in_ph": "true"}'),
  ('00000000-0000-0000-0000-00000000ad01', 'audit-r@example.test', '{}'),
  ('00000000-0000-0000-0000-00000000ad02', 'audit-m@example.test', '{}');

select is(
  (select count(*)::int from public.audit_log
   where target_table = 'profiles' and target_id like '00000000-0000-0000-0000-00000000ad%'),
  0,
  'sign-up is not recorded'
);

-- ---------------------------------------------------------------------------
-- Changes made outside the API
-- ---------------------------------------------------------------------------

insert into public.staff_members (user_id, role) values
  ('00000000-0000-0000-0000-00000000ad01', 'kyc_reviewer'),
  ('00000000-0000-0000-0000-00000000ad02', 'admin');

select results_eq(
  $$ select actor_id, action, target_id, before, after ->> 'role', db_user
     from public.audit_log
     where target_table = 'staff_members' and target_id like '00000000-0000-0000-0000-00000000ad01/%' $$,
  $$ values (null::uuid, 'insert', '00000000-0000-0000-0000-00000000ad01/kyc_reviewer', null::jsonb,
             'kyc_reviewer', 'postgres') $$,
  'a role granted in Studio is recorded with no actor and the database login'
);

update public.kyc_settings set monthly_cap = 987654;

select results_eq(
  $$ select actor_id, action, target_id, before ? 'monthly_cap', after
     from public.audit_log
     where target_table = 'kyc_settings' and after ->> 'monthly_cap' = '987654' $$,
  $$ values (null::uuid, 'update', 'true', true, '{"monthly_cap": 987654}'::jsonb) $$,
  'an update records only the columns that changed'
);

update public.kyc_settings set monthly_cap = 987654;

select is(
  (select count(*)::int from public.audit_log
   where target_table = 'kyc_settings' and after ->> 'monthly_cap' = '987654'),
  1,
  'an update that changes nothing is not recorded'
);

-- ---------------------------------------------------------------------------
-- Applicants and the app server are not staff
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000ad0a","role":"authenticated"}', true);
select public.kyc_start_application();
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000ad0b","role":"authenticated"}', true);
select public.kyc_start_application();

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select public.kyc_attach_session(
  (select id from public.kyc_applications where user_id = '00000000-0000-0000-0000-00000000ad0a'),
  'mock', 'audit-sess-a', 'https://example.test/audit-sess-a'
);
select public.kyc_attach_session(
  (select id from public.kyc_applications where user_id = '00000000-0000-0000-0000-00000000ad0b'),
  'mock', 'audit-sess-b', 'https://example.test/audit-sess-b'
);
select public.kyc_record_provider_event('audit-a1', 'audit-sess-a', 'Approved', '2026-11-19T01:00:00Z');
select public.kyc_record_provider_event('audit-b1', 'audit-sess-b', 'Declined', '2026-11-19T01:00:00Z');
reset role;

select is(
  (select count(*)::int from public.audit_log
   where target_table = 'kyc_applications'
     and target_id in (
       select id::text from public.kyc_applications
       where user_id in ('00000000-0000-0000-0000-00000000ad0a', '00000000-0000-0000-0000-00000000ad0b')
     )),
  0,
  'applicants and the server are not recorded'
);

-- ---------------------------------------------------------------------------
-- Staff decisions through the API
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000ad01","role":"authenticated","aal":"aal2"}', true);
select public.kyc_staff_decide(
  (select id from public.kyc_applications where didit_session_id = 'audit-sess-a'), 'approved');
select public.kyc_staff_decide(
  (select id from public.kyc_applications where didit_session_id = 'audit-sess-b'), 'rejected', 'id_unreadable');
reset role;

select results_eq(
  $$ select actor_id, action, before ->> 'status', after ->> 'status', after ->> 'reviewed_by', after ? 'updated_at'
     from public.audit_log
     where target_table = 'kyc_applications'
       and target_id = (select id::text from public.kyc_applications where didit_session_id = 'audit-sess-a') $$,
  $$ values ('00000000-0000-0000-0000-00000000ad01'::uuid, 'kyc_approved', 'submitted', 'approved',
             '00000000-0000-0000-0000-00000000ad01', false) $$,
  'an approval is recorded under the reviewer and the action name'
);
select results_eq(
  $$ select actor_id, action, before, after
     from public.audit_log
     where target_table = 'profiles' and target_id = '00000000-0000-0000-0000-00000000ad0a' $$,
  $$ values ('00000000-0000-0000-0000-00000000ad01'::uuid, 'kyc_approved',
             '{"status": "under_review"}'::jsonb, '{"status": "approved"}'::jsonb) $$,
  'the account approval it causes is recorded under the same action'
);
select results_eq(
  $$ select actor_id, action, after ->> 'reason_code'
     from public.audit_log
     where target_table = 'kyc_applications'
       and target_id = (select id::text from public.kyc_applications where didit_session_id = 'audit-sess-b') $$,
  $$ values ('00000000-0000-0000-0000-00000000ad01'::uuid, 'kyc_rejected', 'id_unreadable') $$,
  'a rejection is recorded with its reason code'
);

select set_config('request.jwt.claims', '', true);
update public.profiles set status = 'closed' where id = '00000000-0000-0000-0000-00000000ad0b';

select results_eq(
  $$ select actor_id, action, before, after
     from public.audit_log
     where target_table = 'profiles' and target_id = '00000000-0000-0000-0000-00000000ad0b' $$,
  $$ values (null::uuid, 'update', '{"status": "under_review"}'::jsonb, '{"status": "closed"}'::jsonb) $$,
  'a later change in the same transaction is not recorded under the earlier action'
);

-- ---------------------------------------------------------------------------
-- Who can read it
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000ad01","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.audit_log), 0, 'KYC reviewers cannot read the audit log');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000ad0a","role":"authenticated"}', true);
select is((select count(*)::int from public.audit_log), 0, 'users cannot read the audit log');
-- Staff access needs two-step sign-in (Task 10, 20261120000000_staff_console.sql).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000ad02","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.audit_log), 0, 'admins without MFA cannot read the audit log');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000ad02","role":"authenticated","aal":"aal2"}', true);
select ok((select count(*) from public.audit_log) > 0, 'admins with MFA read the audit log');
reset role;
select set_config('request.jwt.claims', '', true);

-- ---------------------------------------------------------------------------
-- Removals outside the API
-- ---------------------------------------------------------------------------

delete from public.staff_members where user_id = '00000000-0000-0000-0000-00000000ad01';

select results_eq(
  $$ select actor_id, before ->> 'role', after
     from public.audit_log
     where target_table = 'staff_members' and action = 'delete'
       and target_id = '00000000-0000-0000-0000-00000000ad01/kyc_reviewer' $$,
  $$ values (null::uuid, 'kyc_reviewer', null::jsonb) $$,
  'a role revoked in Studio is recorded'
);

-- As the Auth dashboard does when deleting a user.
delete from auth.users where id = '00000000-0000-0000-0000-00000000ad0b';

select results_eq(
  $$ select target_table, actor_id
     from public.audit_log
     where action = 'delete'
       and ((target_table = 'profiles' and target_id = '00000000-0000-0000-0000-00000000ad0b')
         or (target_table = 'kyc_applications' and before ->> 'user_id' = '00000000-0000-0000-0000-00000000ad0b'))
     order by target_table $$,
  $$ values ('kyc_applications', null::uuid), ('profiles', null::uuid) $$,
  'deleting a user records the profile and application it removed'
);

-- ---------------------------------------------------------------------------
-- Append-only
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ update public.audit_log set action = 'edited' $$,
  'P0001',
  null,
  'entries cannot be changed'
);
select throws_ok(
  $$ delete from public.audit_log $$,
  'P0001',
  null,
  'entries cannot be deleted'
);

select * from finish();

rollback;
