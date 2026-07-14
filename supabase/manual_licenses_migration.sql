-- MotoCare manual user licenses

create table if not exists public.user_subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'premium', 'business')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  payment_provider text,
  payment_customer_id text,
  notes text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_subscriptions enable row level security;

create index if not exists user_subscriptions_plan_idx on public.user_subscriptions(plan);
create index if not exists user_subscriptions_status_idx on public.user_subscriptions(status);

create or replace function public.touch_user_subscriptions_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_user_subscriptions_updated_at on public.user_subscriptions;
create trigger touch_user_subscriptions_updated_at
before update on public.user_subscriptions
for each row execute function public.touch_user_subscriptions_updated_at();

insert into public.user_subscriptions (user_id, plan, status)
select p.id, 'free', 'active'
from public.profiles p
where not exists (
  select 1
  from public.user_subscriptions s
  where s.user_id = p.id
);

drop policy if exists "subscriptions_read_own_or_admin" on public.user_subscriptions;
create policy "subscriptions_read_own_or_admin" on public.user_subscriptions
for select using (
  user_id = auth.uid()
  or public.is_current_user_admin()
);

drop policy if exists "subscriptions_admin_write" on public.user_subscriptions;
create policy "subscriptions_admin_write" on public.user_subscriptions
for all using (
  public.is_current_user_admin()
) with check (
  public.is_current_user_admin()
);

create or replace function public.current_user_subscription()
returns table (
  user_id uuid,
  plan text,
  status text,
  started_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.user_subscriptions (user_id, plan, status)
  values (auth.uid(), 'free', 'active')
  on conflict on constraint user_subscriptions_pkey do nothing;

  return query
  select
    s.user_id,
    s.plan,
    s.status,
    s.started_at,
    s.expires_at
  from public.user_subscriptions s
  where s.user_id = auth.uid();
end;
$$;

create or replace function public.admin_set_user_subscription(
  target_user_id uuid,
  target_plan text,
  target_status text default 'active',
  target_expires_at timestamptz default null,
  target_notes text default null
)
returns table (
  user_id uuid,
  plan text,
  status text,
  expires_at timestamptz,
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

  if target_plan not in ('free', 'pro', 'premium', 'business') then
    raise exception 'Invalid plan';
  end if;

  if target_status not in ('active', 'trialing', 'past_due', 'canceled') then
    raise exception 'Invalid status';
  end if;

  insert into public.user_subscriptions (
    user_id,
    plan,
    status,
    expires_at,
    notes,
    updated_by
  )
  values (
    target_user_id,
    target_plan,
    target_status,
    target_expires_at,
    target_notes,
    auth.uid()
  )
  on conflict on constraint user_subscriptions_pkey do update set
    plan = excluded.plan,
    status = excluded.status,
    expires_at = excluded.expires_at,
    notes = excluded.notes,
    updated_by = excluded.updated_by;

  return query
  select
    s.user_id,
    s.plan,
    s.status,
    s.expires_at,
    s.updated_at
  from public.user_subscriptions s
  where s.user_id = target_user_id;
end;
$$;

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
    'free_users', (select count(*) from public.user_subscriptions where plan = 'free'),
    'pro_users', (select count(*) from public.user_subscriptions where plan = 'pro'),
    'premium_users', (select count(*) from public.user_subscriptions where plan = 'premium'),
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

drop function if exists public.admin_users();

create or replace function public.admin_users()
returns table (
  id uuid,
  display_name text,
  username text,
  city text,
  rider_type text,
  is_public boolean,
  plan text,
  plan_status text,
  plan_expires_at timestamptz,
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

  insert into public.user_subscriptions (user_id, plan, status)
  select p.id, 'free', 'active'
  from public.profiles p
  where not exists (
    select 1
    from public.user_subscriptions s
    where s.user_id = p.id
  );

  return query
  select
    p.id,
    case when p.is_public then p.full_name else 'Perfil privado' end as display_name,
    case when p.is_public then p.username else concat('privado-', left(p.id::text, 8)) end as username,
    case when p.is_public then p.city else null end as city,
    case when p.is_public then p.rider_type else null end as rider_type,
    p.is_public,
    coalesce(s.plan, 'free') as plan,
    coalesce(s.status, 'active') as plan_status,
    s.expires_at as plan_expires_at,
    p.created_at,
    (select count(*) from public.motorcycles m where m.owner_id = p.id) as motorcycles_count,
    (select count(*) from public.routes r where r.owner_id = p.id) as routes_count,
    (select count(*) from public.posts po where po.author_id = p.id) as posts_count,
    (select count(*) from public.club_members cm where cm.user_id = p.id) as clubs_count
  from public.profiles p
  left join public.user_subscriptions s on s.user_id = p.id
  order by p.created_at desc;
end;
$$;
