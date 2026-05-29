alter table public.routes
add column if not exists start_date date,
add column if not exists end_date date;

alter table public.routes
drop constraint if exists routes_dates_order_check;

alter table public.routes
add constraint routes_dates_order_check
check (start_date is null or end_date is null or end_date >= start_date);

create index if not exists routes_start_date_idx on public.routes(start_date);
