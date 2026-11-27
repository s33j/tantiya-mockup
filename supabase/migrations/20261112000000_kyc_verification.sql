-- KYC verification (Gantt Task 7): Didit hosted flow, webhooks, the monthly
-- application cap and the staff decision. Builds on kyc_applications from the
-- base schema.
--
-- A Didit "Approved" does not approve the account. The proposal (Features >
-- Sign-up and KYC) has a staff reviewer approve every account, so vendor results
-- only move an application to 'submitted'; kyc_staff_decide sets approved or
-- rejected, and approval sets profiles.status, which pays the starting grant.
--
-- Didit or the dev-only mock (apps/web, KYC_PROVIDER=mock) both speak Didit's V3
-- format, so didit_session_id holds the session id of either.
--
-- Choices marked "Needs confirmation" are not in the proposal.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

-- The user left the Didit flow or its link expired; they may start again.
alter type public.kyc_status add value if not exists 'abandoned' after 'started';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- The cap resets on the 1st of each month, Philippine time.
create function private.kyc_cap_month()
returns date
language sql
stable
set search_path = ''
as $$
  select (date_trunc('month', now() at time zone 'Asia/Manila'))::date;
$$;

revoke all on function private.kyc_cap_month from public, anon, authenticated;

-- Didit V3 session statuses. Unknown strings map to null.
-- PL/pgSQL, so the new 'abandoned' value is only read when called, never while
-- this migration runs.
create function private.kyc_status_from_didit(p_status text)
returns public.kyc_status
language plpgsql
immutable
set search_path = ''
as $$
begin
  return (
    case p_status
      when 'Not Started' then 'started'
      when 'In Progress' then 'started'
      when 'Awaiting User' then 'started'
      when 'Resubmitted' then 'started'
      when 'Approved' then 'submitted'
      when 'Declined' then 'submitted'
      when 'In Review' then 'submitted'
      when 'Abandoned' then 'abandoned'
      when 'Expired' then 'abandoned'
      when 'Kyc Expired' then 'abandoned'
    end
  )::public.kyc_status;
end;
$$;

revoke all on function private.kyc_status_from_didit from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------

create table public.kyc_settings (
  id boolean primary key default true check (id),
  -- Needs confirmation: 30 is what Didit's $10 monthly free credit covers since
  -- 1 November 2026. The proposal assumed 500 free checks a month.
  monthly_cap integer not null default 30 check (monthly_cap >= 0),
  updated_at timestamptz not null default now()
);

insert into public.kyc_settings default values;

-- ---------------------------------------------------------------------------
-- Applications
-- ---------------------------------------------------------------------------

alter table public.kyc_applications
  add column provider text check (provider in ('mock', 'didit')),
  add column session_url text,
  -- Raw vendor status, e.g. 'In Review'
  add column provider_status text,
  -- Time of the last applied vendor event, so older events never overwrite newer ones
  add column provider_event_at timestamptz,
  -- Needs confirmation: every application counts toward its month's cap, even
  -- one the user abandons. Didit bills completed steps only.
  add column cap_month date not null default private.kyc_cap_month();

-- One live application per user. Abandoned and rejected ones don't block a new
-- start (rejected: tentative, see kyc_staff_decide).
create unique index kyc_applications_one_live_per_user on public.kyc_applications (user_id)
where status in ('started', 'submitted', 'approved');
create index kyc_applications_cap_month on public.kyc_applications (cap_month);
create index kyc_applications_review_queue on public.kyc_applications (created_at)
where status = 'submitted';

-- ---------------------------------------------------------------------------
-- Check results
-- ---------------------------------------------------------------------------

