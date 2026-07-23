-- Make marketplace notifications actionable and traceable to their message.
-- Run after marketplace_sales_contact_migration.sql.

alter table public.notifications
add column if not exists marketplace_message_id uuid;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'notifications'
      and constraint_name = 'notifications_marketplace_message_id_fkey'
  ) then
    alter table public.notifications
    add constraint notifications_marketplace_message_id_fkey
    foreign key (marketplace_message_id)
    references public.marketplace_messages(id)
    on delete cascade;
  end if;
end;
$$;

create index if not exists notifications_marketplace_message_id_idx
  on public.notifications(marketplace_message_id);

create or replace function public.notify_marketplace_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_title text;
  sender_name text;
  message_preview text;
begin
  select title into listing_title
  from public.marketplace_listings
  where id = new.listing_id;

  select coalesce(full_name, username, 'Usuario MotoCare') into sender_name
  from public.profiles
  where id = new.sender_id;

  message_preview := left(regexp_replace(trim(new.body), '\s+', ' ', 'g'), 140);

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    marketplace_message_id,
    scheduled_for
  )
  values (
    new.recipient_id,
    'marketplace_message',
    sender_name || ' preguntó por "' || listing_title || '"',
    message_preview,
    new.id,
    now()
  );

  return new;
end;
$$;
