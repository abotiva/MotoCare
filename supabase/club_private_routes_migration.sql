-- MotoCare private club route sharing

alter table public.club_posts
add column if not exists route_id uuid references public.routes(id) on delete set null;

create index if not exists club_posts_route_id_idx on public.club_posts(route_id);

drop policy if exists "routes_read_visible" on public.routes;
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
