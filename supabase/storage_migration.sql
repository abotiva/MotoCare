-- MotoCare Storage migration
-- Run this after the initial schema if your database was already created.

create table if not exists public.motorcycle_documents (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null check (document_type in ('soat', 'technical_review', 'other')),
  file_name text not null,
  file_path text not null,
  mime_type text,
  created_at timestamptz not null default now()
);

alter table public.motorcycle_documents enable row level security;

drop policy if exists "motorcycle_documents_own_all" on public.motorcycle_documents;
create policy "motorcycle_documents_own_all" on public.motorcycle_documents
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index if not exists motorcycle_documents_motorcycle_id_idx on public.motorcycle_documents(motorcycle_id);

insert into storage.buckets (id, name, public)
values
  ('motocare-public', 'motocare-public', true),
  ('motocare-documents', 'motocare-documents', false)
on conflict (id) do nothing;

drop policy if exists "public_assets_read_all" on storage.objects;
create policy "public_assets_read_all" on storage.objects
for select using (bucket_id = 'motocare-public');

drop policy if exists "public_assets_own_insert" on storage.objects;
create policy "public_assets_own_insert" on storage.objects
for insert with check (
  bucket_id = 'motocare-public'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "public_assets_own_update" on storage.objects;
create policy "public_assets_own_update" on storage.objects
for update using (
  bucket_id = 'motocare-public'
  and auth.uid()::text = (storage.foldername(name))[1]
) with check (
  bucket_id = 'motocare-public'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "documents_own_select" on storage.objects;
create policy "documents_own_select" on storage.objects
for select using (
  bucket_id = 'motocare-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "documents_own_insert" on storage.objects;
create policy "documents_own_insert" on storage.objects
for insert with check (
  bucket_id = 'motocare-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "documents_own_update" on storage.objects;
create policy "documents_own_update" on storage.objects
for update using (
  bucket_id = 'motocare-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
) with check (
  bucket_id = 'motocare-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "documents_own_delete" on storage.objects;
create policy "documents_own_delete" on storage.objects
for delete using (
  bucket_id = 'motocare-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);
