-- Community (decided Nov 27, 2026; mockup flow 3): posts with an optional
-- market card, likes, comments, reports and a staff moderation queue.
--
-- Who can do what:
--   read posts, comments, likes   any signed-in account (not anon)
--   post, like, comment           approved accounts without an active
--                                 self-exclusion, with a display name set
--   report                        any signed-in account, not their own post
--   hide or keep a reported post  staff with the moderator role (or admin), at aal2
--
-- A post's "forecast" is the side of the author's latest open bet in the
-- attached market, saved when the post is made. Never the stake or winnings.
-- Display names are chosen by the user; KYC names are never shown.

-- ---------------------------------------------------------------------------
-- Display names
-- ---------------------------------------------------------------------------

-- One person per name, whatever the letter case.
create unique index profiles_display_name_unique on public.profiles (lower(display_name))
where display_name is not null;

-- Names other members may see: only the display name and the month joined,
-- of approved accounts. profiles itself stays readable by its owner and staff only.
create view public.member_profiles
with (security_barrier = true)
as
select id, display_name, created_at
from public.profiles
where status = 'approved';

revoke all on public.member_profiles from anon, authenticated;
grant select on public.member_profiles to authenticated;

comment on view public.member_profiles is 'Display names for Community. Runs as its owner, so it shows these three columns of approved accounts to any signed-in user.';

-- 2 to 40 characters: letters, digits, spaces, dots, dashes and underscores.
-- Errors: not_signed_in, invalid_name, name_taken.
create function public.set_display_name(p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  if char_length(v_name) not between 2 and 40 or v_name !~ '^[[:alnum:] ._-]+$' then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.profiles where lower(display_name) = lower(v_name) and id <> v_user
  ) then
    raise exception 'name_taken' using errcode = 'P0001';
  end if;

  update public.profiles set display_name = v_name, updated_at = now() where id = v_user;
  return v_name;
end;
$$;

revoke all on function public.set_display_name from public, anon;
grant execute on function public.set_display_name to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.posts (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  market_id bigint references public.markets (id) on delete set null,
  forecast_outcome_id bigint references public.market_outcomes (id) on delete set null,
  created_at timestamptz not null default now(),
  hidden_at timestamptz,
  hidden_by uuid references auth.users (id),
  constraint posts_forecast_needs_market check (forecast_outcome_id is null or market_id is not null),
  constraint posts_hidden_together check ((hidden_at is null) = (hidden_by is null))
);

create index posts_created_at_idx on public.posts (created_at desc);
create index posts_market_idx on public.posts (market_id, created_at desc) where market_id is not null;
create index posts_author_idx on public.posts (author_id, created_at desc);

comment on column public.posts.forecast_outcome_id is 'Side of the author''s latest open bet in the market when posting. Never stake or winnings.';

create table public.post_likes (
  post_id bigint not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 300),
  created_at timestamptz not null default now()
);

create index post_comments_post_idx on public.post_comments (post_id, created_at);

create type public.post_report_reason as enum ('spam', 'harassment', 'politics', 'misleading', 'personal_info', 'other');

create table public.post_reports (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason public.post_report_reason not null,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  resolution text check (resolution in ('kept', 'hidden')),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id),
  unique (post_id, reporter_id),
  constraint post_reports_resolved_together check (
    (resolution is null) = (resolved_at is null) and (resolution is null) = (resolved_by is null)
  )
);

create index post_reports_open_idx on public.post_reports (post_id) where resolution is null;

-- ---------------------------------------------------------------------------
-- Who may take part
-- ---------------------------------------------------------------------------

-- Approved, no active self-exclusion (a cooling-off break doesn't stop posting),
-- and a display name set.
create function private.can_post()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'approved' and display_name is not null
  )
  and not exists (
    select 1 from public.exclusions
    where user_id = (select auth.uid()) and kind = 'self_exclusion'
      and starts_at <= now() and (ends_at is null or ends_at > now())
  );
$$;

revoke all on function private.can_post from public, anon, authenticated;
grant execute on function private.can_post to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_reports enable row level security;

revoke all on public.posts, public.post_likes, public.post_comments, public.post_reports from anon, authenticated;
grant select on public.posts, public.post_likes, public.post_comments, public.post_reports to authenticated;
grant insert, delete on public.post_likes to authenticated;
grant insert on public.post_comments to authenticated;
grant insert (post_id, reporter_id, reason, note) on public.post_reports to authenticated;

