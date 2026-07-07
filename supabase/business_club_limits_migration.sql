-- MotoCare license rules for clubs and business accounts
-- Run this once in Supabase SQL Editor after the base schema/migrations.

alter table public.user_subscriptions
drop constraint if exists user_subscriptions_plan_check;

alter table public.user_subscriptions
add constraint user_subscriptions_plan_check
check (plan in ('free', 'pro', 'premium', 'business'));

alter table public.profiles
add column if not exists primary_club_id uuid references public.clubs(id) on delete set null;

drop policy if exists "motorcycles_own_all" on public.motorcycles;
create policy "motorcycles_own_all" on public.motorcycles
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
);

drop policy if exists "clubs_owner_insert" on public.clubs;
create policy "clubs_owner_insert" on public.clubs
for insert with check (
  auth.uid() = owner_id
  and coalesce((
    select s.plan
    from public.user_subscriptions s
    where s.user_id = auth.uid()
      and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at >= now())
  ), 'free') = 'premium'
  and (select count(*) from public.clubs existing where existing.owner_id = auth.uid()) < 3
);

drop policy if exists "club_members_invitee_accept_insert" on public.club_members;
create policy "club_members_invitee_accept_insert" on public.club_members
for insert with check (
  auth.uid() = user_id
  and coalesce((
    select s.plan
    from public.user_subscriptions s
    where s.user_id = auth.uid()
      and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at >= now())
  ), 'free') <> 'business'
  and (
    coalesce((
      select s.plan
      from public.user_subscriptions s
      where s.user_id = auth.uid()
        and s.status in ('active', 'trialing')
        and (s.expires_at is null or s.expires_at >= now())
    ), 'free') <> 'free'
    or (select count(*) from public.club_members existing where existing.user_id = auth.uid()) = 0
  )
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
  and coalesce((
    select s.plan
    from public.user_subscriptions s
    where s.user_id = club_members.user_id
      and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at >= now())
  ), 'free') <> 'business'
  and (
    coalesce((
      select s.plan
      from public.user_subscriptions s
      where s.user_id = club_members.user_id
        and s.status in ('active', 'trialing')
        and (s.expires_at is null or s.expires_at >= now())
    ), 'free') <> 'free'
    or (
      (select count(*) from public.club_members existing where existing.user_id = club_members.user_id) = 0
      and exists (
        select 1 from public.club_invitations ci
        where ci.club_id = club_members.club_id
          and ci.invited_user_id = club_members.user_id
          and ci.status = 'accepted'
      )
    )
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
  and coalesce((
    select s.plan
    from public.user_subscriptions s
    where s.user_id = club_members.user_id
      and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at >= now())
  ), 'free') <> 'business'
  and (
    coalesce((
      select s.plan
      from public.user_subscriptions s
      where s.user_id = club_members.user_id
        and s.status in ('active', 'trialing')
        and (s.expires_at is null or s.expires_at >= now())
    ), 'free') <> 'free'
    or (
      (select count(*) from public.club_members existing where existing.user_id = club_members.user_id) = 0
      and exists (
        select 1 from public.club_invitations ci
        where ci.club_id = club_members.club_id
          and ci.invited_user_id = club_members.user_id
          and ci.status = 'accepted'
      )
    )
  )
);
