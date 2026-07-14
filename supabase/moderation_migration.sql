-- Moderacion MotoCare: reportes, sanciones y avisos internos.
-- Ejecutar en Supabase SQL Editor despues de schema.sql.

alter table public.profiles
add column if not exists moderation_status text not null default 'active'
  check (moderation_status in ('active', 'suspended', 'deleted')),
add column if not exists moderation_until timestamptz,
add column if not exists moderation_reason text;

alter table public.clubs
add column if not exists moderation_status text not null default 'active'
  check (moderation_status in ('active', 'suspended', 'deleted')),
add column if not exists moderation_until timestamptz,
add column if not exists moderation_reason text;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'notifications'
      and constraint_name = 'notifications_type_check'
  ) then
    alter table public.notifications drop constraint notifications_type_check;
  end if;

  alter table public.notifications
  add constraint notifications_type_check
  check (type in ('route_planned', 'route_overdue', 'club_invite', 'moderation_notice'));
end;
$$;

create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('user', 'club', 'post', 'club_post')),
  target_user_id uuid references public.profiles(id) on delete set null,
  target_club_id uuid references public.clubs(id) on delete set null,
  target_post_id uuid references public.posts(id) on delete set null,
  target_club_post_id uuid references public.club_posts(id) on delete set null,
  reason_category text not null check (reason_category in ('violence', 'harassment', 'spam', 'promotion_without_business', 'other')),
  details text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.moderation_reports(id) on delete set null,
  target_type text not null check (target_type in ('user', 'club')),
  target_user_id uuid references public.profiles(id) on delete set null,
  target_club_id uuid references public.clubs(id) on delete set null,
  action_type text not null check (action_type in ('warning', 'temp_block', 'delete')),
  reason text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists moderation_reports_status_idx on public.moderation_reports(status, created_at desc);
create index if not exists moderation_reports_target_user_idx on public.moderation_reports(target_user_id);
create index if not exists moderation_reports_target_club_idx on public.moderation_reports(target_club_id);
create index if not exists moderation_actions_target_user_idx on public.moderation_actions(target_user_id, created_at desc);
create index if not exists moderation_actions_target_club_idx on public.moderation_actions(target_club_id, created_at desc);

create or replace function public.is_profile_moderation_active(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
      and (
        p.moderation_status = 'active'
        or (p.moderation_status = 'suspended' and p.moderation_until is not null and p.moderation_until < now())
      )
  );
$$;

create or replace function public.is_club_moderation_active(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clubs c
    where c.id = target_club_id
      and (
        c.moderation_status = 'active'
        or (c.moderation_status = 'suspended' and c.moderation_until is not null and c.moderation_until < now())
      )
  );
$$;

drop trigger if exists moderation_reports_set_updated_at on public.moderation_reports;
create trigger moderation_reports_set_updated_at
before update on public.moderation_reports
for each row execute function public.set_updated_at();

alter table public.moderation_reports enable row level security;
alter table public.moderation_actions enable row level security;

drop policy if exists "moderation_reports_insert_own" on public.moderation_reports;
create policy "moderation_reports_insert_own" on public.moderation_reports
for insert
with check (auth.uid() = reporter_id);

drop policy if exists "moderation_reports_read_own_or_admin" on public.moderation_reports;
create policy "moderation_reports_read_own_or_admin" on public.moderation_reports
for select
using (auth.uid() = reporter_id or public.is_current_user_admin());

drop policy if exists "moderation_reports_admin_update" on public.moderation_reports;
create policy "moderation_reports_admin_update" on public.moderation_reports
for update
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

drop policy if exists "moderation_actions_admin_read" on public.moderation_actions;
create policy "moderation_actions_admin_read" on public.moderation_actions
for select
using (public.is_current_user_admin());

drop policy if exists "moderation_actions_admin_insert" on public.moderation_actions;
create policy "moderation_actions_admin_insert" on public.moderation_actions
for insert
with check (public.is_current_user_admin());

drop policy if exists "posts_read_all" on public.posts;
create policy "posts_read_all" on public.posts
for select using (
  public.is_profile_moderation_active(author_id)
);

drop policy if exists "posts_own_write" on public.posts;
create policy "posts_own_write" on public.posts
for all using (
  auth.uid() = author_id
  and public.is_profile_moderation_active(auth.uid())
) with check (
  auth.uid() = author_id
  and public.is_profile_moderation_active(auth.uid())
);

drop policy if exists "comments_own_write" on public.post_comments;
create policy "comments_own_write" on public.post_comments
for all using (
  auth.uid() = author_id
  and public.is_profile_moderation_active(auth.uid())
) with check (
  auth.uid() = author_id
  and public.is_profile_moderation_active(auth.uid())
);

drop policy if exists "clubs_read_all" on public.clubs;
create policy "clubs_read_all" on public.clubs
for select using (
  public.is_club_moderation_active(id)
);

drop policy if exists "clubs_owner_insert" on public.clubs;
create policy "clubs_owner_insert" on public.clubs
for insert with check (
  auth.uid() = owner_id
  and public.is_profile_moderation_active(auth.uid())
  and coalesce((
    select s.plan
    from public.user_subscriptions s
    where s.user_id = auth.uid()
      and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at >= now())
  ), 'free') = 'premium'
  and (select count(*) from public.clubs existing where existing.owner_id = auth.uid()) < 3
);

