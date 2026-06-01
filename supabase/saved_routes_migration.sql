create table if not exists public.saved_routes (
  route_id uuid not null references public.routes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (route_id, user_id)
);

alter table public.saved_routes enable row level security;

drop policy if exists "saved_routes_own_all" on public.saved_routes;
create policy "saved_routes_own_all" on public.saved_routes
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists saved_routes_user_id_idx on public.saved_routes(user_id);
