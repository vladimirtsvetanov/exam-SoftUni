-- Initial schema for Poll System
-- Run this through Supabase migrations or the SQL editor

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  image_url text,
  is_public boolean not null default true,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_text text not null,
  vote_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint votes_one_per_poll unique (poll_id, user_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_polls_updated_at on public.polls;
create trigger set_polls_updated_at
before update on public.polls
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    null
  );
  return new;
end;
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  );
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.polls enable row level security;
alter table public.options enable row level security;
alter table public.votes enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id or public.is_admin_user());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id or public.is_admin_user())
with check (auth.uid() = id or public.is_admin_user());

drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy "profiles_admin_select_all"
on public.profiles
for select
using (public.is_admin_user());

drop policy if exists "polls_select_public_or_owner" on public.polls;
create policy "polls_select_public_or_owner"
on public.polls
for select
using (
  is_public = true
  or user_id = auth.uid()
  or public.is_admin_user()
);

drop policy if exists "polls_insert_own" on public.polls;
create policy "polls_insert_own"
on public.polls
for insert
with check (user_id = auth.uid());

drop policy if exists "polls_update_own" on public.polls;
create policy "polls_update_own"
on public.polls
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "polls_delete_own" on public.polls;
create policy "polls_delete_own"
on public.polls
for delete
using (
  user_id = auth.uid()
  or public.is_admin_user()
);

drop policy if exists "options_select_for_visible_polls" on public.options;
create policy "options_select_for_visible_polls"
on public.options
for select
using (
  exists (
    select 1
    from public.polls pl
    where pl.id = options.poll_id
      and (
        pl.is_public = true
        or pl.user_id = auth.uid()
        or public.is_admin_user()
      )
  )
);

drop policy if exists "options_insert_owner" on public.options;
create policy "options_insert_owner"
on public.options
for insert
with check (
  exists (
    select 1
    from public.polls pl
    where pl.id = options.poll_id
      and pl.user_id = auth.uid()
  )
);

drop policy if exists "options_update_owner" on public.options;
create policy "options_update_owner"
on public.options
for update
using (
  exists (
    select 1
    from public.polls pl
    where pl.id = options.poll_id
      and pl.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.polls pl
    where pl.id = options.poll_id
      and pl.user_id = auth.uid()
  )
);

drop policy if exists "options_delete_owner" on public.options;
create policy "options_delete_owner"
on public.options
for delete
using (
  exists (
    select 1
    from public.polls pl
    where pl.id = options.poll_id
      and pl.user_id = auth.uid()
  )
);

drop policy if exists "votes_select_own_or_owner" on public.votes;
create policy "votes_select_own_or_owner"
on public.votes
for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.polls pl
    where pl.id = votes.poll_id
      and pl.user_id = auth.uid()
  )
  or public.is_admin_user()
);

drop policy if exists "votes_insert_own_once" on public.votes;
create policy "votes_insert_own_once"
on public.votes
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.polls pl
    where pl.id = votes.poll_id
      and (
        pl.is_public = true
        or pl.user_id = auth.uid()
      )
  )
  and exists (
    select 1
    from public.options o
    where o.id = votes.option_id
      and o.poll_id = votes.poll_id
  )
);

drop policy if exists "votes_delete_owner_or_admin" on public.votes;
create policy "votes_delete_owner_or_admin"
on public.votes
for delete
using (
  user_id = auth.uid()
  or public.is_admin_user()
);

insert into storage.buckets (id, name, public)
values ('poll-images', 'poll-images', true)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

drop policy if exists "poll_images_public_read" on storage.objects;
create policy "poll_images_public_read"
on storage.objects
for select
using (bucket_id = 'poll-images');

drop policy if exists "poll_images_authenticated_upload" on storage.objects;
create policy "poll_images_authenticated_upload"
on storage.objects
for insert
with check (bucket_id = 'poll-images' and auth.role() = 'authenticated');

drop policy if exists "poll_images_owner_update" on storage.objects;
create policy "poll_images_owner_update"
on storage.objects
for update
using (bucket_id = 'poll-images' and owner = auth.uid())
with check (bucket_id = 'poll-images' and owner = auth.uid());

drop policy if exists "poll_images_owner_delete" on storage.objects;
create policy "poll_images_owner_delete"
on storage.objects
for delete
using (bucket_id = 'poll-images' and owner = auth.uid());
