-- MotoCare MVP schema
-- Run this file in Supabase SQL Editor after creating the project.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text,
  city text,
  rider_type text,
  avatar_url text,
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

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  origin text,
  destination text,
  distance_km numeric(8,2),
  duration_minutes int,
  visibility text not null default 'private' check (visibility in ('private', 'community')),
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

alter table public.profiles enable row level security;
alter table public.motorcycles enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.reminders enable row level security;
alter table public.routes enable row level security;
alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_likes enable row level security;

create policy "profiles_select_public" on public.profiles
for select using (true);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "motorcycles_own_all" on public.motorcycles
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "maintenance_own_all" on public.maintenance_records
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "reminders_own_all" on public.reminders
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "routes_read_visible" on public.routes
for select using (visibility = 'community' or auth.uid() = owner_id);

create policy "routes_own_write" on public.routes
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

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

create index if not exists motorcycles_owner_id_idx on public.motorcycles(owner_id);
create index if not exists maintenance_motorcycle_id_idx on public.maintenance_records(motorcycle_id);
create index if not exists reminders_owner_status_idx on public.reminders(owner_id, status);
create index if not exists routes_visibility_idx on public.routes(visibility);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
