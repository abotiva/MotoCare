-- MotoCare MVP schema
-- Run this file in Supabase SQL Editor after creating the project.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text,
  city text,
  rider_type text,
  bio text,
  social_url text,
  avatar_url text,
  is_public boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.motorcycles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  brand text not null,
  model text not null,
  year int,
  plate text,
  color text,
  mileage int not null default 0 check (mileage >= 0),
  image_url text,
  soat_expires_on date,
  technical_review_expires_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists primary_motorcycle_id uuid references public.motorcycles(id) on delete set null;

create table if not exists public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  service_type text not null,
  service_date date not null default current_date,
  mileage int not null default 0 check (mileage >= 0),
  cost numeric(12,2),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  due_date date,
  due_mileage int check (due_mileage is null or due_mileage >= 0),
  status text not null default 'pending' check (status in ('pending', 'done', 'dismissed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.maintenance_suggestions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null default 'general',
  description text,
  recommended_interval_km int check (recommended_interval_km is null or recommended_interval_km >= 0),
  recommended_interval_days int check (recommended_interval_days is null or recommended_interval_days >= 0),
  applies_to text not null default 'all',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.motorcycle_documents (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null check (document_type in ('soat', 'technical_review', 'other')),
  file_name text not null,
  file_path text not null,
  mime_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  motorcycle_id uuid references public.motorcycles(id) on delete set null,
  title text not null,
  origin text,
  destination text,
  distance_km numeric(8,2),
  duration_minutes int,
  start_date date,
  end_date date,
  visibility text not null default 'private' check (visibility in ('private', 'community')),
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed')),
  constraint routes_dates_order_check check (start_date is null or end_date is null or end_date >= start_date),
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  image_url text,
  route_id uuid references public.routes(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_routes (
  route_id uuid not null references public.routes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (route_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('route_planned', 'route_overdue', 'club_invite')),
  title text not null,
  message text not null,
  route_id uuid references public.routes(id) on delete cascade,
  club_invitation_id uuid,
  scheduled_for timestamptz not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  city text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists primary_club_id uuid references public.clubs(id) on delete set null;

create table if not exists public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create table if not exists public.club_invitations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  invited_user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (club_id, invited_user_id, status)
);

create table if not exists public.app_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'owner')),
  created_at timestamptz not null default now()
);

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

create index if not exists user_subscriptions_plan_idx on public.user_subscriptions(plan);
create index if not exists user_subscriptions_status_idx on public.user_subscriptions(status);

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'notifications'
      and constraint_name = 'notifications_club_invitation_id_fkey'
  ) then
    alter table public.notifications
    add constraint notifications_club_invitation_id_fkey
    foreign key (club_invitation_id) references public.club_invitations(id) on delete cascade;
  end if;
end;
$$;

create table if not exists public.club_posts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  route_id uuid references public.routes(id) on delete set null,
  created_at timestamptz not null default now()
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

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists motorcycles_set_updated_at on public.motorcycles;
create trigger motorcycles_set_updated_at
before update on public.motorcycles
for each row execute function public.set_updated_at();

drop trigger if exists maintenance_suggestions_set_updated_at on public.maintenance_suggestions;
create trigger maintenance_suggestions_set_updated_at
before update on public.maintenance_suggestions
for each row execute function public.set_updated_at();

drop trigger if exists clubs_set_updated_at on public.clubs;
create trigger clubs_set_updated_at
before update on public.clubs
for each row execute function public.set_updated_at();

drop trigger if exists user_subscriptions_set_updated_at on public.user_subscriptions;
create trigger user_subscriptions_set_updated_at
before update on public.user_subscriptions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]+', '_', 'g'))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

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

alter table public.profiles enable row level security;
alter table public.motorcycles enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.reminders enable row level security;
alter table public.maintenance_suggestions enable row level security;
alter table public.motorcycle_documents enable row level security;
alter table public.routes enable row level security;
alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_images enable row level security;
alter table public.saved_routes enable row level security;
alter table public.notifications enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.club_invitations enable row level security;
alter table public.club_posts enable row level security;
alter table public.app_admins enable row level security;
alter table public.user_subscriptions enable row level security;

create policy "profiles_select_public" on public.profiles
for select using (
  is_public = true
  or auth.uid() = id
  or exists (
    select 1 from public.club_members cm
    where cm.user_id = profiles.id
      and exists (
        select 1 from public.club_members my_cm
        where my_cm.club_id = cm.club_id
          and my_cm.user_id = auth.uid()
      )
  )
);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "motorcycles_own_all" on public.motorcycles
for all using (
  auth.uid() = owner_id
  and (
    public.is_current_user_admin()
    or coalesce((
      select s.plan
      from public.user_subscriptions s
      where s.user_id = auth.uid()
        and s.status in ('active', 'trialing')
        and (s.expires_at is null or s.expires_at >= now())
    ), 'free') <> 'business'
  )
) with check (
  auth.uid() = owner_id
  and (
    public.is_current_user_admin()
    or coalesce((
      select s.plan
      from public.user_subscriptions s
      where s.user_id = auth.uid()
        and s.status in ('active', 'trialing')
        and (s.expires_at is null or s.expires_at >= now())
    ), 'free') <> 'business'
  )
);

