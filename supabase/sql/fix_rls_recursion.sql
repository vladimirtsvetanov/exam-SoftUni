-- Fix recursion in profiles RLS policies
-- Run this in the Supabase SQL editor if the policies were already created

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

-- Optional: keep the rest of the policies using the helper too

drop policy if exists "polls_select_public_or_owner" on public.polls;
create policy "polls_select_public_or_owner"
on public.polls
for select
using (
  is_public = true
  or user_id = auth.uid()
  or public.is_admin_user()
);

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

drop policy if exists "votes_delete_owner_or_admin" on public.votes;
create policy "votes_delete_owner_or_admin"
on public.votes
for delete
using (
  user_id = auth.uid()
  or public.is_admin_user()
);
