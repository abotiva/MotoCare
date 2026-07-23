-- MotoCare marketplace
-- Premium (including legacy Pro) may submit up to 5 new listings per calendar
-- month in America/Bogota. Business has no monthly publication limit.

create extension if not exists pgcrypto;

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in (
    'motorcycles', 'parts', 'gear', 'services', 'premium-routes', 'packs'
  )),
  seller_type text not null default 'personal' check (seller_type in ('personal', 'business')),
  title text not null check (char_length(btrim(title)) between 5 and 120),
  description text not null check (char_length(btrim(description)) between 20 and 5000),
  price numeric(14, 2) not null check (price >= 0),
  original_price numeric(14, 2) check (original_price is null or original_price >= price),
  currency text not null default 'COP' check (currency = 'COP'),
  condition text not null check (condition in (
    'new', 'used_like_new', 'used_good', 'used_fair', 'service', 'digital'
  )),
  mileage_km integer check (mileage_km is null or mileage_km >= 0),
  city text,
  department text,
  status text not null default 'draft' check (status in (
    'draft', 'pending_review', 'active', 'paused', 'sold', 'rejected', 'archived'
  )),
  is_featured boolean not null default false,
  published_at timestamptz,
  sold_at timestamptz,
  moderation_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  storage_path text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (listing_id, sort_order)
);

create table if not exists public.marketplace_favorites (
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (listing_id, user_id)
);

-- This ledger survives listing deletion, so deleting and recreating cannot return
-- a consumed monthly slot. Moderation rejection explicitly releases the slot.
create table if not exists public.marketplace_publication_slots (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid unique references public.marketplace_listings(id) on delete set null,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  counted_at timestamptz not null default now(),
  released_at timestamptz,
  release_reason text check (release_reason is null or release_reason = 'rejected'),
  created_at timestamptz not null default now()
);

create index if not exists marketplace_listings_status_published_idx
  on public.marketplace_listings(status, published_at desc);
create index if not exists marketplace_listings_seller_idx
  on public.marketplace_listings(seller_id, created_at desc);
create index if not exists marketplace_listings_category_idx
  on public.marketplace_listings(category);
create index if not exists marketplace_publication_slots_seller_counted_idx
  on public.marketplace_publication_slots(seller_id, counted_at desc)
  where released_at is null;

alter table public.marketplace_listings enable row level security;
alter table public.marketplace_listing_images enable row level security;
alter table public.marketplace_favorites enable row level security;
alter table public.marketplace_publication_slots enable row level security;

