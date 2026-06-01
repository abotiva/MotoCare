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

create table if not exists public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create table if not exists public.club_posts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

drop trigger if exists clubs_set_updated_at on public.clubs;
create trigger clubs_set_updated_at
before update on public.clubs
for each row execute function public.set_updated_at();

alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.club_posts enable row level security;

drop policy if exists "clubs_read_all" on public.clubs;
create policy "clubs_read_all" on public.clubs
for select using (true);

drop policy if exists "clubs_owner_insert" on public.clubs;
create policy "clubs_owner_insert" on public.clubs
for insert with check (auth.uid() = owner_id);

drop policy if exists "clubs_admin_update" on public.clubs;
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

drop policy if exists "clubs_owner_delete" on public.clubs;
create policy "clubs_owner_delete" on public.clubs
for delete using (auth.uid() = owner_id);

drop policy if exists "club_members_read_all" on public.club_members;
create policy "club_members_read_all" on public.club_members
for select using (true);

drop policy if exists "club_members_admin_insert" on public.club_members;
create policy "club_members_admin_insert" on public.club_members
for insert with check (
  exists (
    select 1 from public.clubs c
    where c.id = club_members.club_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "club_members_admin_delete" on public.club_members;
create policy "club_members_admin_delete" on public.club_members
for delete using (
  user_id = auth.uid()
  or exists (
    select 1 from public.clubs c
    where c.id = club_members.club_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "club_posts_member_read" on public.club_posts;
create policy "club_posts_member_read" on public.club_posts
for select using (
  exists (
    select 1 from public.club_members cm
    where cm.club_id = club_posts.club_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "club_posts_member_insert" on public.club_posts;
create policy "club_posts_member_insert" on public.club_posts
for insert with check (
  auth.uid() = author_id
  and exists (
    select 1 from public.club_members cm
    where cm.club_id = club_posts.club_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "club_posts_author_delete" on public.club_posts;
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

create index if not exists clubs_owner_id_idx on public.clubs(owner_id);
create index if not exists club_members_user_id_idx on public.club_members(user_id);
create index if not exists club_members_club_id_idx on public.club_members(club_id);
create index if not exists club_posts_club_created_idx on public.club_posts(club_id, created_at desc);
