create or replace function public.enforce_motorcycle_license_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_plan text;
  motorcycle_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 0));

  select coalesce((
    select s.plan
    from public.user_subscriptions s
    where s.user_id = new.owner_id
      and s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at >= now())
  ), 'free')
  into current_plan;

  if current_plan = 'business' then
    raise exception using
      errcode = 'P0001',
      message = 'La licencia Business no permite registrar motos.';
  end if;

  if current_plan = 'free' then
    select count(*) into motorcycle_count
    from public.motorcycles
    where owner_id = new.owner_id;

    if motorcycle_count >= 1 then
      raise exception using
        errcode = 'P0001',
        message = 'Tu plan Free incluye una moto. Con Premium puedes administrar varias.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists motorcycles_enforce_license_rules on public.motorcycles;
create trigger motorcycles_enforce_license_rules
before insert on public.motorcycles
for each row execute function public.enforce_motorcycle_license_rules();
