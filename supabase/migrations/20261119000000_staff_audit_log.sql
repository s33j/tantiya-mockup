-- Staff audit log: every change a staff member makes is recorded in
-- public.audit_log (proposal, Features > Staff console: "audit log of every
-- staff action").
--
-- Triggers on the tables staff change write the entries, so a staff function
-- that forgets to log, or an edit made by hand, still leaves a trace. A change
-- is recorded when it is made:
--   - by a signed-in staff member through the app's API (actor_id is set), or
--   - outside the API: Supabase Studio, the SQL editor, psql, or the Auth
--     dashboard deleting a user (actor_id is null; db_user names the database
--     login).
-- Applicants, guests and the app server (secret key, e.g. the Didit webhook)
-- are not staff, so their changes are not recorded.
--
-- Staff functions name their action with private.set_audit_action (e.g.
-- kyc_approved); every row the action changes is recorded under that name.
-- Without a name the action is insert, update or delete.
--
-- Watched now: staff_members, kyc_settings, kyc_applications and profiles.
-- Markets, resolutions, disputes and withdrawals get the same trigger when
-- their staff functions are built. Reads are not recorded.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

-- Null when the change was made outside the app's API.
alter table public.audit_log alter column actor_id drop not null;

-- The database login that made the change: authenticator for the app's API,
-- postgres for Studio and the SQL editor, supabase_auth_admin for Supabase
-- Auth. Null on entries written before this migration.
alter table public.audit_log add column db_user text;
alter table public.audit_log alter column db_user set default session_user;

-- ---------------------------------------------------------------------------
-- Naming the action
-- ---------------------------------------------------------------------------

-- Names the staff action for the entries written until it is cleared (null)
-- or the transaction ends. Clear it before returning, so later changes in the
-- same transaction are not recorded under this name.
create function private.set_audit_action(p_action text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('tantiya.audit_action', coalesce(p_action, ''), true);
end;
$$;

revoke all on function private.set_audit_action from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Recording changes
-- ---------------------------------------------------------------------------

-- Trigger arguments: the table's primary key columns, joined with '/' into
-- target_id. Updates record only the columns that changed, and an update that
-- changes nothing is not recorded.
create function private.audit_staff_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_before jsonb;
  v_after jsonb;
  v_target_id text;
begin
  -- Through the API (a JWT role is set), only staff are recorded.
  if (select auth.jwt()) ->> 'role' is not null
    and not exists (select 1 from public.staff_members where user_id = v_actor) then
    return null;
  end if;

  if tg_op = 'INSERT' then
    v_after := v_row;
  elsif tg_op = 'DELETE' then
    v_before := v_row;
  else
    -- updated_at changes on every update; created_at on the entry says when.
    select jsonb_object_agg(o.key, o.value), jsonb_object_agg(o.key, n.value)
    into v_before, v_after
    from jsonb_each(to_jsonb(old)) o
    join jsonb_each(v_row) n on n.key = o.key
    where n.value is distinct from o.value and o.key <> 'updated_at';

    if v_before is null then
      return null;
    end if;
  end if;

  select string_agg(v_row ->> a.col, '/' order by a.pos)
  into v_target_id
  from unnest(tg_argv) with ordinality as a(col, pos);

  insert into public.audit_log (actor_id, action, target_table, target_id, before, after)
  values (
    v_actor,
    coalesce(nullif(current_setting('tantiya.audit_action', true), ''), lower(tg_op)),
    tg_table_name,
    v_target_id,
    v_before,
    v_after
  );

  return null;
end;
$$;

revoke all on function private.audit_staff_change from public, anon, authenticated;

create trigger staff_members_audit
after insert or update or delete on public.staff_members
for each row execute function private.audit_staff_change('user_id', 'role');

create trigger kyc_settings_audit
after insert or update or delete on public.kyc_settings
for each row execute function private.audit_staff_change('id');

create trigger kyc_applications_audit
after insert or update or delete on public.kyc_applications
for each row execute function private.audit_staff_change('id');

-- Profiles are inserted only at sign-up (private.handle_new_user).
create trigger profiles_audit
after update or delete on public.profiles
for each row execute function private.audit_staff_change('id');

-- ---------------------------------------------------------------------------
-- KYC decision: logged by the triggers instead of its own insert
-- ---------------------------------------------------------------------------

-- Same as in 20261112000000_kyc_verification.sql, except that the triggers now
-- write the entries: the application's and, on approval, the profile's, both
-- named kyc_approved or kyc_rejected.
create or replace function public.kyc_staff_decide(
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

  perform private.set_audit_action('kyc_' || p_decision);

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

  perform private.set_audit_action(null);

  return v_app.status;
end;
$$;
