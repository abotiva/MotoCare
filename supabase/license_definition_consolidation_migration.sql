-- Consolidated MotoCare license definition for the Play Store preparation phase.
-- Run after manual_licenses_migration.sql, business_club_limits_migration.sql,
-- premium_document_uploads_migration.sql and the marketplace migrations.

update public.user_subscriptions set plan = 'premium' where plan = 'pro';

alter table public.user_subscriptions drop constraint if exists user_subscriptions_plan_check;
alter table public.user_subscriptions add constraint user_subscriptions_plan_check
check (plan in ('free', 'premium', 'business'));

create table if not exists public.motorcycle_replacement_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  deleted_motorcycle_id uuid not null,
  deleted_motorcycle_label text,
  deleted_at timestamptz not null default now(),
  replacement_motorcycle_id uuid,
  replaced_at timestamptz,
  unique (deleted_motorcycle_id)
);

create index if not exists motorcycle_replacement_owner_year_idx
on public.motorcycle_replacement_events(owner_id, deleted_at desc);

alter table public.motorcycle_replacement_events enable row level security;
drop policy if exists "motorcycle_replacement_events_read_own_or_admin" on public.motorcycle_replacement_events;
create policy "motorcycle_replacement_events_read_own_or_admin"
on public.motorcycle_replacement_events for select to authenticated
using (owner_id = auth.uid() or public.is_current_user_admin());

create or replace function public.audit_premium_motorcycle_deletion()
returns trigger language plpgsql security definer set search_path = public as $$
declare current_plan text;
begin
  select coalesce((select s.plan from public.user_subscriptions s
    where s.user_id = old.owner_id and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at >= now())), 'free') into current_plan;
  if current_plan = 'premium' then
    insert into public.motorcycle_replacement_events (
      owner_id, deleted_motorcycle_id, deleted_motorcycle_label
    ) values (
      old.owner_id, old.id, concat_ws(' ', old.brand, old.model, old.plate)
    ) on conflict (deleted_motorcycle_id) do nothing;
  end if;
  return old;
end;
$$;

drop trigger if exists audit_premium_motorcycle_deletion on public.motorcycles;
create trigger audit_premium_motorcycle_deletion
before delete on public.motorcycles
for each row execute function public.audit_premium_motorcycle_deletion();

create or replace function public.enforce_motorcycle_license_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  current_plan text;
  motorcycle_count integer;
  replacement_event_id uuid;
  bogota_year integer := extract(year from timezone('America/Bogota', now()));
begin
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 0));
  select coalesce((select s.plan from public.user_subscriptions s
    where s.user_id = new.owner_id and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at >= now())), 'free') into current_plan;

  if current_plan = 'business' then
    raise exception using errcode = 'P0001', message = 'La licencia Business no permite registrar motos.';
  end if;

  select count(*) into motorcycle_count from public.motorcycles where owner_id = new.owner_id;
  if current_plan = 'free' and motorcycle_count >= 1 then
    raise exception using errcode = 'P0001', message = 'Tu plan Free incluye una moto.';
  end if;
  if current_plan = 'premium' and motorcycle_count >= 3 then
    raise exception using errcode = 'P0001', message = 'Tu plan Premium incluye hasta tres motos.';
  end if;

  if current_plan = 'premium' then
    select e.id into replacement_event_id
    from public.motorcycle_replacement_events e
    where e.owner_id = new.owner_id and e.replaced_at is null
    order by e.deleted_at limit 1 for update;

    if replacement_event_id is not null then
      if exists (
        select 1 from public.motorcycle_replacement_events e
        where e.owner_id = new.owner_id and e.replaced_at is not null
          and extract(year from timezone('America/Bogota', e.replaced_at)) = bogota_year
      ) then
        raise exception using errcode = 'P0001', message = 'Ya utilizaste el cambio anual de moto de tu licencia Premium.';
      end if;
      update public.motorcycle_replacement_events
      set replacement_motorcycle_id = new.id, replaced_at = now()
      where id = replacement_event_id;
    end if;
  end if;
  return new;
