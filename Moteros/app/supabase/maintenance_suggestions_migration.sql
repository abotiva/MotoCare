-- MotoCare maintenance suggestions catalog
-- Run this file once in the Supabase SQL Editor.

create table if not exists public.maintenance_suggestions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null default 'general',
  description text,
  recommended_interval_km int check (recommended_interval_km is null or recommended_interval_km >= 0),
  recommended_interval_days int check (recommended_interval_days is null or recommended_interval_days >= 0),
  applies_to text not null default 'all',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists maintenance_suggestions_set_updated_at on public.maintenance_suggestions;
create trigger maintenance_suggestions_set_updated_at
before update on public.maintenance_suggestions
for each row execute function public.set_updated_at();

alter table public.maintenance_suggestions enable row level security;

drop policy if exists "maintenance_suggestions_read_active" on public.maintenance_suggestions;
create policy "maintenance_suggestions_read_active" on public.maintenance_suggestions
for select using (is_active = true);

create index if not exists maintenance_suggestions_active_order_idx
on public.maintenance_suggestions(is_active, sort_order);

insert into public.maintenance_suggestions (
  code,
  name,
  category,
  description,
  recommended_interval_km,
  recommended_interval_days,
  sort_order
)
values
  ('oil_change', 'Cambio de aceite', 'motor', 'Reemplazo de aceite de motor segun uso y especificacion del fabricante.', 3000, 180, 10),
  ('air_filter', 'Filtro de aire', 'motor', 'Revision o cambio del filtro de aire para mantener buena combustion.', 6000, 365, 20),
  ('brake_pads', 'Pastillas de freno', 'seguridad', 'Inspeccion o cambio de pastillas segun desgaste.', 8000, 365, 30),
  ('chain_kit', 'Kit de arrastre', 'transmision', 'Revision de cadena, sprockets y tension; cambio segun desgaste.', 10000, 365, 40),
  ('tires', 'Llantas', 'seguridad', 'Revision de labrado, presion y estado general de las llantas.', 12000, 365, 50),
  ('general_review', 'Revision general', 'general', 'Chequeo preventivo de niveles, luces, frenos, suspension y tornilleria.', 5000, 180, 60)
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  recommended_interval_km = excluded.recommended_interval_km,
  recommended_interval_days = excluded.recommended_interval_days,
  sort_order = excluded.sort_order,
  is_active = true;
