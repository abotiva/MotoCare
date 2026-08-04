-- Saved community routes are available to rider accounts (Free and Premium), not Business.
drop policy if exists "saved_routes_own_all" on public.saved_routes;

create policy "saved_routes_own_all" on public.saved_routes
for all using (
  auth.uid() = user_id
  and coalesce((
    select s.plan from public.user_subscriptions s
    where s.user_id = auth.uid()
      and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at >= now())
  ), 'free') in ('free', 'premium')
) with check (
  auth.uid() = user_id
  and coalesce((
    select s.plan from public.user_subscriptions s
    where s.user_id = auth.uid()
      and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at >= now())
  ), 'free') in ('free', 'premium')
);

