-- Align route permissions with the product model:
-- Free: private personal routes only.
-- Premium/Pro: private routes plus sharing routes with the community.
-- Business: business accounts do not operate as personal riders.

alter table public.routes
add column if not exists motorcycle_id uuid references public.motorcycles(id) on delete set null;

create index if not exists routes_motorcycle_id_idx on public.routes(motorcycle_id);

drop policy if exists "routes_own_all" on public.routes;
drop policy if exists "routes_select_own_or_community" on public.routes;
drop policy if exists "routes_read_own_or_community" on public.routes;
drop policy if exists "routes_read_visible" on public.routes;
drop policy if exists "routes_own_write" on public.routes;

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
) with check (
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
