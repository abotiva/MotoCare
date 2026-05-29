create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('route_planned', 'route_overdue')),
  title text not null,
  message text not null,
  route_id uuid references public.routes(id) on delete cascade,
  scheduled_for timestamptz not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check
check (type in ('route_planned', 'route_overdue'));

drop policy if exists "notifications_own_all" on public.notifications;
create policy "notifications_own_all" on public.notifications
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists notifications_user_schedule_idx on public.notifications(user_id, scheduled_for);
create index if not exists notifications_route_id_idx on public.notifications(route_id);
