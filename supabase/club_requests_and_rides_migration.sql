-- Club join requests and attendance confirmations for club rides.

alter table public.clubs
add column if not exists accepts_join_requests boolean not null default false;

create table if not exists public.club_join_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (club_id, requester_id, status)
);

create table if not exists public.club_post_attendees (
  post_id uuid not null references public.club_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.club_join_requests enable row level security;
alter table public.club_post_attendees enable row level security;

drop policy if exists "club_join_requests_read_related" on public.club_join_requests;
create policy "club_join_requests_read_related" on public.club_join_requests
for select using (
  requester_id = auth.uid()
  or exists (
    select 1 from public.club_members cm
    where cm.club_id = club_join_requests.club_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  )
);

drop policy if exists "club_post_attendees_member_read" on public.club_post_attendees;
create policy "club_post_attendees_member_read" on public.club_post_attendees
for select using (
  exists (
    select 1
    from public.club_posts cp
    join public.club_members cm on cm.club_id = cp.club_id
    where cp.id = club_post_attendees.post_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "club_post_attendees_own_insert" on public.club_post_attendees;
create policy "club_post_attendees_own_insert" on public.club_post_attendees
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.club_posts cp
    join public.club_members cm on cm.club_id = cp.club_id
    where cp.id = club_post_attendees.post_id
      and cp.route_id is not null
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "club_post_attendees_own_delete" on public.club_post_attendees;
create policy "club_post_attendees_own_delete" on public.club_post_attendees
for delete using (user_id = auth.uid());

create or replace function public.request_club_membership(target_club_id uuid)
returns public.club_join_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  created_request public.club_join_requests;
begin
  if current_user_id is null then
    raise exception 'Debes iniciar sesión para solicitar ingreso.';
  end if;
  if not exists (select 1 from public.clubs c where c.id = target_club_id and c.accepts_join_requests) then
    raise exception 'Este club no acepta solicitudes de ingreso.';
  end if;
  if exists (select 1 from public.club_members cm where cm.club_id = target_club_id and cm.user_id = current_user_id) then
    raise exception 'Ya perteneces a este club.';
  end if;

  insert into public.club_join_requests (club_id, requester_id)
  values (target_club_id, current_user_id)
  on conflict (club_id, requester_id, status)
  do update set created_at = excluded.created_at
  returning * into created_request;

  return created_request;
end;
$$;

create or replace function public.review_club_join_request(target_request_id uuid, decision text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_request public.club_join_requests;
  requester_plan text;
begin
  if decision not in ('accepted', 'declined') then
    raise exception 'Decisión no válida.';
  end if;

  select * into target_request
  from public.club_join_requests
  where id = target_request_id and status = 'pending'
  for update;

  if target_request.id is null then
    raise exception 'La solicitud ya no está pendiente.';
  end if;
  if not exists (
    select 1 from public.club_members cm
    where cm.club_id = target_request.club_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  ) then
    raise exception 'No tienes permisos para revisar esta solicitud.';
  end if;

  if decision = 'accepted' then
    select coalesce(s.plan, 'free') into requester_plan
    from public.user_subscriptions s
    where s.user_id = target_request.requester_id
      and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at >= now());

    if coalesce(requester_plan, 'free') = 'business' then
      raise exception 'Las cuentas Business no pueden pertenecer a clubes.';
    end if;
    if coalesce(requester_plan, 'free') = 'free'
      and exists (select 1 from public.club_members cm where cm.user_id = target_request.requester_id) then
      raise exception 'La cuenta Free ya pertenece a un club.';
    end if;

    insert into public.club_members (club_id, user_id, role)
    values (target_request.club_id, target_request.requester_id, 'member')
    on conflict (club_id, user_id) do nothing;
  end if;

  update public.club_join_requests
  set status = decision, responded_at = now()
  where id = target_request.id;
end;
$$;

revoke all on function public.request_club_membership(uuid) from public;
revoke all on function public.review_club_join_request(uuid, text) from public;
grant execute on function public.request_club_membership(uuid) to authenticated;
grant execute on function public.review_club_join_request(uuid, text) to authenticated;

create index if not exists club_join_requests_pending_idx on public.club_join_requests(club_id, status, created_at desc);
create index if not exists club_post_attendees_post_idx on public.club_post_attendees(post_id);
