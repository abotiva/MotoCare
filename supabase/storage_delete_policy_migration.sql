-- MotoCare Storage delete policy
-- Run this once in Supabase SQL Editor if documents were enabled before delete support.

drop policy if exists "documents_own_delete" on storage.objects;
create policy "documents_own_delete" on storage.objects
for delete using (
  bucket_id = 'motocare-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);