create policy "maintenance_own_all" on public.maintenance_records
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "reminders_own_all" on public.reminders
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "maintenance_suggestions_read_active" on public.maintenance_suggestions
for select using (is_active = true);

create policy "motorcycle_documents_own_all" on public.motorcycle_documents
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "routes_read_visible" on public.routes
for select using (
  visibility = 'community'
  or auth.uid() = owner_id
  or exists (
    select 1
    from public.club_posts cp
    join public.club_members cm on cm.club_id = cp.club_id
    where cp.route_id = routes.id
      and cm.user_id = auth.uid()
  )
);

create policy "routes_own_write" on public.routes
for all using (
  auth.uid() = owner_id
  and coalesce((
    select s.plan
    from public.user_subscriptions s
    where s.user_id = auth.uid()
      and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at >= now())
  ), 'free') <> 'business'
)
with check (
  auth.uid() = owner_id
  and coalesce((
    select s.plan
    from public.user_subscriptions s
    where s.user_id = auth.uid()
      and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at >= now())
  ), 'free') <> 'business'
  and (
    visibility = 'private'
    or coalesce((
      select s.plan
      from public.user_subscriptions s
      where s.user_id = auth.uid()
        and s.status in ('active', 'trialing')
        and (s.expires_at is null or s.expires_at >= now())
    ), 'free') in ('pro', 'premium')
  )
  and (
    motorcycle_id is null
    or exists (
      select 1
      from public.motorcycles m
      where m.id = routes.motorcycle_id
        and m.owner_id = auth.uid()
    )
  )
);

create policy "posts_read_all" on public.posts
for select using (true);

create policy "posts_own_write" on public.posts
for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "comments_read_all" on public.post_comments
for select using (true);

create policy "comments_own_write" on public.post_comments
for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "likes_read_all" on public.post_likes
for select using (true);

create policy "likes_own_write" on public.post_likes
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "post_images_read_all" on public.post_images
for select using (true);

create policy "post_images_own_write" on public.post_images
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "saved_routes_own_all" on public.saved_routes
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notifications_own_all" on public.notifications
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notifications_club_invite_insert" on public.notifications
for insert with check (
  type = 'club_invite'
  and exists (
    select 1 from public.club_invitations ci
    where ci.id = notifications.club_invitation_id
      and ci.invited_user_id = notifications.user_id
      and ci.invited_by = auth.uid()
      and ci.status = 'pending'
  )
);

create policy "clubs_read_all" on public.clubs
for select using (true);

create policy "clubs_owner_insert" on public.clubs
for insert with check (
  auth.uid() = owner_id
  and coalesce((
    select s.plan
    from public.user_subscriptions s
    where s.user_id = auth.uid()
      and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at >= now())
  ), 'free') = 'premium'
  and (select count(*) from public.clubs existing where existing.owner_id = auth.uid()) < 3
);

create policy "clubs_admin_update" on public.clubs
for update using (
  auth.uid() = owner_id
  or exists (
    select 1 from public.club_members cm
    where cm.club_id = clubs.id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  )
) with check (
  auth.uid() = owner_id
  or exists (
    select 1 from public.club_members cm
    where cm.club_id = clubs.id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  )
);

create policy "clubs_owner_delete" on public.clubs
for delete using (auth.uid() = owner_id);

create policy "club_members_read_all" on public.club_members
for select using (true);

create policy "club_members_admin_insert" on public.club_members
for insert with check (
  exists (
    select 1 from public.club_members cm
    where cm.club_id = club_members.club_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  )
  and coalesce((
    select s.plan
    from public.user_subscriptions s
    where s.user_id = club_members.user_id
      and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at >= now())
  ), 'free') <> 'business'
  and (
    coalesce((
      select s.plan
      from public.user_subscriptions s
      where s.user_id = club_members.user_id
        and s.status in ('active', 'trialing')
        and (s.expires_at is null or s.expires_at >= now())
    ), 'free') <> 'free'
    or (
      (select count(*) from public.club_members existing where existing.user_id = club_members.user_id) = 0
      and exists (
        select 1 from public.club_invitations ci
        where ci.club_id = club_members.club_id
          and ci.invited_user_id = club_members.user_id
          and ci.status = 'accepted'
      )
    )
  )
);

