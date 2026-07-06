alter table public.routes
add column if not exists motorcycle_id uuid references public.motorcycles(id) on delete set null;

create index if not exists routes_motorcycle_id_idx on public.routes(motorcycle_id);

drop policy if exists "routes_own_write" on public.routes;
create policy "routes_own_write" on public.routes
for all using (auth.uid() = owner_id)
with check (
  auth.uid() = owner_id
  and (
    motorcycle_id is null
    or exists (
      select 1
      from public.motorcycles m
      where m.id = routes.motorcycle_id
        and m.owner_id = auth.uid()
    )
  )
);
