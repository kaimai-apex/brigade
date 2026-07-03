-- Improve profile name extraction for Google OAuth and other providers

create or replace function public.handle_new_user()
returns trigger as $$
declare
  meta jsonb := new.raw_user_meta_data;
  full_name text := coalesce(meta->>'full_name', meta->>'name', '');
  first_name text := coalesce(nullif(meta->>'first_name', ''), nullif(meta->>'given_name', ''));
  last_name text := coalesce(nullif(meta->>'last_name', ''), nullif(meta->>'family_name', ''));
begin
  if first_name is null and full_name <> '' then
    first_name := split_part(full_name, ' ', 1);
  end if;

  if last_name is null and full_name <> '' and position(' ' in full_name) > 0 then
    last_name := trim(substring(full_name from position(' ' in full_name) + 1));
  end if;

  insert into public.profiles (id, first_name, last_name, role, city, state, country)
  values (
    new.id,
    coalesce(first_name, ''),
    coalesce(last_name, ''),
    coalesce(meta->>'role', ''),
    coalesce(meta->>'city', ''),
    coalesce(meta->>'state', ''),
    coalesce(meta->>'country', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Backfill names for existing profiles from auth metadata (Google OAuth, etc.)
update public.profiles p
set
  first_name = coalesce(
    nullif(p.first_name, ''),
    nullif(u.raw_user_meta_data->>'first_name', ''),
    nullif(u.raw_user_meta_data->>'given_name', ''),
    nullif(split_part(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), ' ', 1), '')
  ),
  last_name = coalesce(
    nullif(p.last_name, ''),
    nullif(u.raw_user_meta_data->>'last_name', ''),
    nullif(u.raw_user_meta_data->>'family_name', ''),
    nullif(
      trim(substring(
        coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')
        from position(' ' in coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ' ')) + 1
      )),
      ''
    )
  )
from auth.users u
where p.id = u.id
  and (nullif(p.first_name, '') is null or nullif(p.last_name, '') is null);
