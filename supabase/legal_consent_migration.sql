-- Infraestructura legal versionada de MotoCare.
-- Las versiones 0.1-borrador se registran para pruebas y trazabilidad,
-- pero no activan reaceptación hasta que una versión sea publicada.

create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  document_type text not null check (document_type in ('terms', 'privacy')),
  title text not null,
  version text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  effective_at timestamptz,
  requires_reacceptance boolean not null default true,
  content_hash text,
  created_at timestamptz not null default now(),
  unique (document_type, version)
);

create unique index if not exists legal_documents_one_published_per_type
on public.legal_documents(document_type) where status = 'published';

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.legal_documents(id) on delete restrict,
  accepted_at timestamptz not null default now(),
  source text not null check (source in ('signup', 'reauthentication')),
  unique (user_id, document_id)
);

insert into public.legal_documents (id, document_type, title, version, status, requires_reacceptance)
values
  ('10000000-0000-4000-8000-000000000001', 'terms', 'Términos y Condiciones', '0.1-borrador', 'draft', true),
  ('10000000-0000-4000-8000-000000000002', 'privacy', 'Política de Privacidad', '0.1-borrador', 'draft', true)
on conflict (document_type, version) do update set title = excluded.title;

alter table public.legal_documents enable row level security;
alter table public.legal_acceptances enable row level security;

drop policy if exists "legal_documents_read_published" on public.legal_documents;
create policy "legal_documents_read_published" on public.legal_documents
for select using (status = 'published');

drop policy if exists "legal_acceptances_read_own" on public.legal_acceptances;
create policy "legal_acceptances_read_own" on public.legal_acceptances
for select using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]+', '_', 'g'))
  )
  on conflict (id) do nothing;

  insert into public.legal_acceptances (user_id, document_id, source)
  select new.id, d.id, 'signup'
  from public.legal_documents d
  where
    (d.document_type = 'terms'
      and new.raw_user_meta_data->>'terms_accepted' = 'true'
      and d.version = new.raw_user_meta_data->>'terms_version')
    or
    (d.document_type = 'privacy'
      and new.raw_user_meta_data->>'privacy_accepted' = 'true'
      and d.version = new.raw_user_meta_data->>'privacy_version')
  on conflict (user_id, document_id) do nothing;

  return new;
end;
$$;

create or replace function public.get_pending_legal_documents()
returns table (id uuid, document_type text, title text, version text)
language sql
security definer
set search_path = public
as $$
  select d.id, d.document_type, d.title, d.version
  from public.legal_documents d
  where d.status = 'published'
    and d.requires_reacceptance = true
    and not exists (
      select 1 from public.legal_acceptances a
      where a.user_id = auth.uid() and a.document_id = d.id
    )
  order by d.document_type;
$$;

create or replace function public.accept_legal_document(target_document_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not exists (select 1 from public.legal_documents where id = target_document_id and status = 'published') then
    raise exception 'legal document is not published';
  end if;
  insert into public.legal_acceptances (user_id, document_id, source)
  values (auth.uid(), target_document_id, 'reauthentication')
  on conflict (user_id, document_id) do nothing;
end;
$$;

grant execute on function public.get_pending_legal_documents() to authenticated;
grant execute on function public.accept_legal_document(uuid) to authenticated;

create table if not exists public.account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.account_deletion_requests enable row level security;
drop policy if exists "account_deletion_requests_read_own" on public.account_deletion_requests;
create policy "account_deletion_requests_read_own" on public.account_deletion_requests
for select using (auth.uid() = user_id);

create or replace function public.request_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  insert into public.account_deletion_requests (user_id, status, requested_at, completed_at)
  values (auth.uid(), 'pending', now(), null)
  on conflict (user_id) do update set status = 'pending', requested_at = now(), completed_at = null;
end;
$$;

grant execute on function public.request_account_deletion() to authenticated;

