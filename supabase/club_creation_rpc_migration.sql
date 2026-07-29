-- Atomic club creation with server-side license and ownership validation.
-- Run this once in Supabase SQL Editor after business_club_limits_migration.sql.

create or replace function public.create_club(
  club_name text,
  club_city text default null,
  club_description text default null
)
returns public.clubs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  current_plan text;
  created_club public.clubs;
begin
  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Debes iniciar sesión para crear un club.';
  end if;

  if nullif(btrim(club_name), '') is null then
    raise exception using
      errcode = '22023',
      message = 'El club necesita un nombre.';
  end if;

  select s.plan
  into current_plan
  from public.user_subscriptions s
  where s.user_id = current_user_id
    and s.status in ('active', 'trialing')
    and (s.expires_at is null or s.expires_at >= now());

  if coalesce(current_plan, 'free') <> 'premium' then
    raise exception using
      errcode = '42501',
      message = 'Se requiere una licencia Premium activa para crear clubes.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('club:' || current_user_id::text, 0));

  if (select count(*) from public.clubs c where c.owner_id = current_user_id) >= 3 then
    raise exception using
      errcode = '23514',
      message = 'La licencia Premium permite crear hasta 3 clubes.';
  end if;

  insert into public.clubs (owner_id, name, city, description)
  values (
    current_user_id,
    btrim(club_name),
    nullif(btrim(club_city), ''),
    nullif(btrim(club_description), '')
  )
  returning * into created_club;

  insert into public.club_members (club_id, user_id, role)
  values (created_club.id, current_user_id, 'owner');

  return created_club;
end;
$$;

revoke all on function public.create_club(text, text, text) from public;
grant execute on function public.create_club(text, text, text) to authenticated;
