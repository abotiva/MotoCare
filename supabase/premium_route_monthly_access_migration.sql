-- Five complimentary Premium routes per calendar month (America/Bogota).
-- Access expires at the beginning of the following month.

create table if not exists public.premium_route_monthly_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  route_id text not null check (char_length(btrim(route_id)) between 3 and 120),
  period_start date not null,
  expires_at timestamptz not null,
  claimed_at timestamptz not null default now(),
  unique (user_id, route_id, period_start)
);

create index if not exists premium_route_claims_user_period_idx
  on public.premium_route_monthly_claims (user_id, period_start);

alter table public.premium_route_monthly_claims enable row level security;

drop policy if exists "premium_route_claims_read_own" on public.premium_route_monthly_claims;
create policy "premium_route_claims_read_own"
on public.premium_route_monthly_claims for select to authenticated
using (user_id = auth.uid());

create or replace function public.current_premium_route_quota()
returns table (used integer, monthly_limit integer, remaining integer, period_start date, expires_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  month_start date := date_trunc('month', timezone('America/Bogota', now()))::date;
  next_month timestamptz := (month_start + interval '1 month') at time zone 'America/Bogota';
  claim_count integer;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;

  select count(*)::integer into claim_count
  from public.premium_route_monthly_claims c
  where c.user_id = auth.uid() and c.period_start = month_start and c.expires_at > now();

  return query select claim_count, 5, greatest(5 - claim_count, 0), month_start, next_month;
end;
$$;

create or replace function public.claim_monthly_premium_route(target_route_id text)
returns table (route_id text, claimed_at timestamptz, expires_at timestamptz, remaining integer)
language plpgsql security definer set search_path = public
as $$
declare
  month_start date := date_trunc('month', timezone('America/Bogota', now()))::date;
  next_month timestamptz := (month_start + interval '1 month') at time zone 'America/Bogota';
  active_plan text;
  active_status text;
  plan_expiry timestamptz;
  current_count integer;
  saved_claim public.premium_route_monthly_claims%rowtype;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if nullif(btrim(target_route_id), '') is null then raise exception 'La ruta no es válida.'; end if;

  select s.plan, s.status, s.expires_at into active_plan, active_status, plan_expiry
  from public.user_subscriptions s where s.user_id = auth.uid();

  if coalesce(active_plan, 'free') not in ('pro', 'premium')
     or coalesce(active_status, 'active') not in ('active', 'trialing')
     or (plan_expiry is not null and plan_expiry <= now()) then
    raise exception 'Esta opción requiere una licencia Premium activa.';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text), hashtext(month_start::text));

  select * into saved_claim from public.premium_route_monthly_claims c
  where c.user_id = auth.uid() and c.route_id = btrim(target_route_id) and c.period_start = month_start;

  if found then
    select count(*)::integer into current_count from public.premium_route_monthly_claims c
    where c.user_id = auth.uid() and c.period_start = month_start and c.expires_at > now();
    return query select saved_claim.route_id, saved_claim.claimed_at, saved_claim.expires_at, greatest(5 - current_count, 0);
    return;
  end if;

  select count(*)::integer into current_count from public.premium_route_monthly_claims c
  where c.user_id = auth.uid() and c.period_start = month_start and c.expires_at > now();
  if current_count >= 5 then raise exception 'Ya utilizaste tus 5 rutas gratuitas de este mes.'; end if;

  insert into public.premium_route_monthly_claims (user_id, route_id, period_start, expires_at)
  values (auth.uid(), btrim(target_route_id), month_start, next_month)
  returning * into saved_claim;

  return query select saved_claim.route_id, saved_claim.claimed_at, saved_claim.expires_at, greatest(5 - current_count - 1, 0);
end;
$$;

revoke all on function public.current_premium_route_quota() from public;
revoke all on function public.claim_monthly_premium_route(text) from public;
grant execute on function public.current_premium_route_quota() to authenticated;
grant execute on function public.claim_monthly_premium_route(text) to authenticated;

-- Preserve historical listings while removing "Packs" as a category.
update public.marketplace_listings set category = 'premium-routes' where category = 'packs';
alter table public.marketplace_listings drop constraint if exists marketplace_listings_category_check;
alter table public.marketplace_listings add constraint marketplace_listings_category_check
check (category in ('motorcycles', 'parts', 'gear', 'services', 'premium-routes'));
