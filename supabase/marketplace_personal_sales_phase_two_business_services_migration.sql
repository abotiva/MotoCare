-- Correction to marketplace phase 1:
-- Premium users sell single physical items (5 per month).
-- Business accounts may publish products and services without a monthly limit.

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
  select case
    when target_seller_type = 'business'
      then public.marketplace_effective_plan(target_user_id) = 'business'
    else public.marketplace_effective_plan(target_user_id) = 'premium'
  end;
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

  if effective_plan = 'premium' then
    if new.seller_type <> 'personal' then
      raise exception 'Una cuenta Premium debe publicar como usuario.';
    end if;
    if new.category not in ('motorcycles', 'parts', 'gear') then
      raise exception 'Premium solo puede publicar una moto, un repuesto o un accesorio.';
    end if;
    if new.condition not in ('new', 'used_like_new', 'used_good', 'used_fair') then
      raise exception 'Premium solo puede publicar artículos físicos.';
    end if;
    if new.quantity <> 1 then
      raise exception 'Cada publicación Premium debe corresponder a una sola unidad.';
    end if;
  elsif effective_plan = 'business' then
    if new.seller_type <> 'business' then
      raise exception 'Una cuenta Business debe publicar como negocio.';
    end if;
    if new.category not in ('motorcycles', 'parts', 'gear', 'services') then
      raise exception 'Business puede publicar productos o servicios.';
    end if;
    if new.category = 'services' and new.condition <> 'service' then
      raise exception 'Una publicación de servicio debe usar el estado Servicio.';
    end if;
    if new.category <> 'services'
       and new.condition not in ('new', 'used_like_new', 'used_good', 'used_fair') then
      raise exception 'Selecciona un estado válido para el producto.';
    end if;
  else
    raise exception 'Publicar requiere licencia Premium o Business.';
  end if;

  if new.price <= 0 then
    raise exception 'El precio debe ser mayor que cero.';
  end if;

  return new;
end;
$$;

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
    case when effective_plan = 'business' then null else 5 end,
    case
      when effective_plan = 'business' then null
      else greatest(0, 5 - publication_count)
    end,
    effective_plan = 'business'
      or (effective_plan = 'premium' and publication_count < 5),
    month_start::date,
    (next_month::date - 1);
end;
$$;

revoke all on function public.marketplace_can_publish(uuid, text) from public;
grant execute on function public.marketplace_can_publish(uuid, text) to authenticated;
grant execute on function public.marketplace_publication_quota() to authenticated;
