-- Staff console, database side (Gantt Task 10: TOTP MFA, KYC review queue with
-- reason codes, user view). Screens S1–S8 on the Task 9/10 mockup canvas.
--
-- Decisions taken with Dev 2 on Nov 19, 2026 (Task 10 handoff):
--   - Staff access needs two-step sign-in (aal2) for every read, not only for
--     decisions.
--   - A reviewer cannot decide their own application (S6).
--   - Reviewers can leave an internal note; it is required for the reason
--     'other' and applicants never see it.
--   - KYC reviewers, not only admins, see the audit entries about the user they
--     are looking at (S7). The full audit log stays admin-only.
--   - The reason codes are a PLACEHOLDER list (see below).
--
-- Choices marked "My choice" are not in the proposal and need confirmation.

-- ---------------------------------------------------------------------------
-- 1. Staff access needs two-step sign-in
-- ---------------------------------------------------------------------------

-- Every staff read goes through this function (RLS policies), so a staff member
-- signed in with a password only (aal1) now sees what any user sees. Staff can
-- still read their own staff_members rows at aal1 ("Own roles or staff"), which
-- the staff app uses to send them to the two-step sign-in screens.
create or replace function private.has_staff_role(roles public.staff_role[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
    and exists (
      select 1 from public.staff_members
      where user_id = (select auth.uid())
        and (roles is null or role = any (roles) or role = 'admin')
    );
$$;

-- ---------------------------------------------------------------------------
-- 2. When the ID check was submitted
-- ---------------------------------------------------------------------------

-- The review queue (S4) counts the 24-hour decision target from here: the last
-- time the application moved to 'submitted' (Didit finished its checks). A
-- resubmission after Didit's "Resubmitted" starts the clock again.
alter table public.kyc_applications add column submitted_at timestamptz;

-- Applications submitted before this migration: the time of their last Didit
-- update is the closest record, else the row's last change. Being a change made
-- outside the app's API, the audit log records it (actor null).
update public.kyc_applications
set submitted_at = coalesce(provider_event_at, updated_at)
where status in ('submitted', 'approved', 'rejected');

create function private.set_kyc_submitted_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'submitted' and old.status is distinct from 'submitted' then
    new.submitted_at := now();
  end if;
  return new;
end;
$$;

revoke all on function private.set_kyc_submitted_at from public, anon, authenticated;

create trigger kyc_applications_submitted_at
before update of status on public.kyc_applications
for each row execute function private.set_kyc_submitted_at();

-- ---------------------------------------------------------------------------
-- 3. Reason codes (PLACEHOLDER)
-- ---------------------------------------------------------------------------

-- PLACEHOLDER: these 10 codes are Dev 2's proposal (Task 9/10 mockups, Nov 15),
-- approved on Nov 19 only as a stand-in until the team agrees the final list.
-- Replace them before launch, together with REASON_CODES in
-- apps/web/src/lib/kyc/view-state.ts and the staff app's list.
alter table public.kyc_applications add constraint kyc_applications_reason_code_placeholder check (
  reason_code is null or reason_code in (
    'id_unreadable',
    'id_expired',
    'id_type_not_accepted',
    'face_mismatch',
    'liveness_failed',
    'under_21',
    'outside_ph',
    'duplicate_person',
    'document_suspect',
    'other'
  )
);

comment on constraint kyc_applications_reason_code_placeholder on public.kyc_applications is
  'PLACEHOLDER reason codes (Nov 19, 2026): replace with the team''s final list before launch, together with REASON_CODES in apps/web/src/lib/kyc/view-state.ts.';

-- ---------------------------------------------------------------------------
-- 4. Internal notes
-- ---------------------------------------------------------------------------

-- Kept apart from kyc_applications because applicants can read their own
-- application row (same reason as kyc_check_results). One note per application,
-- written with the decision.
-- My choice: at most 2,000 characters.
create table public.kyc_review_notes (
  application_id bigint primary key references public.kyc_applications (id) on delete cascade,
  note text not null check (char_length(note) between 1 and 2000),
  written_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

revoke all on public.kyc_review_notes from anon, authenticated;
grant select on public.kyc_review_notes to authenticated;

alter table public.kyc_review_notes enable row level security;

create policy "KYC reviewers read notes" on public.kyc_review_notes for select to authenticated
using ((select private.has_staff_role(array['kyc_reviewer']::public.staff_role[])));

-- Staff writes are recorded, like the application they belong to.
create trigger kyc_review_notes_audit
after insert or update or delete on public.kyc_review_notes
for each row execute function private.audit_staff_change('application_id');

-- ---------------------------------------------------------------------------
-- 5. Didit events for the application timeline (S5)
-- ---------------------------------------------------------------------------

-- Status, times and outcome only; no payload is kept (see kyc_provider_events).
grant select on public.kyc_provider_events to authenticated;

create policy "KYC reviewers read vendor events" on public.kyc_provider_events for select to authenticated
using ((select private.has_staff_role(array['kyc_reviewer']::public.staff_role[])));

-- ---------------------------------------------------------------------------
-- 6. Staff decision: own-application block and internal note
-- ---------------------------------------------------------------------------

-- New parameter, so the old signature is replaced rather than overloaded.
drop function public.kyc_staff_decide(bigint, text, text);

create function public.kyc_staff_decide(
  p_application_id bigint,
  p_decision text,
  p_reason_code text default null,
  p_internal_note text default null
)
returns public.kyc_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_note text := nullif(btrim(p_internal_note), '');
  v_app public.kyc_applications;
begin
  -- has_staff_role also requires two-step sign-in (aal2).
  if not (select private.has_staff_role(array['kyc_reviewer']::public.staff_role[])) then
    raise exception 'KYC reviewers with MFA only' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected' using errcode = '22023';
  end if;
  if p_decision = 'rejected' and p_reason_code is null then
    raise exception 'a reason code is required to reject' using errcode = '22023';
  end if;
  if p_reason_code = 'other' and v_note is null then
    raise exception 'the reason other needs an internal note' using errcode = '22023';
  end if;

  select * into v_app
  from public.kyc_applications
  where id = p_application_id and status = 'submitted'
  for update;

  if not found then
    raise exception 'application % is not waiting for a decision', p_application_id using errcode = '22023';
  end if;
  if v_app.user_id = v_actor then
    raise exception 'reviewers cannot decide their own application' using errcode = '42501';
  end if;

  perform private.set_audit_action('kyc_' || p_decision);

  update public.kyc_applications
  set status = p_decision::public.kyc_status,
    reviewed_by = v_actor,
    reviewed_at = now(),
    reason_code = p_reason_code
  where id = v_app.id
  returning * into v_app;

  if v_note is not null then
    insert into public.kyc_review_notes (application_id, note, written_by)
    values (v_app.id, v_note, v_actor);
  end if;

  -- profiles_account_approved pays the starting grant in this same transaction.
  -- Tentative: a rejection leaves the account under review, so the person can
  -- apply again with a new application.
  if v_app.status = 'approved' then
    update public.profiles set status = 'approved' where id = v_app.user_id;
  end if;

  perform private.set_audit_action(null);

  return v_app.status;
end;
$$;

revoke all on function public.kyc_staff_decide from public, anon, authenticated;
grant execute on function public.kyc_staff_decide to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Emails and user search (S4, S5, S7, S8)
-- ---------------------------------------------------------------------------

-- Emails live in auth.users, which the API cannot read. KYC reviewers (and
-- admins) look them up for the applicants and staff members on screen.
create function public.staff_user_emails(p_user_ids uuid[])
returns table (user_id uuid, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.has_staff_role(array['kyc_reviewer']::public.staff_role[])) then
    raise exception 'KYC reviewers with MFA only' using errcode = '42501';
  end if;

  return query
  select u.id, u.email::text
  from auth.users u
  where u.id = any (p_user_ids);
end;
$$;

-- Users screen (S7): search by user ID (exact) or by part of the email.
-- My choice: at least 3 characters for an email search, 20 results at most.
create function public.staff_find_users(p_query text)
returns table (user_id uuid, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := btrim(coalesce(p_query, ''));
begin
  if not (select private.has_staff_role(array['kyc_reviewer']::public.staff_role[])) then
    raise exception 'KYC reviewers with MFA only' using errcode = '42501';
  end if;

  if v_query ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return query
    select u.id, u.email::text from auth.users u where u.id = v_query::uuid;
    return;
  end if;

  if char_length(v_query) < 3 then
    raise exception 'search needs at least 3 characters' using errcode = '22023';
  end if;

  return query
  select u.id, u.email::text
  from auth.users u
  where u.email ilike '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%'
  order by u.email
  limit 20;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Audit entries about one user (S7)
-- ---------------------------------------------------------------------------

-- KYC reviewers see the staff actions on the user they are viewing: their
-- profile, their staff roles, their applications and the notes on them.
-- Newest first, with the staff member's email (null for changes made outside
-- the app's API).
create function public.staff_user_audit(p_user_id uuid)
returns table (
  id bigint,
  created_at timestamptz,
  actor_id uuid,
  actor_email text,
  action text,
  target_table text,
  target_id text,
  before jsonb,
  after jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.has_staff_role(array['kyc_reviewer']::public.staff_role[])) then
    raise exception 'KYC reviewers with MFA only' using errcode = '42501';
  end if;

  return query
  select l.id, l.created_at, l.actor_id, u.email::text, l.action, l.target_table, l.target_id, l.before, l.after
  from public.audit_log l
  left join auth.users u on u.id = l.actor_id
  where (l.target_table = 'profiles' and l.target_id = p_user_id::text)
    or (l.target_table = 'staff_members' and l.target_id like p_user_id::text || '/%')
    or (l.target_table in ('kyc_applications', 'kyc_review_notes')
      and l.target_id in (select a.id::text from public.kyc_applications a where a.user_id = p_user_id))
  order by l.created_at desc, l.id desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function permissions
-- ---------------------------------------------------------------------------

revoke all on function public.staff_user_emails from public, anon, authenticated;
revoke all on function public.staff_find_users from public, anon, authenticated;
revoke all on function public.staff_user_audit from public, anon, authenticated;

grant execute on function public.staff_user_emails to authenticated;
grant execute on function public.staff_find_users to authenticated;
grant execute on function public.staff_user_audit to authenticated;
