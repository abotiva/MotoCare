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
  is_monthly_free boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists premium_routes_active_created_idx
  on public.premium_routes (is_active, created_at desc);

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
  )
);

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

revoke all on function public.claim_monthly_premium_route(text) from public;
grant execute on function public.claim_monthly_premium_route(text) to authenticated;
