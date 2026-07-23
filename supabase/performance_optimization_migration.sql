-- Performance helpers for community and admin queues.

create or replace function public.post_interaction_summaries(target_post_ids uuid[])
returns table (
  post_id uuid,
  likes_count bigint,
  liked_by_me boolean,
  comments_count bigint,
  recent_comments jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    (select count(*) from public.post_likes l where l.post_id = p.id) as likes_count,
    exists (
      select 1 from public.post_likes l
      where l.post_id = p.id and l.user_id = auth.uid()
    ) as liked_by_me,
    (select count(*) from public.post_comments c where c.post_id = p.id) as comments_count,
    coalesce((
      select jsonb_agg(row_data order by (row_data->>'created_at')::timestamptz)
      from (
        select jsonb_build_object(
          'id', c.id,
          'post_id', c.post_id,
          'author_id', c.author_id,
          'content', c.content,
          'created_at', c.created_at,
          'profiles', jsonb_build_object(
            'full_name', pr.full_name,
            'username', pr.username,
            'avatar_url', pr.avatar_url
          )
        ) as row_data
        from public.post_comments c
        left join public.profiles pr on pr.id = c.author_id
        where c.post_id = p.id
        order by c.created_at desc
        limit 3
      ) recent
    ), '[]'::jsonb) as recent_comments
  from public.posts p
  where p.id = any(target_post_ids);
$$;

grant execute on function public.post_interaction_summaries(uuid[]) to authenticated;

create or replace function public.admin_marketplace_listings_page(
  page_limit integer default 40,
  page_offset integer default 0,
  pending_only boolean default false
)
returns table (
  id uuid,
  seller_id uuid,
  seller_name text,
  seller_type text,
  seller_plan text,
  category text,
  title text,
  description text,
  price numeric,
  currency text,
  condition text,
  mileage_km integer,
  city text,
  department text,
  status text,
  moderation_notes text,
  submitted_at timestamptz,
  images jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.seller_id,
    coalesce(p.full_name, p.username, 'Usuario MotoCare'),
    l.seller_type,
    public.marketplace_effective_plan(l.seller_id),
    l.category,
    l.title,
    l.description,
    l.price,
    l.currency,
    l.condition,
    l.mileage_km,
    l.city,
    l.department,
    l.status,
    l.moderation_notes,
    coalesce(l.updated_at, l.created_at),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'image_url', i.image_url,
        'sort_order', i.sort_order
      ) order by i.sort_order)
      from public.marketplace_listing_images i
      where i.listing_id = l.id
    ), '[]'::jsonb)
  from public.marketplace_listings l
  left join public.profiles p on p.id = l.seller_id
  where not pending_only or l.status = 'pending_review'
  order by
    case l.status when 'pending_review' then 0 else 1 end,
    coalesce(l.updated_at, l.created_at) desc
  limit least(greatest(page_limit, 1), 100)
  offset greatest(page_offset, 0);
$$;

grant execute on function public.admin_marketplace_listings_page(integer, integer, boolean) to authenticated;

create index if not exists post_likes_post_user_idx
  on public.post_likes(post_id, user_id);
create index if not exists post_comments_post_created_idx
  on public.post_comments(post_id, created_at desc);
