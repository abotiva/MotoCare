-- MotoCare admin module with privacy-preserving read models

create table if not exists public.app_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'owner')),
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_admins a
    where a.user_id = auth.uid()
  );
$$;

drop policy if exists "app_admins_read_own_or_admin" on public.app_admins;
create policy "app_admins_read_own_or_admin" on public.app_admins
for select using (
  user_id = auth.uid()
  or public.is_current_user_admin()
);

create or replace function public.admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access required';
  end if;

  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'public_users', (select count(*) from public.profiles where is_public = true),
    'private_users', (select count(*) from public.profiles where is_public = false),
    'motorcycles', (select count(*) from public.motorcycles),
    'routes', (select count(*) from public.routes),
    'community_routes', (select count(*) from public.routes where visibility = 'community'),
    'posts', (select count(*) from public.posts),
    'clubs', (select count(*) from public.clubs),
    'club_memberships', (select count(*) from public.club_members),
    'pending_club_invitations', (select count(*) from public.club_invitations where status = 'pending'),
    'maintenance_suggestions', (select count(*) from public.maintenance_suggestions),
    'active_maintenance_suggestions', (select count(*) from public.maintenance_suggestions where is_active = true)
  );
end;
$$;

create or replace function public.admin_users()
returns table (
  id uuid,
  display_name text,
  username text,
  city text,
  rider_type text,
  is_public boolean,
  created_at timestamptz,
  motorcycles_count bigint,
  routes_count bigint,
  posts_count bigint,
  clubs_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    p.id,
    case when p.is_public then p.full_name else 'Perfil privado' end as display_name,
    case when p.is_public then p.username else concat('privado-', left(p.id::text, 8)) end as username,
    case when p.is_public then p.city else null end as city,
    case when p.is_public then p.rider_type else null end as rider_type,
    p.is_public,
    p.created_at,
    (select count(*) from public.motorcycles m where m.owner_id = p.id) as motorcycles_count,
    (select count(*) from public.routes r where r.owner_id = p.id) as routes_count,
    (select count(*) from public.posts po where po.author_id = p.id) as posts_count,
    (select count(*) from public.club_members cm where cm.user_id = p.id) as clubs_count
  from public.profiles p
  order by p.created_at desc;
end;
$$;

create or replace function public.admin_clubs()
returns table (
  id uuid,
  name text,
  city text,
  owner_display_name text,
  owner_is_public boolean,
  members_count bigint,
  posts_count bigint,
  pending_invitations_count bigint,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    c.id,
    c.name,
    c.city,
    case when p.is_public then coalesce(p.full_name, p.username) else 'Fundador privado' end as owner_display_name,
    p.is_public as owner_is_public,
    (select count(*) from public.club_members cm where cm.club_id = c.id) as members_count,
    (select count(*) from public.club_posts cp where cp.club_id = c.id) as posts_count,
    (select count(*) from public.club_invitations ci where ci.club_id = c.id and ci.status = 'pending') as pending_invitations_count,
    c.created_at
  from public.clubs c
  left join public.profiles p on p.id = c.owner_id
  order by c.created_at desc;
end;
$$;

create or replace function public.admin_maintenance_suggestions()
returns table (
  id uuid,
  code text,
  name text,
  category text,
  recommended_interval_km int,
  recommended_interval_days int,
  applies_to text,
  sort_order int,
  is_active boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    ms.id,
    ms.code,
    ms.name,
    ms.category,
    ms.recommended_interval_km,
    ms.recommended_interval_days,
    ms.applies_to,
    ms.sort_order,
    ms.is_active,
    ms.updated_at
  from public.maintenance_suggestions ms
  order by ms.sort_order asc, ms.name asc;
end;
$$;
