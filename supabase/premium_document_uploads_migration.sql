-- Document storage consumes quota, so new uploads are limited to active Premium users.
drop policy if exists "motorcycle_documents_own_all" on public.motorcycle_documents;
create policy "motorcycle_documents_own_read" on public.motorcycle_documents
for select using (auth.uid() = owner_id);
create policy "motorcycle_documents_own_delete" on public.motorcycle_documents
for delete using (auth.uid() = owner_id);
create policy "motorcycle_documents_premium_insert" on public.motorcycle_documents
for insert with check (
  auth.uid() = owner_id and exists (
    select 1 from public.user_subscriptions s
    where s.user_id = auth.uid() and s.status in ('active', 'trialing') and s.plan in ('pro', 'premium')
  )
);

drop policy if exists "documents_own_insert" on storage.objects;
create policy "documents_premium_insert" on storage.objects
for insert with check (
  bucket_id = 'motocare-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
  and exists (
    select 1 from public.user_subscriptions s
    where s.user_id = auth.uid() and s.status in ('active', 'trialing') and s.plan in ('pro', 'premium')
  )
);
