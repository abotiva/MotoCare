-- Consume Premium monthly quota only when a listing is approved and becomes active.

create or replace function public.validate_marketplace_listing_license()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  effective_plan text;
  publication_count integer;
  month_start timestamp;
  next_month timestamp;
begin
  if not public.is_current_user_admin()
     and not public.marketplace_can_publish(new.seller_id, new.seller_type) then
    if new.seller_type = 'business' then
      raise exception 'Una publicación comercial requiere licencia Business';
    end if;
    raise exception 'Publicar requiere licencia Premium o Business';
  end if;

  -- The slot is checked only at approval (the first transition to active).
  -- Drafts and pending-review listings never consume quota.
  if new.status = 'active'
     and (tg_op = 'INSERT'
       or old.status not in ('active', 'paused', 'sold', 'archived')) then
    effective_plan := public.marketplace_effective_plan(new.seller_id);

    -- The quota belongs to the seller, so it also applies when an administrator
    -- performs the approval transition on the seller's behalf.
    if effective_plan = 'premium' then
      perform pg_advisory_xact_lock(hashtextextended(new.seller_id::text, 0));
      month_start := date_trunc('month', now() at time zone 'America/Bogota');
      next_month := month_start + interval '1 month';

      select count(*)::integer into publication_count
      from public.marketplace_publication_slots s
      where s.seller_id = new.seller_id
        and s.released_at is null
        and (s.counted_at at time zone 'America/Bogota') >= month_start
        and (s.counted_at at time zone 'America/Bogota') < next_month;

      if publication_count >= 5 then
        raise exception 'Límite Premium alcanzado: 5 publicaciones aprobadas por mes.';
      end if;
    end if;
  end if;

  if new.status = 'active' and new.published_at is null then
    new.published_at = now();
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.record_marketplace_publication_slot()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'active'
     and (tg_op = 'INSERT'
       or old.status not in ('active', 'paused', 'sold', 'archived')) then
    insert into public.marketplace_publication_slots (
      listing_id, seller_id, counted_at, released_at, release_reason
    )
    values (new.id, new.seller_id, now(), null, null)
    on conflict (listing_id) do update set
      seller_id = excluded.seller_id,
      counted_at = excluded.counted_at,
      released_at = null,
      release_reason = null;
  elsif new.status = 'rejected'
        and (tg_op = 'INSERT' or old.status <> 'rejected') then
    update public.marketplace_publication_slots
    set released_at = now(), release_reason = 'rejected'
    where listing_id = new.id and released_at is null;
  end if;

  return new;
end;
$$;

-- Repair slots created by the previous rule for listings that have not been approved.
delete from public.marketplace_publication_slots s
using public.marketplace_listings l
where s.listing_id = l.id
  and l.status in ('draft', 'pending_review');