drop policy if exists "club_posts_member_insert" on public.club_posts;
create policy "club_posts_member_insert" on public.club_posts
for insert with check (
  auth.uid() = author_id
  and public.is_profile_moderation_active(auth.uid())
  and public.is_club_moderation_active(club_id)
  and exists (
    select 1 from public.club_members cm
    where cm.club_id = club_posts.club_id
      and cm.user_id = auth.uid()
  )
);

create or replace function public.submit_moderation_report(
  target_type text,
  target_id uuid,
  reason_category text,
  details text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_report_id uuid;
  resolved_user_id uuid;
  resolved_club_id uuid;
  resolved_post_id uuid;
  resolved_club_post_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if reason_category not in ('violence', 'harassment', 'spam', 'promotion_without_business', 'other') then
    raise exception 'Invalid moderation reason';
  end if;

  if target_type = 'user' then
    resolved_user_id := target_id;
  elsif target_type = 'club' then
    resolved_club_id := target_id;
  elsif target_type = 'post' then
    resolved_post_id := target_id;
    select author_id into resolved_user_id from public.posts where id = target_id;
  elsif target_type = 'club_post' then
    resolved_club_post_id := target_id;
    select author_id, club_id into resolved_user_id, resolved_club_id from public.club_posts where id = target_id;
  else
    raise exception 'Invalid target type';
  end if;

  if resolved_user_id is null and resolved_club_id is null and resolved_post_id is null and resolved_club_post_id is null then
    raise exception 'Target not found';
  end if;

  insert into public.moderation_reports (
    reporter_id,
    target_type,
    target_user_id,
    target_club_id,
    target_post_id,
    target_club_post_id,
    reason_category,
    details
  )
  values (
    auth.uid(),
    target_type,
    resolved_user_id,
    resolved_club_id,
    resolved_post_id,
    resolved_club_post_id,
    reason_category,
    nullif(trim(details), '')
  )
  returning id into new_report_id;

  return new_report_id;
end;
$$;

create or replace function public.admin_moderation_reports()
returns table (
  id uuid,
  reporter_id uuid,
  reporter_display_name text,
  target_type text,
  target_user_id uuid,
  target_user_display_name text,
  target_club_id uuid,
  target_club_name text,
  reason_category text,
  details text,
  status text,
  resolution_notes text,
  created_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    r.id,
    r.reporter_id,
    coalesce(rp.full_name, rp.username, 'Usuario MotoCare') as reporter_display_name,
    r.target_type,
    r.target_user_id,
    coalesce(tp.full_name, tp.username, 'Usuario MotoCare') as target_user_display_name,
    r.target_club_id,
    c.name as target_club_name,
    r.reason_category,
    r.details,
    r.status,
    r.resolution_notes,
    r.created_at,
    r.reviewed_at
  from public.moderation_reports r
  left join public.profiles rp on rp.id = r.reporter_id
  left join public.profiles tp on tp.id = r.target_user_id
  left join public.clubs c on c.id = r.target_club_id
  order by
    case when r.status = 'pending' then 0 else 1 end,
    r.created_at desc;
end;
$$;

create or replace function public.admin_apply_moderation_action(
  report_id uuid,
  target_type text,
  target_id uuid,
  action_type text,
  reason text,
  duration_days int default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_action_id uuid;
  notify_user_id uuid;
  action_ends_at timestamptz;
  notice_title text;
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access required';
  end if;

  if target_type not in ('user', 'club') then
    raise exception 'Invalid target type for action';
  end if;

  if action_type not in ('warning', 'temp_block', 'delete') then
    raise exception 'Invalid action type';
  end if;

  if action_type = 'temp_block' then
    action_ends_at := now() + make_interval(days => coalesce(duration_days, 7));
  end if;

  if target_type = 'user' then
    notify_user_id := target_id;

    if action_type = 'temp_block' then
      update public.profiles
      set moderation_status = 'suspended',
          moderation_until = action_ends_at,
          moderation_reason = reason
      where id = target_id;
    elsif action_type = 'delete' then
      update public.profiles
      set moderation_status = 'deleted',
          moderation_until = null,
          moderation_reason = reason,
          is_public = false
      where id = target_id;
    end if;
  else
    select owner_id into notify_user_id from public.clubs where id = target_id;

    if action_type = 'temp_block' then
      update public.clubs
      set moderation_status = 'suspended',
          moderation_until = action_ends_at,
          moderation_reason = reason
      where id = target_id;
    elsif action_type = 'delete' then
      update public.clubs
      set moderation_status = 'deleted',
          moderation_until = null,
          moderation_reason = reason
      where id = target_id;
    end if;
  end if;

  insert into public.moderation_actions (
    report_id,
    target_type,
    target_user_id,
    target_club_id,
    action_type,
    reason,
    ends_at,
    created_by
  )
  values (
    report_id,
    target_type,
    case when target_type = 'user' then target_id else null end,
    case when target_type = 'club' then target_id else null end,
    action_type,
    reason,
    action_ends_at,
    auth.uid()
  )
  returning id into new_action_id;

  if report_id is not null then
    update public.moderation_reports
    set status = case when action_type = 'warning' then 'reviewed' else 'actioned' end,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        resolution_notes = reason
    where id = report_id;
  end if;

  notice_title := case
    when action_type = 'warning' then 'Advertencia de convivencia'
    when action_type = 'temp_block' then 'Bloqueo temporal aplicado'
    else 'Cuenta o club eliminado por moderacion'
  end;

  if notify_user_id is not null then
    insert into public.notifications (user_id, type, title, message, scheduled_for)
    values (
      notify_user_id,
      'moderation_notice',
      notice_title,
      reason,
      now()
    );
  end if;

  return new_action_id;
end;
$$;
