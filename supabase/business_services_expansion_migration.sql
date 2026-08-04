-- Business service categories, visibility states and public business contact data.

alter table public.marketplace_listings add column if not exists service_category text;
alter table public.marketplace_listings add column if not exists service_status text not null default 'active';
alter table public.marketplace_listings drop constraint if exists marketplace_service_category_check;
alter table public.marketplace_listings add constraint marketplace_service_category_check check (
  service_category is null or service_category in ('tow', 'mechanic', 'tire_shop', 'car_wash', 'route_guide')
);
alter table public.marketplace_listings drop constraint if exists marketplace_service_status_check;
alter table public.marketplace_listings add constraint marketplace_service_status_check check (
  service_status in ('active', 'inactive', 'promotion')
);
update public.marketplace_listings set service_category = 'mechanic'
where category = 'services' and service_category is null;

alter table public.profiles add column if not exists business_phone text;
alter table public.profiles add column if not exists business_address text;
alter table public.profiles add column if not exists business_latitude numeric;
alter table public.profiles add column if not exists business_longitude numeric;
alter table public.profiles drop constraint if exists profiles_business_latitude_check;
alter table public.profiles add constraint profiles_business_latitude_check check (
  business_latitude is null or business_latitude between -90 and 90
);
alter table public.profiles drop constraint if exists profiles_business_longitude_check;
alter table public.profiles add constraint profiles_business_longitude_check check (
  business_longitude is null or business_longitude between -180 and 180
);

drop policy if exists "profiles_select_business" on public.profiles;
create policy "profiles_select_business" on public.profiles for select to authenticated using (
  exists (
    select 1 from public.user_subscriptions s
    where s.user_id = profiles.id and s.plan = 'business'
      and s.status in ('active', 'trialing') and (s.expires_at is null or s.expires_at >= now())
  )
);

create index if not exists marketplace_service_filters_idx
on public.marketplace_listings(service_category, department_code, municipality_code, service_status);

drop policy if exists "marketplace_listings_read_visible" on public.marketplace_listings;
create policy "marketplace_listings_read_visible" on public.marketplace_listings
for select to authenticated using (
  (status = 'active' and service_status in ('active', 'promotion'))
  or seller_id = auth.uid()
  or public.is_current_user_admin()
);

drop policy if exists "marketplace_images_read_visible" on public.marketplace_listing_images;
create policy "marketplace_images_read_visible" on public.marketplace_listing_images
for select to authenticated using (
  exists (
    select 1 from public.marketplace_listings l
    where l.id = listing_id and (
      (l.status = 'active' and l.service_status in ('active', 'promotion'))
      or l.seller_id = auth.uid()
      or public.is_current_user_admin()
    )
  )
);