-- What a reviewer needs to triage, from Didit's decision. No names, birth dates,
-- ID numbers or images (Data Privacy Act section 11, per the proposal's legal
-- check); reviewers open the full record in the Didit console. Kept apart from
-- kyc_applications because applicants can read their own application row.
create table public.kyc_check_results (
  application_id bigint primary key references public.kyc_applications (id) on delete cascade,
  document_type text,
  face_match_score numeric,
  liveness_score numeric,
  duplicate_face text check (duplicate_face in ('none', 'possible', 'strong')),
  warning_codes text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Vendor events
-- ---------------------------------------------------------------------------

-- One row per webhook, so a retried event is applied once. No payload is kept.
create table public.kyc_provider_events (
  event_id text primary key,
  session_id text not null,
  provider_status text not null,
  event_at timestamptz,
  outcome text not null check (
    outcome in ('pending', 'applied', 'stale', 'unknown_session', 'unknown_status', 'final_locked')
  ),
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger kyc_settings_updated_at before update on public.kyc_settings
for each row execute function private.set_updated_at();
create trigger kyc_check_results_updated_at before update on public.kyc_check_results
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

-- Reads only, and only for KYC reviewers. Vendor events are for the service role.
revoke all on public.kyc_settings, public.kyc_check_results, public.kyc_provider_events
from anon, authenticated;
grant select on public.kyc_settings, public.kyc_check_results to authenticated;

alter table public.kyc_settings enable row level security;
alter table public.kyc_check_results enable row level security;
alter table public.kyc_provider_events enable row level security;

create policy "KYC reviewers read settings" on public.kyc_settings for select to authenticated
using ((select private.has_staff_role(array['kyc_reviewer']::public.staff_role[])));
create policy "KYC reviewers read check results" on public.kyc_check_results for select to authenticated
using ((select private.has_staff_role(array['kyc_reviewer']::public.staff_role[])));

-- ---------------------------------------------------------------------------
-- 1. Start or resume an application (the signed-in user)
-- ---------------------------------------------------------------------------

-- Results:
--   reserved              create a vendor session, then call kyc_attach_session
--   existing              send the user back to session_url
--   already_submitted     waiting for staff: "Under review"
--   already_approved      nothing to do
--   cap_reached           applications are full; resets_on is the 1st of next month
--   declarations_missing  no 21+ or Philippines declaration on the profile
--   not_eligible          the account is rejected or closed
create function public.kyc_start_application()
returns table (result text, application_id bigint, session_url text, resets_on date)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_profile public.profiles;
  v_app public.kyc_applications;
  v_month date := private.kyc_cap_month();
  v_cap integer;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_profile from public.profiles p where p.id = v_user;
  if not found or v_profile.status in ('rejected', 'closed') then
    return query select 'not_eligible', null::bigint, null::text, null::date;
    return;
  end if;
  if v_profile.status = 'approved' then
    return query select 'already_approved', null::bigint, null::text, null::date;
    return;
  end if;
  -- Sign-up records both declarations; accounts made another way have none.
  if v_profile.declared_21_plus_at is null or v_profile.declared_in_ph_at is null then
    return query select 'declarations_missing', null::bigint, null::text, null::date;
    return;
  end if;

  -- One cap check at a time, so two users cannot both take the last slot.
  perform pg_advisory_xact_lock(hashtext('kyc_monthly_cap'));

  select * into v_app
  from public.kyc_applications a
  where a.user_id = v_user and a.status in ('started', 'submitted', 'approved')
  for update;

  if found then
    if v_app.status = 'approved' then
      return query select 'already_approved', v_app.id, null::text, null::date;
    elsif v_app.status = 'submitted' then
      return query select 'already_submitted', v_app.id, null::text, null::date;
    elsif v_app.session_url is not null then
      return query select 'existing', v_app.id, v_app.session_url, null::date;
    else
      -- Reserved earlier, but creating the vendor session never finished.
      return query select 'reserved', v_app.id, null::text, null::date;
    end if;
    return;
  end if;

  select s.monthly_cap into v_cap from public.kyc_settings s;
  if (select count(*) from public.kyc_applications a where a.cap_month = v_month) >= v_cap then
    return query select 'cap_reached', null::bigint, null::text, (v_month + interval '1 month')::date;
    return;
  end if;

  insert into public.kyc_applications (user_id, cap_month)
  values (v_user, v_month)
  returning * into v_app;

  return query select 'reserved', v_app.id, null::text, null::date;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Attach the vendor session (server, service role)
-- ---------------------------------------------------------------------------

create function public.kyc_attach_session(
  p_application_id bigint,
  p_provider text,
  p_session_id text,
  p_session_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.kyc_applications
  set provider = p_provider,
    didit_session_id = p_session_id,
    session_url = p_session_url,
    provider_status = 'Not Started'
  where id = p_application_id and status = 'started' and didit_session_id is null;

  if not found then
    raise exception 'application % cannot take a session', p_application_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Release a reservation when creating the vendor session failed (server)
-- ---------------------------------------------------------------------------

-- Frees the cap slot.
create function public.kyc_release_reservation(p_application_id bigint)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.kyc_applications
  where id = p_application_id and status = 'started' and didit_session_id is null;
$$;

-- ---------------------------------------------------------------------------
-- 4. Record a vendor webhook (server, service role)
-- ---------------------------------------------------------------------------

-- Results: applied | duplicate | stale | unknown_session | unknown_status | final_locked
--   duplicate     the same event_id was recorded before
--   stale         older than the last applied event
--   final_locked  staff already decided, or the application was abandoned (the
--                 user may have started a new one since)
create function public.kyc_record_provider_event(
  p_event_id text,
  p_session_id text,
  p_provider_status text,
  p_event_at timestamptz,
  p_summary jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app public.kyc_applications;
  v_status public.kyc_status := private.kyc_status_from_didit(p_provider_status);
  v_outcome text;
begin
  insert into public.kyc_provider_events (event_id, session_id, provider_status, event_at, outcome)
  values (p_event_id, p_session_id, p_provider_status, p_event_at, 'pending')
  on conflict do nothing;
  if not found then
    return 'duplicate';
  end if;

  select * into v_app
  from public.kyc_applications
  where didit_session_id = p_session_id
  for update;

  if not found then
    v_outcome := 'unknown_session';
  elsif v_status is null then
    v_outcome := 'unknown_status';
  elsif v_app.status in ('approved', 'rejected', 'abandoned') then
    v_outcome := 'final_locked';
  elsif p_event_at < v_app.provider_event_at then
    v_outcome := 'stale';
  else
    update public.kyc_applications
    set status = v_status,
      provider_status = p_provider_status,
      provider_event_at = coalesce(p_event_at, provider_event_at)
    where id = v_app.id;

    -- A later event without a decision keeps what an earlier one reported.
    if p_summary <> '{}'::jsonb then
      insert into public.kyc_check_results as r (
        application_id, document_type, face_match_score, liveness_score, duplicate_face, warning_codes
      )
      values (
        v_app.id,
        p_summary ->> 'document_type',
        (p_summary ->> 'face_match_score')::numeric,
        (p_summary ->> 'liveness_score')::numeric,
        p_summary ->> 'duplicate_face',
        array(select jsonb_array_elements_text(coalesce(p_summary -> 'warning_codes', '[]'::jsonb)))
      )
      on conflict (application_id) do update
      set document_type = coalesce(excluded.document_type, r.document_type),
        face_match_score = coalesce(excluded.face_match_score, r.face_match_score),
        liveness_score = coalesce(excluded.liveness_score, r.liveness_score),
        duplicate_face = coalesce(excluded.duplicate_face, r.duplicate_face),
        warning_codes = case when p_summary ? 'warning_codes' then excluded.warning_codes else r.warning_codes end;
    end if;

    v_outcome := 'applied';
  end if;

  update public.kyc_provider_events set outcome = v_outcome where event_id = p_event_id;
  return v_outcome;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Staff decision (Task 10's review queue)
-- ---------------------------------------------------------------------------

-- KYC reviewers (or admins) signed in with MFA (aal2), per the proposal's staff
-- TOTP MFA. Rejecting needs a reason code.
create function public.kyc_staff_decide(
  p_application_id bigint,
  p_decision text,
  p_reason_code text default null
)
returns public.kyc_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_app public.kyc_applications;
begin
  if not (
    (select private.has_staff_role(array['kyc_reviewer']::public.staff_role[]))
    and coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
  ) then
    raise exception 'KYC reviewers with MFA only' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected' using errcode = '22023';
  end if;
  if p_decision = 'rejected' and p_reason_code is null then
    raise exception 'a reason code is required to reject' using errcode = '22023';
  end if;

  update public.kyc_applications
  set status = p_decision::public.kyc_status,
    reviewed_by = v_actor,
    reviewed_at = now(),
    reason_code = p_reason_code
  where id = p_application_id and status = 'submitted'
  returning * into v_app;

  if not found then
    raise exception 'application % is not waiting for a decision', p_application_id using errcode = '22023';
  end if;

  -- profiles_account_approved pays the starting grant in this same transaction.
  -- Tentative: a rejection leaves the account under review, so the person can
  -- apply again with a new application.
  if v_app.status = 'approved' then
    update public.profiles set status = 'approved' where id = v_app.user_id;
  end if;

  insert into public.audit_log (actor_id, action, target_table, target_id, before, after)
  values (
    v_actor,
    'kyc_' || p_decision,
    'kyc_applications',
    v_app.id::text,
    jsonb_build_object('status', 'submitted'),
    jsonb_build_object('status', v_app.status, 'reason_code', v_app.reason_code)
  );

  return v_app.status;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function permissions
-- ---------------------------------------------------------------------------

revoke all on function public.kyc_start_application from public, anon, authenticated;
revoke all on function public.kyc_attach_session from public, anon, authenticated;
revoke all on function public.kyc_release_reservation from public, anon, authenticated;
revoke all on function public.kyc_record_provider_event from public, anon, authenticated;
revoke all on function public.kyc_staff_decide from public, anon, authenticated;

grant execute on function public.kyc_start_application to authenticated;
grant execute on function public.kyc_staff_decide to authenticated;
grant execute on function public.kyc_attach_session to service_role;
grant execute on function public.kyc_release_reservation to service_role;
grant execute on function public.kyc_record_provider_event to service_role;
