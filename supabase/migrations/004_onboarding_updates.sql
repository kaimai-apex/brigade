-- Education date ranges, work showcase photos, onboarding step remap

alter table public.education
  add column if not exists start_date date,
  add column if not exists end_date date;

-- Remap onboarding steps after removing accolades step
update public.profiles
set onboarding_step = case
  when onboarding_step >= 6 then 5
  when onboarding_step >= 4 then onboarding_step - 1
  else onboarding_step
end
where onboarding_completed = false;

-- Work showcase photos (3-5 on profile)
create table if not exists public.profile_work_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_profile_work_photos_user
  on public.profile_work_photos(user_id, sort_order);

alter table public.profile_work_photos enable row level security;

create policy "Work photos are viewable by everyone"
  on public.profile_work_photos for select using (true);

create policy "Users can manage their own work photos"
  on public.profile_work_photos for all using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('work-photos', 'work-photos', true)
on conflict (id) do nothing;

create policy "Work photos are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'work-photos');

create policy "Users can upload their own work photos"
  on storage.objects for insert
  with check (
    bucket_id = 'work-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own work photos"
  on storage.objects for update
  using (
    bucket_id = 'work-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own work photos"
  on storage.objects for delete
  using (
    bucket_id = 'work-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