end;
$$;

-- Business is a commercial account, not an accumulated rider tier.
-- Restrictive policies apply in addition to the existing ownership policies.
drop policy if exists "rider_only_motorcycles" on public.motorcycles;
create policy "rider_only_motorcycles" on public.motorcycles as restrictive for all to authenticated
using (public.is_current_user_admin() or public.marketplace_effective_plan(auth.uid()) <> 'business')
with check (public.is_current_user_admin() or public.marketplace_effective_plan(auth.uid()) <> 'business');
drop policy if exists "rider_only_maintenance" on public.maintenance_records;
create policy "rider_only_maintenance" on public.maintenance_records as restrictive for all to authenticated
using (public.is_current_user_admin() or public.marketplace_effective_plan(auth.uid()) <> 'business')
with check (public.is_current_user_admin() or public.marketplace_effective_plan(auth.uid()) <> 'business');
drop policy if exists "rider_only_reminders" on public.reminders;
create policy "rider_only_reminders" on public.reminders as restrictive for all to authenticated
using (public.is_current_user_admin() or public.marketplace_effective_plan(auth.uid()) <> 'business')
with check (public.is_current_user_admin() or public.marketplace_effective_plan(auth.uid()) <> 'business');
drop policy if exists "rider_only_documents" on public.motorcycle_documents;
create policy "rider_only_documents" on public.motorcycle_documents as restrictive for all to authenticated
using (public.is_current_user_admin() or public.marketplace_effective_plan(auth.uid()) <> 'business')
with check (public.is_current_user_admin() or public.marketplace_effective_plan(auth.uid()) <> 'business');
drop policy if exists "rider_only_clubs" on public.clubs;
create policy "rider_only_clubs" on public.clubs as restrictive for all to authenticated
using (public.is_current_user_admin() or public.marketplace_effective_plan(auth.uid()) <> 'business')
with check (public.is_current_user_admin() or public.marketplace_effective_plan(auth.uid()) <> 'business');
drop policy if exists "rider_only_club_members" on public.club_members;
create policy "rider_only_club_members" on public.club_members as restrictive for all to authenticated
using (public.is_current_user_admin() or public.marketplace_effective_plan(auth.uid()) <> 'business')
with check (public.is_current_user_admin() or public.marketplace_effective_plan(auth.uid()) <> 'business');
drop policy if exists "rider_only_club_invitations" on public.club_invitations;
create policy "rider_only_club_invitations" on public.club_invitations as restrictive for all to authenticated
using (public.is_current_user_admin() or public.marketplace_effective_plan(auth.uid()) <> 'business')
with check (public.is_current_user_admin() or public.marketplace_effective_plan(auth.uid()) <> 'business');
drop policy if exists "rider_only_club_posts" on public.club_posts;
create policy "rider_only_club_posts" on public.club_posts as restrictive for all to authenticated
using (public.is_current_user_admin() or public.marketplace_effective_plan(auth.uid()) <> 'business')
with check (public.is_current_user_admin() or public.marketplace_effective_plan(auth.uid()) <> 'business');

-- Business accounts cannot read or write community content.
drop policy if exists "posts_read_all" on public.posts;
drop policy if exists "posts_read_non_business" on public.posts;
create policy "posts_read_non_business" on public.posts for select to authenticated
using (public.marketplace_effective_plan(auth.uid()) <> 'business');
drop policy if exists "posts_own_write" on public.posts;
drop policy if exists "posts_own_write_non_business" on public.posts;
create policy "posts_own_write_non_business" on public.posts for all to authenticated
using (auth.uid() = author_id and public.marketplace_effective_plan(auth.uid()) <> 'business')
with check (auth.uid() = author_id and public.marketplace_effective_plan(auth.uid()) <> 'business');

