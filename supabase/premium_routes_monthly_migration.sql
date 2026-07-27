-- Monthly Premium route benefit.
-- Run after marketplace_migration.sql and subscriptions_migration.sql.

alter table public.marketplace_listings
  add column if not exists is_premium_monthly_free boolean not null default false,
  add column if not exists premium_free_month date;

alter table public.marketplace_listings
  drop constraint if exists marketplace_premium_free_route_check;
alter table public.marketplace_listings
  add constraint marketplace_premium_free_route_check check (
    not is_premium_monthly_free
    or (
      category in ('premium-routes', 'packs')
      and price = 0
      and premium_free_month is not null
      and premium_free_month = date_trunc('month', premium_free_month)::date
    )
  );

create table if not exists public.premium_route_free_slots (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references public.marketplace_listings(id) on delete restrict,
  free_month date not null,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  check (free_month = date_trunc('month', free_month)::date)
);

create unique index if not exists premium_route_free_slots_month_listing_idx
  on public.premium_route_free_slots(free_month, listing_id);

create table if not exists public.premium_route_entitlements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.marketplace_listings(id) on delete restrict,
  source text not null default 'monthly-premium' check (source in ('monthly-premium', 'purchase', 'admin')),
  granted_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.premium_route_free_slots enable row level security;
alter table public.premium_route_entitlements enable row level security;

drop policy if exists "premium_route_entitlements_read_own" on public.premium_route_entitlements;
create policy "premium_route_entitlements_read_own"
on public.premium_route_entitlements for select to authenticated
using (user_id = auth.uid() or public.is_current_user_admin());

create or replace function public.validate_premium_monthly_free_route()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  free_count integer;
begin
  if new.is_premium_monthly_free then
    if new.category not in ('premium-routes', 'packs') then
      raise exception 'Solo las rutas Premium y los packs pueden ser gratuitos para Premium';
    end if;

    new.price := 0;
    if new.status in ('pending_review', 'active')
       and (tg_op = 'INSERT' or old.status not in ('pending_review', 'active', 'paused', 'sold', 'archived')) then
      new.premium_free_month := date_trunc('month', now() at time zone 'America/Bogota')::date;
    else
      new.premium_free_month := coalesce(
        new.premium_free_month,
        date_trunc('month', now() at time zone 'America/Bogota')::date
      );
    end if;
    new.premium_free_month := date_trunc('month', new.premium_free_month)::date;

    if new.status in ('pending_review', 'active')
       and (
         tg_op = 'INSERT'
         or old.status not in ('pending_review', 'active', 'paused', 'sold', 'archived')
         or not old.is_premium_monthly_free
         or old.premium_free_month is distinct from new.premium_free_month
       ) then
      perform pg_advisory_xact_lock(hashtextextended('premium-free:' || new.premium_free_month::text, 0));

      select count(*)::integer into free_count
      from public.premium_route_free_slots slot
      where slot.free_month = new.premium_free_month
        and slot.released_at is null
        and slot.listing_id <> new.id;

      if free_count >= 5 then
        raise exception 'Límite alcanzado: ya hay 5 rutas gratuitas para Premium en este mes';
      end if;
    end if;
  else
    new.premium_free_month := null;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_premium_monthly_free_route on public.marketplace_listings;
create trigger validate_premium_monthly_free_route
before insert or update of category, price, status, is_premium_monthly_free, premium_free_month
on public.marketplace_listings
for each row execute function public.validate_premium_monthly_free_route();

create or replace function public.record_premium_monthly_free_route()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_premium_monthly_free and new.status in ('pending_review', 'active') then
    insert into public.premium_route_free_slots(listing_id, free_month, released_at)
    values (new.id, new.premium_free_month, null)
    on conflict (listing_id) do update set
      free_month = excluded.free_month,
      released_at = null;
  elsif new.status = 'rejected'
        or (
          tg_op = 'UPDATE'
          and old.is_premium_monthly_free
          and not new.is_premium_monthly_free
        ) then
    update public.premium_route_free_slots
    set released_at = now()
    where listing_id = new.id and released_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists record_premium_monthly_free_route on public.marketplace_listings;
create trigger record_premium_monthly_free_route
after insert or update of status, is_premium_monthly_free, premium_free_month
on public.marketplace_listings
for each row execute function public.record_premium_monthly_free_route();

create or replace function public.claim_premium_monthly_route(target_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_row public.marketplace_listings;
  current_month date := date_trunc('month', now() at time zone 'America/Bogota')::date;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  if public.marketplace_effective_plan(auth.uid()) not in ('premium', 'business') then
    raise exception 'Esta ruta gratuita requiere una licencia Premium activa';
  end if;

  select * into listing_row
  from public.marketplace_listings
  where id = target_listing_id and status = 'active';

  if listing_row.id is null
     or not listing_row.is_premium_monthly_free
     or listing_row.premium_free_month <> current_month then
    raise exception 'Esta ruta no pertenece a la selección gratuita del mes actual';
  end if;

  insert into public.premium_route_entitlements(user_id, listing_id, source)
  values (auth.uid(), target_listing_id, 'monthly-premium')
  on conflict (user_id, listing_id) do nothing;
end;
$$;

revoke all on function public.claim_premium_monthly_route(uuid) from public;
grant execute on function public.claim_premium_monthly_route(uuid) to authenticated;