create policy "club_members_club_owner_insert" on public.club_members
for insert with check (
  exists (
    select 1 from public.clubs c
    where c.id = club_members.club_id
      and c.owner_id = auth.uid()
  )
  and coalesce((
    select s.plan
    from public.user_subscriptions s
    where s.user_id = club_members.user_id
      and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at >= now())
  ), 'free') <> 'business'
  and (
    coalesce((
      select s.plan
      from public.user_subscriptions s
      where s.user_id = club_members.user_id
        and s.status in ('active', 'trialing')
        and (s.expires_at is null or s.expires_at >= now())
    ), 'free') <> 'free'
    or (
      (select count(*) from public.club_members existing where existing.user_id = club_members.user_id) = 0
      and exists (
        select 1 from public.club_invitations ci
        where ci.club_id = club_members.club_id
          and ci.invited_user_id = club_members.user_id
          and ci.status = 'accepted'
      )
    )
  )
);

create policy "club_members_invitee_accept_insert" on public.club_members
for insert with check (
  auth.uid() = user_id
  and coalesce((
    select s.plan
    from public.user_subscriptions s
    where s.user_id = auth.uid()
      and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at >= now())
  ), 'free') <> 'business'
  and (
    coalesce((
      select s.plan
      from public.user_subscriptions s
      where s.user_id = auth.uid()
        and s.status in ('active', 'trialing')
        and (s.expires_at is null or s.expires_at >= now())
    ), 'free') <> 'free'
    or (select count(*) from public.club_members existing where existing.user_id = auth.uid()) = 0
  )
  and exists (
    select 1 from public.club_invitations ci
    where ci.club_id = club_members.club_id
      and ci.invited_user_id = auth.uid()
      and ci.status = 'accepted'
  )
);

create policy "club_invitations_read_related" on public.club_invitations
for select using (
  auth.uid() = invited_user_id
  or auth.uid() = invited_by
  or exists (
    select 1 from public.club_members cm
    where cm.club_id = club_invitations.club_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  )
);

create policy "club_invitations_admin_insert" on public.club_invitations
for insert with check (
  auth.uid() = invited_by
  and exists (
    select 1 from public.club_members cm
    where cm.club_id = club_invitations.club_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  )
);

create policy "club_invitations_invitee_update" on public.club_invitations
for update using (auth.uid() = invited_user_id)
with check (auth.uid() = invited_user_id);

create policy "app_admins_read_own_or_admin" on public.app_admins
for select using (
  user_id = auth.uid()
  or public.is_current_user_admin()
);

create policy "subscriptions_read_own_or_admin" on public.user_subscriptions
for select using (
  user_id = auth.uid()
  or public.is_current_user_admin()
);

create policy "subscriptions_admin_write" on public.user_subscriptions
for all using (
  public.is_current_user_admin()
) with check (
  public.is_current_user_admin()
);

create policy "club_members_admin_delete" on public.club_members
for delete using (
  user_id = auth.uid()
  or exists (
    select 1 from public.clubs c
    where c.id = club_members.club_id
      and c.owner_id = auth.uid()
  )
);

create policy "club_posts_member_read" on public.club_posts
for select using (
  exists (
    select 1 from public.club_members cm
    where cm.club_id = club_posts.club_id
      and cm.user_id = auth.uid()
  )
);

create policy "club_posts_member_insert" on public.club_posts
for insert with check (
  auth.uid() = author_id
  and exists (
    select 1 from public.club_members cm
    where cm.club_id = club_posts.club_id
      and cm.user_id = auth.uid()
  )
);

create policy "club_posts_author_delete" on public.club_posts
for delete using (
  auth.uid() = author_id
  or exists (
    select 1 from public.club_members cm
    where cm.club_id = club_posts.club_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  )
);

