-- Creates live poll results and vote counter support
-- Run this in the Supabase SQL editor

create or replace function public.sync_option_vote_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.options
    set vote_count = vote_count + 1
    where id = new.option_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.options
    set vote_count = greatest(vote_count - 1, 0)
    where id = old.option_id;
    return old;
  end if;

  return null;
end;
$$;

create or replace function public.get_poll_details_with_results(p_poll_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'description', p.description,
    'image_url', p.image_url,
    'is_public', p.is_public,
    'created_at', p.created_at,
    'options', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', o.id,
            'option_text', o.option_text,
            'vote_count', (
              select count(*)::int
              from public.votes v
              where v.option_id = o.id
            )
          )
          order by o.created_at
        )
        from public.options o
        where o.poll_id = p.id
      ),
      '[]'::jsonb
    ),
    'userVoteOptionId', (
      select v.option_id
      from public.votes v
      where v.poll_id = p.id
        and v.user_id = auth.uid()
      limit 1
    ),
    'userVoteText', (
      select o.option_text
      from public.votes v
      join public.options o on o.id = v.option_id
      where v.poll_id = p.id
        and v.user_id = auth.uid()
      limit 1
    )
  )
  into result
  from public.polls p
  where p.id = p_poll_id
    and (
      p.is_public = true
      or p.user_id = auth.uid()
      or public.is_admin_user()
    );

  return result;
end;
$$;

drop trigger if exists sync_option_vote_count_insert on public.votes;
create trigger sync_option_vote_count_insert
after insert on public.votes
for each row execute function public.sync_option_vote_count();

drop trigger if exists sync_option_vote_count_delete on public.votes;
create trigger sync_option_vote_count_delete
after delete on public.votes
for each row execute function public.sync_option_vote_count();
