alter table public.routes
add column if not exists status text not null default 'planned'
check (status in ('planned', 'in_progress', 'completed'));

update public.routes
set status = 'planned'
where status is null;
