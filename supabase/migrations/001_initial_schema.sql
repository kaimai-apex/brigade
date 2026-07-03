-- Brigade MVP schema: profiles, education, experiences, accolades, portfolio_links

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  headline text,
  bio text,
  profile_image_url text,
  city text,
  state text,
  country text,
  role text,
  years_experience integer,
  current_employer text,
  current_position text,
  expertise_areas text[] default '{}',
  instagram_url text,
  website_url text,
  linkedin_url text,
  resume_url text,
  open_to_opportunities boolean default false,
  available_private_events boolean default false,
  available_contract_work boolean default false,
  available_emergency_staffing boolean default false,
  onboarding_completed boolean default false,
  onboarding_step integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- education
-- ---------------------------------------------------------------------------
create table if not exists public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  school_name text not null,
  program_name text,
  graduation_year integer,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- experiences
-- ---------------------------------------------------------------------------
create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_name text not null,
  position_title text not null,
  start_date date,
  end_date date,
  description text,
  is_current boolean default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- accolades
-- ---------------------------------------------------------------------------
create table if not exists public.accolades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  organization text,
  year integer,
  description text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- portfolio_links
-- ---------------------------------------------------------------------------
create table if not exists public.portfolio_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  url text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, role, city, state, country)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'role', ''),
    coalesce(new.raw_user_meta_data->>'city', ''),
    coalesce(new.raw_user_meta_data->>'state', ''),
    coalesce(new.raw_user_meta_data->>'country', '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.education enable row level security;
alter table public.experiences enable row level security;
alter table public.accolades enable row level security;
alter table public.portfolio_links enable row level security;

-- profiles: public read, owner write
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- education
create policy "Education is viewable by everyone"
  on public.education for select using (true);

create policy "Users can manage their own education"
  on public.education for all using (auth.uid() = user_id);

-- experiences
create policy "Experiences are viewable by everyone"
  on public.experiences for select using (true);

create policy "Users can manage their own experiences"
  on public.experiences for all using (auth.uid() = user_id);

-- accolades
create policy "Accolades are viewable by everyone"
  on public.accolades for select using (true);

create policy "Users can manage their own accolades"
  on public.accolades for all using (auth.uid() = user_id);

-- portfolio_links
create policy "Portfolio links are viewable by everyone"
  on public.portfolio_links for select using (true);

create policy "Users can manage their own portfolio links"
  on public.portfolio_links for all using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- storage buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

-- avatars: public read, owner upload
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- resumes: owner only
create policy "Users can read their own resume"
  on storage.objects for select
  using (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload their own resume"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own resume"
  on storage.objects for update
  using (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own resume"
  on storage.objects for delete
  using (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