create index if not exists motorcycles_owner_id_idx on public.motorcycles(owner_id);
create index if not exists maintenance_motorcycle_id_idx on public.maintenance_records(motorcycle_id);
create index if not exists reminders_owner_status_idx on public.reminders(owner_id, status);
create index if not exists maintenance_suggestions_active_order_idx on public.maintenance_suggestions(is_active, sort_order);
create index if not exists motorcycle_documents_motorcycle_id_idx on public.motorcycle_documents(motorcycle_id);
create index if not exists routes_visibility_idx on public.routes(visibility);
create index if not exists routes_start_date_idx on public.routes(start_date);
create index if not exists routes_motorcycle_id_idx on public.routes(motorcycle_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists post_images_post_id_idx on public.post_images(post_id, sort_order);
create index if not exists saved_routes_user_id_idx on public.saved_routes(user_id);
create index if not exists notifications_user_schedule_idx on public.notifications(user_id, scheduled_for);
create index if not exists notifications_route_id_idx on public.notifications(route_id);
create index if not exists clubs_owner_id_idx on public.clubs(owner_id);
create index if not exists club_members_user_id_idx on public.club_members(user_id);
create index if not exists club_members_club_id_idx on public.club_members(club_id);
create index if not exists club_posts_club_created_idx on public.club_posts(club_id, created_at desc);
create index if not exists club_posts_route_id_idx on public.club_posts(route_id);
create index if not exists club_invitations_invited_user_status_idx on public.club_invitations(invited_user_id, status);
create index if not exists club_invitations_club_id_idx on public.club_invitations(club_id);
create index if not exists notifications_club_invitation_id_idx on public.notifications(club_invitation_id);
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

create or replace function public.find_profile_for_club_invite(target_club_id uuid, target_username text)
returns table (
  id uuid,
  full_name text,
  username text,
  city text,
  avatar_url text,
  is_public boolean
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.username, p.city, p.avatar_url, p.is_public
  from public.profiles p
  where lower(p.username) = lower(regexp_replace(target_username, '^@', ''))
    and exists (
      select 1 from public.club_members cm
      where cm.club_id = target_club_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  limit 1;
$$;

create or replace function public.search_public_profiles_for_club_invite(target_club_id uuid, search_term text)
returns table (
  id uuid,
  full_name text,
  username text,
  city text,
  avatar_url text
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.username, p.city, p.avatar_url
  from public.profiles p
  where p.is_public = true
    and p.id <> auth.uid()
    and length(trim(search_term)) >= 2
    and (
      lower(coalesce(p.username, '')) like '%' || lower(trim(regexp_replace(search_term, '^@', ''))) || '%'
      or lower(coalesce(p.full_name, '')) like '%' || lower(trim(search_term)) || '%'
      or lower(coalesce(p.city, '')) like '%' || lower(trim(search_term)) || '%'
    )
    and exists (
      select 1 from public.club_members cm
      where cm.club_id = target_club_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
    and not exists (
      select 1 from public.club_members existing
      where existing.club_id = target_club_id
        and existing.user_id = p.id
    )
  order by p.full_name nulls last, p.username nulls last
  limit 8;
$$;

insert into public.maintenance_suggestions (
  code,
  name,
  category,
  description,
  recommended_interval_km,
  recommended_interval_days,
  sort_order
)
values
  ('oil_change', 'Cambio de aceite', 'motor', 'Reemplazo de aceite de motor segun uso y especificacion del fabricante.', 3000, 180, 10),
  ('air_filter', 'Filtro de aire', 'motor', 'Revision o cambio del filtro de aire para mantener buena combustion.', 6000, 365, 20),
  ('brake_pads', 'Pastillas de freno', 'seguridad', 'Inspeccion o cambio de pastillas segun desgaste.', 8000, 365, 30),
  ('chain_kit', 'Kit de arrastre', 'transmision', 'Revision de cadena, sprockets y tension; cambio segun desgaste.', 10000, 365, 40),
  ('tires', 'Llantas', 'seguridad', 'Revision de labrado, presion y estado general de las llantas.', 12000, 365, 50),
  ('general_review', 'Revision general', 'general', 'Chequeo preventivo de niveles, luces, frenos, suspension y tornilleria.', 5000, 180, 60)
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  recommended_interval_km = excluded.recommended_interval_km,
  recommended_interval_days = excluded.recommended_interval_days,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.user_subscriptions (user_id, plan, status)
select p.id, 'free', 'active'
from public.profiles p
where not exists (
  select 1
  from public.user_subscriptions s
  where s.user_id = p.id
);

insert into storage.buckets (id, name, public)
values
  ('motocare-public', 'motocare-public', true),
  ('motocare-documents', 'motocare-documents', false)
on conflict (id) do nothing;

create policy "public_assets_read_all" on storage.objects
for select using (bucket_id = 'motocare-public');

create policy "public_assets_own_insert" on storage.objects
for insert with check (
  bucket_id = 'motocare-public'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "public_assets_own_update" on storage.objects
for update using (
  bucket_id = 'motocare-public'
  and auth.uid()::text = (storage.foldername(name))[1]
) with check (
  bucket_id = 'motocare-public'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "documents_own_select" on storage.objects
for select using (
  bucket_id = 'motocare-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "documents_own_insert" on storage.objects
for insert with check (
  bucket_id = 'motocare-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "documents_own_update" on storage.objects
for update using (
  bucket_id = 'motocare-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
) with check (
  bucket_id = 'motocare-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "documents_own_delete" on storage.objects
for delete using (
  bucket_id = 'motocare-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);
