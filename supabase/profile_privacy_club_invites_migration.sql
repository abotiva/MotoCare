-- MotoCare profile privacy and club invitation approvals

alter table public.profiles
add column if not exists is_public boolean not null default true;

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

alter table public.notifications
add column if not exists club_invitation_id uuid references public.club_invitations(id) on delete cascade;

alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check
check (type in ('route_planned', 'route_overdue', 'club_invite'));

alter table public.club_invitations enable row level security;

drop policy if exists "profiles_select_public" on public.profiles;
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

drop policy if exists "club_invitations_read_related" on public.club_invitations;
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

drop policy if exists "club_invitations_admin_insert" on public.club_invitations;
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

drop policy if exists "club_invitations_invitee_update" on public.club_invitations;
create policy "club_invitations_invitee_update" on public.club_invitations
for update using (auth.uid() = invited_user_id)
with check (auth.uid() = invited_user_id);

drop policy if exists "club_members_invitee_accept_insert" on public.club_members;
create policy "club_members_invitee_accept_insert" on public.club_members
for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.club_invitations ci
    where ci.club_id = club_members.club_id
      and ci.invited_user_id = auth.uid()
      and ci.status = 'accepted'
  )
);

drop policy if exists "club_members_admin_insert" on public.club_members;
create policy "club_members_admin_insert" on public.club_members
for insert with check (
  exists (
    select 1 from public.club_members cm
    where cm.club_id = club_members.club_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  )
);

drop policy if exists "club_members_club_owner_insert" on public.club_members;
create policy "club_members_club_owner_insert" on public.club_members
for insert with check (
  exists (
    select 1 from public.clubs c
    where c.id = club_members.club_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "notifications_club_invite_insert" on public.notifications;
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

create index if not exists club_invitations_invited_user_status_idx on public.club_invitations(invited_user_id, status);
create index if not exists club_invitations_club_id_idx on public.club_invitations(club_id);
create index if not exists notifications_club_invitation_id_idx on public.notifications(club_invitation_id);

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