create or replace function public.marketplace_effective_plan(target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when s.status not in ('active', 'trialing') then 'free'
    when s.expires_at is not null and s.expires_at < now() then 'free'
    when s.plan = 'pro' then 'premium'
    else coalesce(s.plan, 'free')
  end
  from (select target_user_id as user_id) u
  left join public.user_subscriptions s on s.user_id = u.user_id;
$$;

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
    else public.marketplace_effective_plan(target_user_id) in ('premium', 'business')
  end;
$$;

create or replace function public.validate_marketplace_listing_license()
returns trigger
language plpgsql
security definer
set search_path = public
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

  -- A slot is consumed only on the first submission. Edits, pauses,
  -- reactivations and sold/archived status changes do not consume another slot.
  if new.status in ('pending_review', 'active')
     and (tg_op = 'INSERT'
       or old.status not in ('pending_review', 'active', 'paused', 'sold', 'archived')) then
    effective_plan := public.marketplace_effective_plan(new.seller_id);

    if effective_plan = 'premium' and not public.is_current_user_admin() then
      -- Serialize quota checks so concurrent submissions cannot exceed five.
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
        raise exception 'Límite Premium alcanzado: 5 publicaciones nuevas por mes. Actualiza a Business para continuar.';
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

drop trigger if exists validate_marketplace_listing_license on public.marketplace_listings;
create trigger validate_marketplace_listing_license
before insert or update of seller_id, seller_type, status, title, description, price
on public.marketplace_listings
for each row execute function public.validate_marketplace_listing_license();

create or replace function public.record_marketplace_publication_slot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('pending_review', 'active')
     and (tg_op = 'INSERT'
       or old.status not in ('pending_review', 'active', 'paused', 'sold', 'archived')) then
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

drop trigger if exists record_marketplace_publication_slot on public.marketplace_listings;
create trigger record_marketplace_publication_slot
after insert or update of status on public.marketplace_listings
for each row execute function public.record_marketplace_publication_slot();

drop policy if exists "marketplace_listings_read_visible" on public.marketplace_listings;
create policy "marketplace_listings_read_visible" on public.marketplace_listings
for select to authenticated using (
  status = 'active' or seller_id = auth.uid() or public.is_current_user_admin()
);

drop policy if exists "marketplace_listings_insert_licensed" on public.marketplace_listings;
create policy "marketplace_listings_insert_licensed" on public.marketplace_listings
for insert to authenticated with check (
  (
    seller_id = auth.uid()
    and public.marketplace_can_publish(auth.uid(), seller_type)
    and status in ('draft', 'pending_review')
    and is_featured = false
  )
  or public.is_current_user_admin()
);

drop policy if exists "marketplace_listings_update_owner_or_admin" on public.marketplace_listings;
create policy "marketplace_listings_update_owner_or_admin" on public.marketplace_listings
for update to authenticated using (
  seller_id = auth.uid() or public.is_current_user_admin()
) with check (
  (seller_id = auth.uid() and public.marketplace_can_publish(auth.uid(), seller_type))
  or public.is_current_user_admin()
);

drop policy if exists "marketplace_listings_delete_owner_or_admin" on public.marketplace_listings;
create policy "marketplace_listings_delete_owner_or_admin" on public.marketplace_listings
for delete to authenticated using (
  seller_id = auth.uid() or public.is_current_user_admin()
);

drop policy if exists "marketplace_images_read_visible" on public.marketplace_listing_images;
create policy "marketplace_images_read_visible" on public.marketplace_listing_images
for select to authenticated using (
  exists (
    select 1 from public.marketplace_listings l
    where l.id = listing_id
      and (l.status = 'active' or l.seller_id = auth.uid() or public.is_current_user_admin())
  )
);

drop policy if exists "marketplace_images_owner_write" on public.marketplace_listing_images;
create policy "marketplace_images_owner_write" on public.marketplace_listing_images
for all to authenticated using (
  owner_id = auth.uid() or public.is_current_user_admin()
) with check (
  (
    owner_id = auth.uid()
    and exists (
      select 1 from public.marketplace_listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  )
  or public.is_current_user_admin()
);

drop policy if exists "marketplace_favorites_read_own" on public.marketplace_favorites;
create policy "marketplace_favorites_read_own" on public.marketplace_favorites
for select to authenticated using (user_id = auth.uid());

drop policy if exists "marketplace_favorites_write_own" on public.marketplace_favorites;
create policy "marketplace_favorites_write_own" on public.marketplace_favorites
for all to authenticated using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.marketplace_listings l
    where l.id = listing_id and l.status = 'active'
  )
);

drop policy if exists "marketplace_publication_slots_read_owner_or_admin"
  on public.marketplace_publication_slots;
create policy "marketplace_publication_slots_read_owner_or_admin"
on public.marketplace_publication_slots
for select to authenticated using (
  seller_id = auth.uid() or public.is_current_user_admin()
);

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
set search_path = public
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

revoke all on function public.marketplace_effective_plan(uuid) from public;
grant execute on function public.marketplace_effective_plan(uuid) to authenticated;
grant execute on function public.marketplace_can_publish(uuid, text) to authenticated;
grant execute on function public.marketplace_publication_quota() to authenticated;

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'marketplace-images',
  'marketplace-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "marketplace_images_storage_public_read" on storage.objects;
create policy "marketplace_images_storage_public_read" on storage.objects
for select using (bucket_id = 'marketplace-images');

drop policy if exists "marketplace_images_storage_owner_insert" on storage.objects;
create policy "marketplace_images_storage_owner_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'marketplace-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.marketplace_effective_plan(auth.uid()) in ('premium', 'business')
);

drop policy if exists "marketplace_images_storage_owner_update" on storage.objects;
create policy "marketplace_images_storage_owner_update" on storage.objects
for update to authenticated using (
  bucket_id = 'marketplace-images'
  and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'marketplace-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "marketplace_images_storage_owner_delete" on storage.objects;
create policy "marketplace_images_storage_owner_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'marketplace-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_current_user_admin()
  )
);
