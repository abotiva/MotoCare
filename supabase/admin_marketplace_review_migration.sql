-- Admin review queue for marketplace listings and moderation reports.
-- Run after moderation_migration.sql and marketplace_migration.sql.

do $$
begin
  alter table public.notifications drop constraint if exists notifications_type_check;
  alter table public.notifications
    add constraint notifications_type_check
    check (type in (
      'route_planned', 'route_overdue', 'club_invite', 'moderation_notice', 'admin_review'
    ));
end;
$$;

create or replace function public.notify_admins_of_review_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  notice_title text;
  notice_message text;
begin
  if tg_table_name = 'marketplace_listings' then
    if new.status <> 'pending_review'
       or (tg_op = 'UPDATE' and old.status = 'pending_review') then
      return new;
    end if;
    notice_title := 'Nueva publicación de tienda';
    notice_message := '"' || new.title || '" está pendiente de revisión.';
  else
    notice_title := 'Nuevo reporte para moderación';
    notice_message := 'Se recibió un reporte de ' || replace(new.target_type, '_', ' ') || '.';
  end if;

  insert into public.notifications (
    user_id, type, title, message, scheduled_for
  )
  select
    a.user_id, 'admin_review', notice_title, notice_message, now()
  from public.app_admins a;

  return new;
end;
$$;

drop trigger if exists notify_admins_marketplace_review on public.marketplace_listings;
create trigger notify_admins_marketplace_review
after insert or update of status on public.marketplace_listings
for each row execute function public.notify_admins_of_review_item();

drop trigger if exists notify_admins_moderation_report on public.moderation_reports;
create trigger notify_admins_moderation_report
after insert on public.moderation_reports
for each row execute function public.notify_admins_of_review_item();

create or replace function public.admin_review_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access required';
  end if;

  return jsonb_build_object(
    'marketplace_pending', (
      select count(*) from public.marketplace_listings where status = 'pending_review'
    ),
    'moderation_pending', (
      select count(*) from public.moderation_reports where status = 'pending'
    )
  );
end;
$$;

create or replace function public.admin_marketplace_listings()
returns table (
  id uuid,
  seller_id uuid,
  seller_name text,
  seller_type text,
  seller_plan text,
  category text,
  title text,
  description text,
  price numeric,
  currency text,
  condition text,
  mileage_km integer,
  city text,
  department text,
  status text,
  moderation_notes text,
  submitted_at timestamptz,
  images jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    l.id,
    l.seller_id,
    coalesce(p.full_name, p.username, 'Usuario MotoCare') as seller_name,
    l.seller_type,
    public.marketplace_effective_plan(l.seller_id) as seller_plan,
    l.category,
    l.title,
    l.description,
    l.price,
    l.currency,
    l.condition,
    l.mileage_km,
    l.city,
    l.department,
    l.status,
    l.moderation_notes,
    coalesce(l.updated_at, l.created_at) as submitted_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'image_url', i.image_url,
        'sort_order', i.sort_order
      ) order by i.sort_order)
      from public.marketplace_listing_images i
      where i.listing_id = l.id
    ), '[]'::jsonb) as images
  from public.marketplace_listings l
  left join public.profiles p on p.id = l.seller_id
  order by
    case l.status when 'pending_review' then 0 else 1 end,
    coalesce(l.updated_at, l.created_at) desc;
end;
$$;

create or replace function public.admin_review_marketplace_listing(
  target_listing_id uuid,
  decision text,
  review_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_row public.marketplace_listings;
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access required';
  end if;
  if decision not in ('approve', 'reject') then
    raise exception 'Invalid review decision';
  end if;
  if decision = 'reject' and nullif(trim(review_notes), '') is null then
    raise exception 'El motivo de rechazo es obligatorio';
  end if;

  select * into listing_row
  from public.marketplace_listings
  where id = target_listing_id
  for update;

  if not found then raise exception 'Publicación no encontrada'; end if;
  if listing_row.status <> 'pending_review' then
    raise exception 'La publicación ya no está pendiente';
  end if;

  update public.marketplace_listings
  set
    status = case when decision = 'approve' then 'active' else 'rejected' end,
    moderation_notes = nullif(trim(review_notes), ''),
    published_at = case when decision = 'approve' then now() else published_at end,
    updated_at = now()
  where id = target_listing_id;

  insert into public.notifications (
    user_id, type, title, message, scheduled_for
  ) values (
    listing_row.seller_id,
    'moderation_notice',
    case when decision = 'approve'
      then 'Publicación aprobada'
      else 'Publicación requiere cambios'
    end,
    case when decision = 'approve'
      then '"' || listing_row.title || '" ya está visible en la tienda.'
      else '"' || listing_row.title || '" fue rechazada. Motivo: ' || trim(review_notes)
    end,
    now()
  );
end;
$$;

grant execute on function public.admin_review_counts() to authenticated;
grant execute on function public.admin_marketplace_listings() to authenticated;
grant execute on function public.admin_review_marketplace_listing(uuid, text, text) to authenticated;
