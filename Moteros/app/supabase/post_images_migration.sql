create table if not exists public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.post_images enable row level security;

drop policy if exists "post_images_read_all" on public.post_images;
create policy "post_images_read_all" on public.post_images
for select using (true);

drop policy if exists "post_images_own_write" on public.post_images;
create policy "post_images_own_write" on public.post_images
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index if not exists post_images_post_id_idx on public.post_images(post_id, sort_order);
