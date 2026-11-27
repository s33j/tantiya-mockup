-- Lets an applicant record the 21+ and Philippines declarations after sign-up
-- (Gantt Task 9, screen 10 "Confirm declarations").
--
-- The sign-up form records both declarations through private.handle_new_user.
-- Accounts made another way have none, and kyc_start_application answers
-- 'declarations_missing' for them. Clients cannot write to public.profiles, so
-- this function is the only way to add the declarations afterwards.
--
-- Both must be true: the function records a declaration, it never removes one.
-- Only accounts still under review can call it; an approved, rejected or closed
-- account has nothing to declare.

create function public.kyc_confirm_declarations(
  p_declared_21_plus boolean,
  p_declared_in_ph boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_declared_21_plus is not true or p_declared_in_ph is not true then
    raise exception 'both declarations are required' using errcode = '22023';
  end if;

  -- Keep the first time each declaration was made.
  update public.profiles p
  set declared_21_plus_at = coalesce(p.declared_21_plus_at, now()),
    declared_in_ph_at = coalesce(p.declared_in_ph_at, now())
  where p.id = v_user and p.status = 'under_review';

  if not found then
    raise exception 'account is not under review' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.kyc_confirm_declarations from public, anon, authenticated;
grant execute on function public.kyc_confirm_declarations to authenticated;
