-- Phase 1: direct, single-item sales by Premium users.
-- Services, digital products and Business storefronts remain reserved for later phases.

alter table public.marketplace_listings
add column if not exists quantity integer not null default 1;

alter table public.marketplace_listings
drop constraint if exists marketplace_listings_single_item_check;

alter table public.marketplace_listings
add constraint marketplace_listings_single_item_check check (quantity = 1);

create or replace function public.marketplace_can_publish(
  target_user_id uuid,
  target_seller_type text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_seller_type = 'personal'
    and public.marketplace_effective_plan(target_user_id) = 'premium';
$$;

create or replace function public.validate_marketplace_personal_sale_phase_one()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  effective_plan text;
begin
  if tg_op = 'UPDATE'
     and old.status = 'sold'
     and new.status not in ('sold', 'archived') then
    raise exception 'Una publicación vendida no puede reactivarse.';
  end if;

  if public.is_current_user_admin() then
    return new;
  end if;

  effective_plan := public.marketplace_effective_plan(new.seller_id);

  if effective_plan <> 'premium' then
    raise exception 'La venta directa de artículos requiere licencia Premium.';
  end if;

  if new.seller_type <> 'personal' then
    raise exception 'Esta etapa solo admite publicaciones de usuarios Premium.';
  end if;

  if new.category not in ('motorcycles', 'parts', 'gear') then
    raise exception 'Solo puedes publicar una moto, un repuesto o un accesorio.';
  end if;

  if new.condition not in ('new', 'used_like_new', 'used_good', 'used_fair') then
    raise exception 'Esta etapa solo admite artículos físicos.';
  end if;

  if new.quantity <> 1 then
    raise exception 'Cada publicación debe corresponder a una sola unidad.';
  end if;

  if new.price <= 0 then
    raise exception 'El precio de venta debe ser mayor que cero.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_marketplace_personal_sale_phase_one
on public.marketplace_listings;

create trigger validate_marketplace_personal_sale_phase_one
before insert or update of seller_id, seller_type, category, condition, quantity, price, status
on public.marketplace_listings
for each row execute function public.validate_marketplace_personal_sale_phase_one();

create or replace function public.marketplace_publication_quota()
returns table (
  plan text,
  used_publications integer,
  monthly_limit integer,
  remaining_publications integer,
  can_publish boolean,
  period_start date,
  period_end date
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  effective_plan text;
  publication_count integer;
  month_start timestamp;
  next_month timestamp;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  effective_plan := public.marketplace_effective_plan(auth.uid());
  month_start := date_trunc('month', now() at time zone 'America/Bogota');
  next_month := month_start + interval '1 month';

  select count(*)::integer into publication_count
  from public.marketplace_publication_slots s
  where s.seller_id = auth.uid()
    and s.released_at is null
    and (s.counted_at at time zone 'America/Bogota') >= month_start
    and (s.counted_at at time zone 'America/Bogota') < next_month;

  return query select
    effective_plan,
    publication_count,
    5,
    case
      when effective_plan = 'premium' then greatest(0, 5 - publication_count)
      else 0
    end,
    effective_plan = 'premium' and publication_count < 5,
    month_start::date,
    (next_month::date - 1);
end;
$$;

revoke all on function public.validate_marketplace_personal_sale_phase_one() from public;
revoke all on function public.marketplace_can_publish(uuid, text) from public;
grant execute on function public.marketplace_can_publish(uuid, text) to authenticated;
grant execute on function public.marketplace_publication_quota() to authenticated;