-- Hidden posts stay visible to their author (shown as removed) and to moderators.
create policy "Visible posts" on public.posts for select to authenticated
using (
  hidden_at is null
  or author_id = (select auth.uid())
  or (select private.has_staff_role(array['moderator']::public.staff_role[]))
);

create policy "Likes on visible posts" on public.post_likes for select to authenticated
using (exists (select 1 from public.posts p where p.id = post_likes.post_id));

create policy "Like as yourself" on public.post_likes for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.can_post())
  and exists (select 1 from public.posts p where p.id = post_likes.post_id and p.hidden_at is null)
);

create policy "Unlike your own like" on public.post_likes for delete to authenticated
using (user_id = (select auth.uid()));

create policy "Comments on visible posts" on public.post_comments for select to authenticated
using (exists (select 1 from public.posts p where p.id = post_comments.post_id));

create policy "Comment as yourself" on public.post_comments for insert to authenticated
with check (
  author_id = (select auth.uid())
  and (select private.can_post())
  and exists (select 1 from public.posts p where p.id = post_comments.post_id and p.hidden_at is null)
);

create policy "Own reports or moderators" on public.post_reports for select to authenticated
using (
  reporter_id = (select auth.uid())
  or (select private.has_staff_role(array['moderator']::public.staff_role[]))
);

create policy "Report others' visible posts" on public.post_reports for insert to authenticated
with check (
  reporter_id = (select auth.uid())
  and exists (
    select 1 from public.posts p
    where p.id = post_reports.post_id and p.hidden_at is null and p.author_id <> (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Posting
-- ---------------------------------------------------------------------------

-- Errors: not_signed_in, cannot_post, needs_display_name, invalid_post, market_not_found.
create function public.create_post(p_body text, p_market_id bigint default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_body text := btrim(coalesce(p_body, ''));
  v_forecast bigint;
  v_id bigint;
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles where id = v_user and display_name is not null) then
    raise exception 'needs_display_name' using errcode = 'P0001';
  end if;
  if not (select private.can_post()) then
    raise exception 'cannot_post' using errcode = 'P0001';
  end if;
  if char_length(v_body) not between 1 and 500 then
    raise exception 'invalid_post' using errcode = 'P0001';
  end if;

  if p_market_id is not null then
    if not exists (
      select 1 from public.markets where id = p_market_id and status not in ('draft', 'pending_approval')
    ) then
      raise exception 'market_not_found' using errcode = 'P0001';
    end if;
    select outcome_id into v_forecast
    from public.bets
    where user_id = v_user and market_id = p_market_id and status = 'open'
    order by placed_at desc
    limit 1;
  end if;

  insert into public.posts (author_id, body, market_id, forecast_outcome_id)
  values (v_user, v_body, p_market_id, v_forecast)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.create_post from public, anon;
grant execute on function public.create_post to authenticated;

-- ---------------------------------------------------------------------------
-- Moderation
-- ---------------------------------------------------------------------------

-- Hide or keep a post. Hiding removes it for everyone but its author; either
-- way the open reports on it are closed. Both write audit entries (triggers below).
-- Errors: not_a_moderator, post_not_found, invalid_action.
create function public.staff_moderate_post(p_post_id bigint, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := (select auth.uid());
begin
  if not (select private.has_staff_role(array['moderator']::public.staff_role[])) then
    raise exception 'not_a_moderator' using errcode = '42501';
  end if;
  if p_action not in ('hide', 'keep') then
    raise exception 'invalid_action' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.posts where id = p_post_id) then
    raise exception 'post_not_found' using errcode = 'P0001';
  end if;

  if p_action = 'hide' then
    update public.posts set hidden_at = now(), hidden_by = v_staff
    where id = p_post_id and hidden_at is null;
  end if;

  update public.post_reports
  set resolution = case p_action when 'hide' then 'hidden' else 'kept' end,
      resolved_at = now(),
      resolved_by = v_staff
  where post_id = p_post_id and resolution is null;
end;
$$;

revoke all on function public.staff_moderate_post from public, anon;
grant execute on function public.staff_moderate_post to authenticated;

-- Staff changes to posts and reports go to the audit log (users' own changes
-- are skipped by the trigger function).
create trigger posts_audit
after update on public.posts
for each row execute function private.audit_staff_change('id');

create trigger post_reports_audit
after update on public.post_reports
for each row execute function private.audit_staff_change('id');
