-- Fix MotoCare subscription RPC ambiguity on user_id

drop function if exists public.current_user_subscription();

create or replace function public.current_user_subscription()
returns table (
  user_id uuid,
  plan text,
  status text,
  started_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.user_subscriptions (user_id, plan, status)
  values (auth.uid(), 'free', 'active')
  on conflict on constraint user_subscriptions_pkey do nothing;

  return query
  select
    s.user_id,
    s.plan,
    s.status,
    s.started_at,
    s.expires_at
  from public.user_subscriptions s
  where s.user_id = auth.uid();
end;
$$;

drop function if exists public.admin_set_user_subscription(uuid, text, text, timestamptz, text);

create or replace function public.admin_set_user_subscription(
  target_user_id uuid,
  target_plan text,
  target_status text default 'active',
  target_expires_at timestamptz default null,
  target_notes text default null
)
returns table (
  user_id uuid,
  plan text,
  status text,
  expires_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access required';
  end if;

  if target_plan not in ('free', 'pro', 'premium') then
    raise exception 'Invalid plan';
  end if;

  if target_status not in ('active', 'trialing', 'past_due', 'canceled') then
    raise exception 'Invalid status';
  end if;

  insert into public.user_subscriptions (
    user_id,
    plan,
    status,
    expires_at,
    notes,
    updated_by
  )
  values (
    target_user_id,
    target_plan,
    target_status,
    target_expires_at,
    target_notes,
    auth.uid()
  )
  on conflict on constraint user_subscriptions_pkey do update set
    plan = excluded.plan,
    status = excluded.status,
    expires_at = excluded.expires_at,
    notes = excluded.notes,
    updated_by = excluded.updated_by;

  return query
  select
    s.user_id,
    s.plan,
    s.status,
    s.expires_at,
    s.updated_at
  from public.user_subscriptions s
  where s.user_id = target_user_id;
end;
$$;