drop policy if exists "comments_read_all" on public.post_comments;
drop policy if exists "comments_read_non_business" on public.post_comments;
create policy "comments_read_non_business" on public.post_comments for select to authenticated
using (public.marketplace_effective_plan(auth.uid()) <> 'business');
drop policy if exists "comments_own_write" on public.post_comments;
drop policy if exists "comments_own_write_non_business" on public.post_comments;
create policy "comments_own_write_non_business" on public.post_comments for all to authenticated
using (auth.uid() = author_id and public.marketplace_effective_plan(auth.uid()) <> 'business')
with check (auth.uid() = author_id and public.marketplace_effective_plan(auth.uid()) <> 'business');

drop policy if exists "likes_read_all" on public.post_likes;
drop policy if exists "likes_read_non_business" on public.post_likes;
create policy "likes_read_non_business" on public.post_likes for select to authenticated
using (public.marketplace_effective_plan(auth.uid()) <> 'business');
drop policy if exists "likes_own_write" on public.post_likes;
drop policy if exists "likes_own_write_non_business" on public.post_likes;
create policy "likes_own_write_non_business" on public.post_likes for all to authenticated
using (auth.uid() = user_id and public.marketplace_effective_plan(auth.uid()) <> 'business')
with check (auth.uid() = user_id and public.marketplace_effective_plan(auth.uid()) <> 'business');

drop policy if exists "post_images_read_all" on public.post_images;
drop policy if exists "post_images_read_non_business" on public.post_images;
create policy "post_images_read_non_business" on public.post_images for select to authenticated
using (public.marketplace_effective_plan(auth.uid()) <> 'business');
drop policy if exists "post_images_own_write" on public.post_images;
drop policy if exists "post_images_own_write_non_business" on public.post_images;
create policy "post_images_own_write_non_business" on public.post_images for all to authenticated
using (auth.uid() = owner_id and public.marketplace_effective_plan(auth.uid()) <> 'business')
with check (auth.uid() = owner_id and public.marketplace_effective_plan(auth.uid()) <> 'business');

-- Document uploads require an unexpired Premium subscription.
drop policy if exists "motorcycle_documents_premium_insert" on public.motorcycle_documents;
create policy "motorcycle_documents_premium_insert" on public.motorcycle_documents
for insert to authenticated with check (
  auth.uid() = owner_id and exists (
    select 1 from public.user_subscriptions s where s.user_id = auth.uid()
      and s.status in ('active', 'trialing') and s.plan = 'premium'
      and (s.expires_at is null or s.expires_at >= now())
  )
);
drop policy if exists "documents_premium_insert" on storage.objects;
create policy "documents_premium_insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'motocare-documents' and auth.uid()::text = (storage.foldername(name))[1]
  and exists (
    select 1 from public.user_subscriptions s where s.user_id = auth.uid()
      and s.status in ('active', 'trialing') and s.plan = 'premium'
      and (s.expires_at is null or s.expires_at >= now())
  )
);

-- During this phase only Business service-directory listings can be created.
create or replace function public.marketplace_can_publish(target_user_id uuid, target_seller_type text)
returns boolean language sql stable security definer set search_path = public as $$
  select target_seller_type = 'business'
    and public.marketplace_effective_plan(target_user_id) = 'business';
$$;

create or replace function public.validate_marketplace_service_directory()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_current_user_admin() then
    if public.marketplace_effective_plan(new.seller_id) <> 'business' then
      raise exception 'Publicar servicios requiere una licencia Business activa.';
    end if;
    if new.seller_type <> 'business' or new.category <> 'services' or new.condition <> 'service' then
      raise exception 'Durante esta etapa solo se permiten publicaciones de servicios Business.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists validate_marketplace_service_directory on public.marketplace_listings;
create trigger validate_marketplace_service_directory
before insert or update of seller_id, seller_type, category, condition on public.marketplace_listings
for each row execute function public.validate_marketplace_service_directory();
