-- MotoCare public profile presence

alter table public.profiles
add column if not exists last_seen_at timestamptz;

create index if not exists profiles_public_last_seen_idx on public.profiles(is_public, last_seen_at desc);

create or replace function public.community_public_profiles()
returns table (
  id uuid,
  full_name text,
  username text,
  city text,
  rider_type text,
  avatar_url text,
  last_seen_at timestamptz
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
    p.last_seen_at
  from public.profiles p
  where p.is_public = true
  order by p.last_seen_at desc nulls last, p.created_at desc
  limit 80;
$$;
