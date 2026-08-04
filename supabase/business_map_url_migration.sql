-- Let Business accounts share a location from a supported map provider.
alter table public.profiles
add column if not exists business_map_url text;

alter table public.profiles
drop constraint if exists profiles_business_map_url_check;

alter table public.profiles
add constraint profiles_business_map_url_check check (
  business_map_url is null
  or business_map_url ~* '^https?://([^/]+\.)?(google\.com|goo\.gl|waze\.com|openstreetmap\.org)(/|$)'
);
