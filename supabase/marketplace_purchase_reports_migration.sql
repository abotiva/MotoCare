-- Records confirmed marketplace purchases for Premium expense reports.

create table if not exists public.marketplace_purchases (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references public.marketplace_listings(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  title text not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'COP',
  purchased_at timestamptz not null default now()
);

alter table public.marketplace_purchases enable row level security;

drop policy if exists "marketplace_purchases_read_participants" on public.marketplace_purchases;
create policy "marketplace_purchases_read_participants" on public.marketplace_purchases
for select using (buyer_id = auth.uid() or seller_id = auth.uid());

create or replace function public.mark_marketplace_listing_sold(
  target_listing_id uuid,
  target_buyer_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  sold_listing public.marketplace_listings;
begin
  update public.marketplace_listings
  set status = 'sold',
      sold_at = now(),
      updated_at = now()
  where id = target_listing_id
    and seller_id = auth.uid()
    and status = 'active'
  returning * into sold_listing;

  if sold_listing.id is null then
    raise exception 'Solo el vendedor puede cerrar una publicación activa.';
  end if;

  if target_buyer_id is not null then
    if target_buyer_id = auth.uid() then
      raise exception 'El vendedor no puede registrarse como comprador.';
    end if;
    if not exists (
      select 1 from public.marketplace_messages m
      where m.listing_id = target_listing_id
        and (m.sender_id = target_buyer_id or m.recipient_id = target_buyer_id)
        and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
    ) then
      raise exception 'El comprador debe tener una conversación asociada a la publicación.';
    end if;

    insert into public.marketplace_purchases (
      listing_id, buyer_id, seller_id, category, title, amount, currency, purchased_at
    )
    values (
      sold_listing.id,
      target_buyer_id,
      sold_listing.seller_id,
      sold_listing.category,
      sold_listing.title,
      sold_listing.price,
      sold_listing.currency,
      coalesce(sold_listing.sold_at, now())
    )
    on conflict (listing_id) do nothing;
  end if;
end;
$$;

revoke all on function public.mark_marketplace_listing_sold(uuid, uuid) from public;
grant execute on function public.mark_marketplace_listing_sold(uuid, uuid) to authenticated;

create index if not exists marketplace_purchases_buyer_date_idx
on public.marketplace_purchases(buyer_id, purchased_at desc);
