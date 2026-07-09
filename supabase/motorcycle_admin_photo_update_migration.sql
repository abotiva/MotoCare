-- Allows app admins to keep managing their own motorcycle records even when
-- their subscription plan is Business. This fixes image_url updates for admin
-- accounts that also use the operational Business license.

drop policy if exists "motorcycles_own_all" on public.motorcycles;

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
