-- Administrator-managed Premium route catalogue and private GPX files.

create table if not exists public.premium_routes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  title text not null check (char_length(btrim(title)) between 5 and 120),
  description text not null check (char_length(btrim(description)) between 20 and 5000),
  location text,
  level smallint not null check (level between 3 and 5),
  distance_km numeric(8,2) not null check (distance_km > 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  elevation_gain_m integer check (elevation_gain_m is null or elevation_gain_m >= 0),
  terrain text,
  motorcycle_compatibility text not null,
  gpx_storage_path text not null unique,
  track_geojson jsonb,
  lifetime_price_cop numeric(12,2) not null default 24900 check (lifetime_price_cop >= 0),
  is_monthly_free boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.premium_routes
  add column if not exists track_geojson jsonb,
  add column if not exists lifetime_price_cop numeric(12,2) not null default 24900;

create index if not exists premium_routes_active_created_idx
  on public.premium_routes (is_active, created_at desc);

alter table public.routes
  add column if not exists premium_route_id uuid references public.premium_routes(id) on delete set null,
  add column if not exists route_source text not null default 'personal'
    check (route_source in ('personal', 'premium')),
  add column if not exists premium_access_expires_at timestamptz;

create unique index if not exists routes_owner_premium_route_unique_idx
  on public.routes (owner_id, premium_route_id)
  where premium_route_id is not null;

create table if not exists public.premium_route_purchase_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  premium_route_id uuid not null references public.premium_routes(id) on delete cascade,
  quoted_price_cop numeric(12,2) not null check (quoted_price_cop >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index if not exists premium_route_purchase_requests_pending_unique_idx
  on public.premium_route_purchase_requests (user_id, premium_route_id)
  where status = 'pending';

create table if not exists public.premium_route_lifetime_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  premium_route_id uuid not null references public.premium_routes(id) on delete cascade,
  purchase_request_id uuid references public.premium_route_purchase_requests(id) on delete set null,
  amount_cop numeric(12,2) not null check (amount_cop >= 0),
  purchased_at timestamptz not null default now(),
  unique (user_id, premium_route_id)
);

alter table public.premium_route_purchase_requests enable row level security;
alter table public.premium_route_lifetime_purchases enable row level security;

drop policy if exists "premium_route_purchase_requests_read_own" on public.premium_route_purchase_requests;
create policy "premium_route_purchase_requests_read_own"
on public.premium_route_purchase_requests for select to authenticated
using (user_id = auth.uid() or public.is_current_user_admin());

drop policy if exists "premium_route_lifetime_purchases_read_own" on public.premium_route_lifetime_purchases;
create policy "premium_route_lifetime_purchases_read_own"
on public.premium_route_lifetime_purchases for select to authenticated
using (user_id = auth.uid() or public.is_current_user_admin());

alter table public.premium_routes enable row level security;

drop policy if exists "premium_routes_read_active" on public.premium_routes;
create policy "premium_routes_read_active"
on public.premium_routes for select to authenticated
using (is_active or public.is_current_user_admin());

drop policy if exists "premium_routes_admin_insert" on public.premium_routes;
create policy "premium_routes_admin_insert"
on public.premium_routes for insert to authenticated
with check (created_by = auth.uid() and public.is_current_user_admin());

drop policy if exists "premium_routes_admin_update" on public.premium_routes;
create policy "premium_routes_admin_update"
on public.premium_routes for update to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

drop policy if exists "premium_routes_admin_delete" on public.premium_routes;
create policy "premium_routes_admin_delete"
on public.premium_routes for delete to authenticated
using (public.is_current_user_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'premium-route-files',
  'premium-route-files',
  false,
  10485760,
  array['application/gpx+xml', 'application/xml', 'text/xml', 'application/octet-stream']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "premium_route_files_admin_insert" on storage.objects;
create policy "premium_route_files_admin_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'premium-route-files'
  and public.is_current_user_admin()
);

drop policy if exists "premium_route_files_admin_update" on storage.objects;
create policy "premium_route_files_admin_update"
on storage.objects for update to authenticated
using (bucket_id = 'premium-route-files' and public.is_current_user_admin())
with check (bucket_id = 'premium-route-files' and public.is_current_user_admin());

drop policy if exists "premium_route_files_admin_delete" on storage.objects;
create policy "premium_route_files_admin_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'premium-route-files' and public.is_current_user_admin());

drop policy if exists "premium_route_files_read_entitled" on storage.objects;
create policy "premium_route_files_read_entitled"
on storage.objects for select to authenticated
using (
  bucket_id = 'premium-route-files'
  and (
    public.is_current_user_admin()
    or exists (
      select 1
      from public.premium_routes r
      join public.premium_route_monthly_claims c
        on c.route_id = r.id::text
       and c.user_id = auth.uid()
       and c.expires_at > now()
      where r.gpx_storage_path = storage.objects.name
        and r.is_active
    )
    or exists (
      select 1
      from public.premium_routes r
      join public.premium_route_lifetime_purchases p
        on p.premium_route_id = r.id
       and p.user_id = auth.uid()
      where r.gpx_storage_path = storage.objects.name
        and r.is_active
    )
  )
);

create or replace function public.request_premium_route_lifetime_purchase(target_route_id uuid)
returns table (request_id uuid, quoted_price_cop numeric, request_status text)
language plpgsql security definer set search_path = public
as $$
declare
  target_route public.premium_routes%rowtype;
  saved_request public.premium_route_purchase_requests%rowtype;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;

  select * into target_route
  from public.premium_routes
  where id = target_route_id and is_active;
  if not found then raise exception 'La ruta Premium no está disponible.'; end if;

  if exists (
    select 1 from public.premium_route_lifetime_purchases p
    where p.user_id = auth.uid() and p.premium_route_id = target_route_id
  ) then
    raise exception 'Ya compraste esta ruta definitivamente.';
  end if;

  select * into saved_request
  from public.premium_route_purchase_requests r
  where r.user_id = auth.uid()
    and r.premium_route_id = target_route_id
    and r.status = 'pending';

  if not found then
    insert into public.premium_route_purchase_requests (
      user_id, premium_route_id, quoted_price_cop
    ) values (
      auth.uid(), target_route_id, target_route.lifetime_price_cop
    )
    returning * into saved_request;
  end if;

  return query select saved_request.id, saved_request.quoted_price_cop, saved_request.status;
end;
$$;

revoke all on function public.request_premium_route_lifetime_purchase(uuid) from public;
grant execute on function public.request_premium_route_lifetime_purchase(uuid) to authenticated;

create or replace function public.admin_resolve_premium_route_purchase(
  target_request_id uuid,
  approve_purchase boolean
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  target_request public.premium_route_purchase_requests%rowtype;
begin
  if not public.is_current_user_admin() then raise exception 'Admin access required'; end if;

  select * into target_request
  from public.premium_route_purchase_requests
  where id = target_request_id and status = 'pending'
  for update;
  if not found then raise exception 'La solicitud no está pendiente.'; end if;

  update public.premium_route_purchase_requests
  set
    status = case when approve_purchase then 'approved' else 'rejected' end,
    resolved_at = now()
  where id = target_request_id;

  if approve_purchase then
    insert into public.premium_route_lifetime_purchases (
      user_id, premium_route_id, purchase_request_id, amount_cop
    ) values (
      target_request.user_id,
      target_request.premium_route_id,
      target_request.id,
      target_request.quoted_price_cop
    )
    on conflict (user_id, premium_route_id) do nothing;

    update public.routes owned_route
    set
      track_geojson = premium.track_geojson,
      premium_access_expires_at = null
    from public.premium_routes premium
    where owned_route.owner_id = target_request.user_id
      and owned_route.premium_route_id = target_request.premium_route_id
      and premium.id = target_request.premium_route_id;
  end if;
end;
$$;

revoke all on function public.admin_resolve_premium_route_purchase(uuid, boolean) from public;
grant execute on function public.admin_resolve_premium_route_purchase(uuid, boolean) to authenticated;

create or replace function public.sync_claimed_premium_routes()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  synced_count integer;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;

  insert into public.routes (
    owner_id,
    title,
    origin,
    destination,
    distance_km,
    duration_minutes,
    visibility,
    status,
    track_geojson,
    premium_route_id,
    route_source,
    premium_access_expires_at
  )
  select
    auth.uid(),
    r.title,
    nullif(btrim(split_part(coalesce(r.location, ''), ' - ', 1)), ''),
    nullif(btrim(regexp_replace(coalesce(r.location, ''), '^.*\s+-\s+', '')), ''),
    r.distance_km,
    r.duration_minutes,
    'private',
    'planned',
    r.track_geojson,
    r.id,
    'premium',
    access.expires_at
  from (
    select c.route_id, c.expires_at
    from public.premium_route_monthly_claims c
    where c.user_id = auth.uid() and c.expires_at > now()
    union
    select p.premium_route_id::text, null::timestamptz
    from public.premium_route_lifetime_purchases p
    where p.user_id = auth.uid()
  ) access
  join public.premium_routes r on r.id::text = access.route_id
  where r.is_active
  on conflict (owner_id, premium_route_id) where premium_route_id is not null
  do update set
    title = excluded.title,
    origin = excluded.origin,
    destination = excluded.destination,
    distance_km = excluded.distance_km,
    duration_minutes = excluded.duration_minutes,
    track_geojson = excluded.track_geojson,
    route_source = 'premium',
    premium_access_expires_at = excluded.premium_access_expires_at;

  get diagnostics synced_count = row_count;
  return synced_count;
end;
$$;

revoke all on function public.sync_claimed_premium_routes() from public;
grant execute on function public.sync_claimed_premium_routes() to authenticated;

create or replace function public.reconcile_premium_route_access()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  locked_count integer;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;

  update public.routes r
  set track_geojson = null
  where r.owner_id = auth.uid()
    and r.route_source = 'premium'
    and r.premium_access_expires_at <= now()
    and not exists (
      select 1
      from public.premium_route_lifetime_purchases p
      where p.user_id = auth.uid()
        and p.premium_route_id = r.premium_route_id
    );

  get diagnostics locked_count = row_count;
  return locked_count;
end;
$$;

revoke all on function public.reconcile_premium_route_access() from public;
grant execute on function public.reconcile_premium_route_access() to authenticated;

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

  if target_route_id ~ '^[0-9a-fA-F-]{36}$' and not exists (
    select 1 from public.premium_routes r
    where r.id::text = target_route_id and r.is_active and r.is_monthly_free
  ) then
    raise exception 'Esta ruta no está incluida gratis para Premium este mes.';
  end if;

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
    perform public.sync_claimed_premium_routes();
    return query select saved_claim.route_id, saved_claim.claimed_at, saved_claim.expires_at, greatest(5 - current_count, 0);
    return;
  end if;

  select count(*)::integer into current_count from public.premium_route_monthly_claims c
  where c.user_id = auth.uid() and c.period_start = month_start and c.expires_at > now();
  if current_count >= 5 then raise exception 'Ya utilizaste tus 5 rutas gratuitas de este mes.'; end if;

  insert into public.premium_route_monthly_claims (user_id, route_id, period_start, expires_at)
  values (auth.uid(), btrim(target_route_id), month_start, next_month)
  returning * into saved_claim;

  perform public.sync_claimed_premium_routes();
  return query select saved_claim.route_id, saved_claim.claimed_at, saved_claim.expires_at, greatest(5 - current_count - 1, 0);
end;
$$;

revoke all on function public.claim_monthly_premium_route(text) from public;
grant execute on function public.claim_monthly_premium_route(text) to authenticated;
