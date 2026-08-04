-- Public, non-sensitive Premium indicator used only for profile presentation.

alter table public.profiles
add column if not exists is_premium boolean not null default false;

create or replace function public.sync_profile_premium_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  premium_active boolean;
begin
  target_user_id := coalesce(new.user_id, old.user_id);

  select exists (
    select 1
    from public.user_subscriptions s
    where s.user_id = target_user_id
      and s.plan in ('pro', 'premium')
      and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at > now())
  )
  into premium_active;

  update public.profiles
  set is_premium = premium_active
  where id = target_user_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_profile_premium_after_subscription on public.user_subscriptions;
create trigger sync_profile_premium_after_subscription
after insert or update or delete on public.user_subscriptions
for each row execute function public.sync_profile_premium_status();

update public.profiles p
set is_premium = exists (
  select 1
  from public.user_subscriptions s
  where s.user_id = p.id
    and s.plan in ('pro', 'premium')
    and s.status in ('active', 'trialing')
    and (s.expires_at is null or s.expires_at > now())
);

drop function if exists public.community_public_profiles();
create function public.community_public_profiles()
returns table (
  id uuid,
  full_name text,
  username text,
  city text,
  rider_type text,
  avatar_url text,
  last_seen_at timestamptz,
  is_premium boolean
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.username,
    p.city,
    p.rider_type,
    p.avatar_url,
    p.last_seen_at,
    p.is_premium
  from public.profiles p
  where p.is_public = true
  order by p.last_seen_at desc nulls last, p.created_at desc
  limit 80;
$$;

revoke all on function public.community_public_profiles() from public;
grant execute on function public.community_public_profiles() to authenticated;
