-- Creates the profile when Supabase Auth creates the user, since clients cannot
-- write to public.profiles. The sign-up form sends the language and the 21+ and
-- Philippines declarations as user metadata. Accounts made another way (staff
-- added from the dashboard, direct API calls) get null declarations, so anything
-- that needs them must check for them.

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, locale, declared_21_plus_at, declared_in_ph_at)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'locale' = 'fil' then 'fil' else 'en' end,
    case when new.raw_user_meta_data ->> 'declared_21_plus' = 'true' then now() end,
    case when new.raw_user_meta_data ->> 'declared_in_ph' = 'true' then now() end
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user from public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();
