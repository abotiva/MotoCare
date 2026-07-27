-- Private GPX files and expiring monthly Premium access.
-- Run after premium_routes_monthly_migration.sql.

alter table public.premium_route_entitlements
  add column if not exists expires_at timestamptz;

update public.premium_route_entitlements entitlement
set expires_at = (
  (listing.premium_free_month + interval '1 month')::timestamp
  at time zone 'America/Bogota'
)
from public.marketplace_listings listing
where entitlement.listing_id = listing.id
  and entitlement.source = 'monthly-premium'
  and entitlement.expires_at is null;

create table if not exists public.marketplace_route_files (
  listing_id uuid primary key references public.marketplace_listings(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_at timestamptz not null default now()
);

alter table public.marketplace_route_files enable row level security;

drop policy if exists "route_files_read_authorized" on public.marketplace_route_files;
create policy "route_files_read_authorized"
on public.marketplace_route_files for select to authenticated
using (
  exists (
    select 1
    from public.marketplace_listings listing
    where listing.id = listing_id
      and (listing.seller_id = auth.uid() or public.is_current_user_admin())
  )
  or exists (
    select 1
    from public.premium_route_entitlements entitlement
    where entitlement.listing_id = marketplace_route_files.listing_id
      and entitlement.user_id = auth.uid()
      and (entitlement.expires_at is null or entitlement.expires_at > now())
  )
);

drop policy if exists "route_files_write_owner_or_admin" on public.marketplace_route_files;
create policy "route_files_write_owner_or_admin"
on public.marketplace_route_files for all to authenticated
using (
  exists (
    select 1 from public.marketplace_listings listing
    where listing.id = listing_id
      and (listing.seller_id = auth.uid() or public.is_current_user_admin())
  )
)
with check (
  exists (
    select 1 from public.marketplace_listings listing
    where listing.id = listing_id
      and (listing.seller_id = auth.uid() or public.is_current_user_admin())
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'premium-route-files',
  'premium-route-files',
  false,
  10485760,
  array['application/gpx+xml', 'application/xml', 'text/xml', 'application/octet-stream']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "premium_route_storage_insert" on storage.objects;
create policy "premium_route_storage_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'premium-route-files'
  and exists (
    select 1 from public.marketplace_listings listing
    where listing.id::text = (storage.foldername(name))[1]
      and (listing.seller_id = auth.uid() or public.is_current_user_admin())
      and listing.category in ('premium-routes', 'packs')
  )
);

drop policy if exists "premium_route_storage_select" on storage.objects;
create policy "premium_route_storage_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'premium-route-files'
  and (
    exists (
      select 1 from public.marketplace_listings listing
      where listing.id::text = (storage.foldername(name))[1]
        and (listing.seller_id = auth.uid() or public.is_current_user_admin())
    )
    or exists (
      select 1 from public.premium_route_entitlements entitlement
      where entitlement.listing_id::text = (storage.foldername(name))[1]
        and entitlement.user_id = auth.uid()
        and (entitlement.expires_at is null or entitlement.expires_at > now())
    )
  )
);

drop policy if exists "premium_route_storage_delete" on storage.objects;
create policy "premium_route_storage_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'premium-route-files'
  and exists (
    select 1 from public.marketplace_listings listing
    where listing.id::text = (storage.foldername(name))[1]
      and (listing.seller_id = auth.uid() or public.is_current_user_admin())
  )
);

create or replace function public.claim_premium_monthly_route(target_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_row public.marketplace_listings;
  current_month date := date_trunc('month', now() at time zone 'America/Bogota')::date;
  access_expires_at timestamptz;
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

  access_expires_at := (
    (current_month + interval '1 month')::timestamp
    at time zone 'America/Bogota'
  );

  insert into public.premium_route_entitlements(user_id, listing_id, source, expires_at)
  values (auth.uid(), target_listing_id, 'monthly-premium', access_expires_at)
  on conflict (user_id, listing_id) do update set
    source = case
      when premium_route_entitlements.source in ('purchase', 'admin')
        then premium_route_entitlements.source
      else excluded.source
    end,
    expires_at = case
      when premium_route_entitlements.source in ('purchase', 'admin')
        then premium_route_entitlements.expires_at
      else excluded.expires_at
    end;
end;
$$;

revoke all on function public.claim_premium_monthly_route(uuid) from public;
grant execute on function public.claim_premium_monthly_route(uuid) to authenticated;
