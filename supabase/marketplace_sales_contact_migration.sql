-- Marketplace sales lifecycle and private buyer/seller contact.
-- Run after marketplace_migration.sql and schema.sql.

alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check
check (type in (
  'route_planned',
  'route_overdue',
  'club_invite',
  'moderation_notice',
  'admin_review',
  'marketplace_message'
));

create table if not exists public.marketplace_messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists marketplace_messages_participants_idx
  on public.marketplace_messages(listing_id, created_at desc);
create index if not exists marketplace_messages_recipient_unread_idx
  on public.marketplace_messages(recipient_id, created_at desc)
  where read_at is null;

alter table public.marketplace_messages enable row level security;

drop policy if exists "marketplace_messages_read_participants" on public.marketplace_messages;
create policy "marketplace_messages_read_participants"
on public.marketplace_messages for select to authenticated
using (sender_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists "marketplace_messages_send_participants" on public.marketplace_messages;
create policy "marketplace_messages_send_participants"
on public.marketplace_messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.marketplace_listings listing
    where listing.id = listing_id
      and (
        (
          listing.status = 'active'
          and recipient_id = listing.seller_id
          and sender_id <> listing.seller_id
        )
        or (
          exists (
            select 1
            from public.marketplace_messages previous_message
            where previous_message.listing_id = listing.id
              and (
                (
                  previous_message.sender_id = recipient_id
                  and previous_message.recipient_id = sender_id
                )
                or (
                  previous_message.sender_id = sender_id
                  and previous_message.recipient_id = recipient_id
                )
              )
          )
        )
      )
  )
);

drop policy if exists "marketplace_messages_mark_received_read" on public.marketplace_messages;
create policy "marketplace_messages_mark_received_read"
on public.marketplace_messages for update to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

revoke update on public.marketplace_messages from authenticated;
grant select, insert on public.marketplace_messages to authenticated;
grant update (read_at) on public.marketplace_messages to authenticated;

create or replace function public.mark_marketplace_listing_sold(target_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.marketplace_listings
  set status = 'sold',
      sold_at = now(),
      updated_at = now()
  where id = target_listing_id
    and seller_id = auth.uid()
    and status = 'active';

  if not found then
    raise exception 'Only the owner can mark an active listing as sold';
  end if;
end;
$$;

create or replace function public.notify_marketplace_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_title text;
  sender_name text;
begin
  select title into listing_title
  from public.marketplace_listings
  where id = new.listing_id;

  select coalesce(full_name, username, 'Usuario MotoCare') into sender_name
  from public.profiles
  where id = new.sender_id;

  insert into public.notifications (user_id, type, title, message, scheduled_for)
  values (
    new.recipient_id,
    'marketplace_message',
    'Nuevo mensaje en la tienda',
    sender_name || ' escribió por "' || listing_title || '".',
    now()
  );

  return new;
end;
$$;

drop trigger if exists notify_marketplace_message on public.marketplace_messages;
create trigger notify_marketplace_message
after insert on public.marketplace_messages
for each row execute function public.notify_marketplace_message();

revoke all on function public.mark_marketplace_listing_sold(uuid) from public;
grant execute on function public.mark_marketplace_listing_sold(uuid) to authenticated;
